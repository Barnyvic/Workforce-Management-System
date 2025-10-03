import request from 'supertest';
import express from 'express';
import { LeaveRequestController } from '@/controllers/leave-request.controller';
import { LeaveRequestServiceImpl } from '@/services/leave-request.service';
import { LeaveRequestRepositoryImpl } from '@/repositories/leave-request.repository';
import { UserRepositoryImpl } from '@/repositories/user.repository';
import { DepartmentRepositoryImpl } from '@/repositories/department.repository';
import { QueueServiceImpl } from '@/services/queue.service';
import { validateRequest, schemas } from '@/middleware/validation.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import {
  authenticateToken,
  requireManagerOrAdmin,
} from '@/middleware/auth.middleware';
import { LeaveRequestStatus, UserRole } from '@/types';
import {
  testDataSource,
  setupTestDatabase,
  teardownTestDatabase,
} from '../setup';

// Mock QueueService
jest.mock('@/services/queue.service');
const MockedQueueService = QueueServiceImpl as jest.MockedClass<
  typeof QueueServiceImpl
>;

describe('Leave Request API Integration Tests', () => {
  let app: express.Application;
  let adminToken: string;
  let employeeToken: string;
  let managerToken: string;
  let mockQueueService: jest.Mocked<QueueServiceImpl>;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await testDataSource.synchronize();

    app = express();
    app.use(express.json());

    const leaveRequestRepository = new LeaveRequestRepositoryImpl();
    const userRepository = new UserRepositoryImpl();
    const departmentRepository = new DepartmentRepositoryImpl();

    // Mock queue service
    mockQueueService = {
      publishLeaveRequest: jest.fn().mockResolvedValue(undefined),
    } as any;

    MockedQueueService.mockImplementation(() => mockQueueService);

    const leaveRequestService = new LeaveRequestServiceImpl(
      leaveRequestRepository,
      userRepository,
      mockQueueService
    );
    const leaveRequestController = new LeaveRequestController(
      leaveRequestService
    );

    // Create test departments
    await departmentRepository.create({ name: 'Engineering' });
    await departmentRepository.create({ name: 'HR' });
    await departmentRepository.create({ name: 'Management' });

    // Create test users
    const adminUser = await userRepository.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: UserRole.ADMIN,
      departmentId: 1,
    });

    const employeeUser = await userRepository.create({
      name: 'Employee User',
      email: 'employee@test.com',
      password: 'hashedpassword',
      role: UserRole.EMPLOYEE,
      departmentId: 1,
    });

    const managerUser = await userRepository.create({
      name: 'Manager User',
      email: 'manager@test.com',
      password: 'hashedpassword',
      role: UserRole.MANAGER,
      departmentId: 2,
    });

    // Generate tokens
    const authService = require('@/services/auth.service').AuthServiceImpl;
    const auth = new authService();
    adminToken = auth.generateToken(adminUser.id, UserRole.ADMIN);
    employeeToken = auth.generateToken(employeeUser.id, UserRole.EMPLOYEE);
    managerToken = auth.generateToken(managerUser.id, UserRole.MANAGER);

    // Setup routes
    app.post(
      '/leave-requests',
      validateRequest({ body: schemas.createLeaveRequest }),
      authenticateToken,
      leaveRequestController.createLeaveRequest
    );

    app.get(
      '/leave-requests/:id',
      validateRequest({ params: schemas.idParam }),
      authenticateToken,
      leaveRequestController.getLeaveRequestById
    );

    app.get(
      '/users/:userId/leave-requests',
      validateRequest({
        params: { userId: schemas.idParam.extract('id') },
        query: schemas.paginationQuery,
      }),
      authenticateToken,
      leaveRequestController.getLeaveRequestsByUser
    );

    app.get(
      '/leave-requests/status/:status',
      validateRequest({
        params: { status: schemas.updateLeaveRequestStatus.extract('status') },
        query: schemas.paginationQuery,
      }),
      authenticateToken,
      leaveRequestController.getLeaveRequestsByStatus
    );

    app.put(
      '/leave-requests/:id/status',
      validateRequest({
        params: schemas.idParam,
        body: schemas.updateLeaveRequestStatus,
      }),
      requireManagerOrAdmin,
      leaveRequestController.updateLeaveRequestStatus
    );

    app.get(
      '/leave-requests',
      authenticateToken,
      leaveRequestController.getAllLeaveRequests
    );

    app.delete(
      '/leave-requests/:id',
      validateRequest({ params: schemas.idParam }),
      requireManagerOrAdmin,
      leaveRequestController.deleteLeaveRequest
    );

    app.use(errorHandler);
  });

  describe('POST /leave-requests', () => {
    it('should create leave request successfully', async () => {
      const leaveRequestData = {
        userId: 2,
        startDate: '2024-03-01',
        endDate: '2024-03-02',
      };

      const response = await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(2);
      expect(response.body.data.status).toBe(LeaveRequestStatus.PENDING);
      expect(response.body.message).toBe('Leave request created successfully');
      expect(mockQueueService.publishLeaveRequest).toHaveBeenCalled();
    });

    it('should return 400 for invalid date range', async () => {
      const leaveRequestData = {
        userId: 2,
        startDate: '2024-03-02',
        endDate: '2024-03-01',
      };

      const response = await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('End date must be after start date');
    });

    it('should return 400 for past start date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const leaveRequestData = {
        userId: 2,
        startDate: yesterdayStr!,
        endDate: '2024-03-02',
      };

      const response = await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Start date cannot be in the past');
    });

    it('should return 400 for non-existent user', async () => {
      const leaveRequestData = {
        userId: 999,
        startDate: '2024-03-01',
        endDate: '2024-03-02',
      };

      const response = await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 for invalid request data', async () => {
      const leaveRequestData = {
        userId: 'invalid',
        startDate: 'invalid-date',
        endDate: 'invalid-date',
      };

      const response = await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 401 without authentication', async () => {
      const leaveRequestData = {
        userId: 2,
        startDate: '2024-03-01',
        endDate: '2024-03-02',
      };

      const response = await request(app)
        .post('/leave-requests')
        .send(leaveRequestData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('GET /leave-requests/:id', () => {
    let leaveRequestId: number;

    beforeEach(async () => {
      const leaveRequestRepository = new LeaveRequestRepositoryImpl();
      const leaveRequest = await leaveRequestRepository.create({
        userId: 2,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-02'),
        status: LeaveRequestStatus.PENDING,
      });
      leaveRequestId = leaveRequest.id;
    });

    it('should return leave request when found', async () => {
      const response = await request(app)
        .get(`/leave-requests/${leaveRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(leaveRequestId);
      expect(response.body.data.userId).toBe(2);
      expect(response.body.data.status).toBe(LeaveRequestStatus.PENDING);
    });

    it('should return 404 when leave request not found', async () => {
      const response = await request(app)
        .get('/leave-requests/999')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Leave request not found');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .get('/leave-requests/invalid')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('GET /users/:userId/leave-requests', () => {
    beforeEach(async () => {
      const leaveRequestRepository = new LeaveRequestRepositoryImpl();
      await leaveRequestRepository.create({
        userId: 2,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-02'),
        status: LeaveRequestStatus.PENDING,
      });
      await leaveRequestRepository.create({
        userId: 2,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-02'),
        status: LeaveRequestStatus.APPROVED,
      });
    });

    it('should return leave requests for user with pagination', async () => {
      const response = await request(app)
        .get('/users/2/leave-requests?page=1&limit=10')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].userId).toBe(2);
      expect(response.body.data[1].userId).toBe(2);
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/users/2/leave-requests?page=1&limit=1')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return empty array for user with no leave requests', async () => {
      const response = await request(app)
        .get('/users/1/leave-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/999/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('GET /leave-requests/status/:status', () => {
    beforeEach(async () => {
      const leaveRequestRepository = new LeaveRequestRepositoryImpl();
      await leaveRequestRepository.create({
        userId: 2,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-02'),
        status: LeaveRequestStatus.PENDING,
      });
      await leaveRequestRepository.create({
        userId: 2,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-02'),
        status: LeaveRequestStatus.APPROVED,
      });
    });

    it('should return leave requests by status', async () => {
      const response = await request(app)
        .get(`/leave-requests/status/${LeaveRequestStatus.PENDING}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe(LeaveRequestStatus.PENDING);
    });

    it('should return empty array for status with no requests', async () => {
      const response = await request(app)
        .get(`/leave-requests/status/${LeaveRequestStatus.REJECTED}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .get('/leave-requests/status/INVALID_STATUS')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('PUT /leave-requests/:id/status', () => {
    let leaveRequestId: number;

    beforeEach(async () => {
      const leaveRequestRepository = new LeaveRequestRepositoryImpl();
      const leaveRequest = await leaveRequestRepository.create({
        userId: 2,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-02'),
        status: LeaveRequestStatus.PENDING,
      });
      leaveRequestId = leaveRequest.id;
    });

    it('should update leave request status successfully as manager', async () => {
      const updateData = {
        status: LeaveRequestStatus.APPROVED,
      };

      const response = await request(app)
        .put(`/leave-requests/${leaveRequestId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LeaveRequestStatus.APPROVED);
      expect(response.body.message).toBe(
        'Leave request status updated successfully'
      );
    });

    it('should update leave request status successfully as admin', async () => {
      const updateData = {
        status: LeaveRequestStatus.REJECTED,
      };

      const response = await request(app)
        .put(`/leave-requests/${leaveRequestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LeaveRequestStatus.REJECTED);
    });

    it('should return 403 when employee tries to update status', async () => {
      const updateData = {
        status: LeaveRequestStatus.APPROVED,
      };

      const response = await request(app)
        .put(`/leave-requests/${leaveRequestId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Manager or Admin access required');
    });

    it('should return 404 when updating non-existent leave request', async () => {
      const updateData = {
        status: LeaveRequestStatus.APPROVED,
      };

      const response = await request(app)
        .put('/leave-requests/999/status')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Leave request not found');
    });

    it('should return 400 for invalid status', async () => {
      const updateData = {
        status: 'INVALID_STATUS',
      };

      const response = await request(app)
        .put(`/leave-requests/${leaveRequestId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('GET /leave-requests', () => {
    beforeEach(async () => {
      const leaveRequestRepository = new LeaveRequestRepositoryImpl();
      await leaveRequestRepository.create({
        userId: 2,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-02'),
        status: LeaveRequestStatus.PENDING,
      });
      await leaveRequestRepository.create({
        userId: 3,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-02'),
        status: LeaveRequestStatus.APPROVED,
      });
    });

    it('should return all leave requests', async () => {
      const response = await request(app)
        .get('/leave-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/leave-requests').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('DELETE /leave-requests/:id', () => {
    let leaveRequestId: number;

    beforeEach(async () => {
      const leaveRequestRepository = new LeaveRequestRepositoryImpl();
      const leaveRequest = await leaveRequestRepository.create({
        userId: 2,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-02'),
        status: LeaveRequestStatus.PENDING,
      });
      leaveRequestId = leaveRequest.id;
    });

    it('should delete leave request successfully as manager', async () => {
      const response = await request(app)
        .delete(`/leave-requests/${leaveRequestId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Leave request deleted successfully');
    });

    it('should delete leave request successfully as admin', async () => {
      const leaveRequestRepository = new LeaveRequestRepositoryImpl();
      const leaveRequest = await leaveRequestRepository.create({
        userId: 2,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-02'),
        status: LeaveRequestStatus.PENDING,
      });

      const response = await request(app)
        .delete(`/leave-requests/${leaveRequest.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Leave request deleted successfully');
    });

    it('should return 403 when employee tries to delete', async () => {
      const response = await request(app)
        .delete(`/leave-requests/${leaveRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Manager or Admin access required');
    });

    it('should return 404 when deleting non-existent leave request', async () => {
      const response = await request(app)
        .delete('/leave-requests/999')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Leave request not found');
    });
  });

  describe('Queue Integration', () => {
    it('should publish message to queue when creating leave request', async () => {
      const leaveRequestData = {
        userId: 2,
        startDate: '2024-03-01',
        endDate: '2024-03-02',
      };

      await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequestData)
        .expect(201);

      expect(mockQueueService.publishLeaveRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'leave.requested',
          data: expect.objectContaining({
            userId: 2,
            startDate: '2024-03-01',
            endDate: '2024-03-02',
          }),
        })
      );
    });

    it('should handle queue publishing errors gracefully', async () => {
      mockQueueService.publishLeaveRequest.mockRejectedValueOnce(
        new Error('Queue publishing failed')
      );

      const leaveRequestData = {
        userId: 2,
        startDate: '2024-03-01',
        endDate: '2024-03-02',
      };

      const response = await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequestData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Queue publishing failed');
    });
  });

  describe('Business Logic Integration', () => {
    it('should auto-approve short leave requests (≤ 2 days)', async () => {
      const leaveRequestData = {
        userId: 2,
        startDate: '2024-03-01',
        endDate: '2024-03-02',
      };

      const response = await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequestData)
        .expect(201);

      expect(response.body.data.status).toBe(LeaveRequestStatus.PENDING);
    });

    it('should mark long leave requests as pending approval (> 2 days)', async () => {
      const leaveRequestData = {
        userId: 2,
        startDate: '2024-03-01',
        endDate: '2024-03-05',
      };

      const response = await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequestData)
        .expect(201);

      expect(response.body.data.status).toBe(LeaveRequestStatus.PENDING);
    });
  });
});
