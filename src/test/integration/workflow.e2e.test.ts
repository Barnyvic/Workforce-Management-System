import request from 'supertest';
import express from 'express';
import Joi from 'joi';
import { DepartmentController } from '@/controllers/department.controller';
import { UserController } from '@/controllers/user.controller';
import { LeaveRequestController } from '@/controllers/leave-request.controller';
import { HealthController } from '@/controllers/health.controller';
import { ServiceContainer } from '@/container/service-container';
import { QueueServiceImpl } from '@/services/queue.service';
import { validateRequest, schemas } from '@/middleware/validation.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import {
  authenticateToken,
  requireAdmin,
  requireManagerOrAdmin,
} from '@/middleware/auth.middleware';
import { LeaveRequestStatus, UserRole } from '@/types';
import {
  testDataSource,
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
  MockCacheService,
} from '../setup';

// Mock QueueService
jest.mock('@/services/queue.service');
const MockedQueueService = QueueServiceImpl as jest.MockedClass<
  typeof QueueServiceImpl
>;

// Helper function to generate future dates
const getFutureDate = (daysFromNow: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

const getFutureDateString = (daysFromNow: number): string => {
  return getFutureDate(daysFromNow).toISOString().split('T')[0]!;
};

describe('End-to-End Workflow Integration Tests', () => {
  let app: express.Application;
  let serviceContainer: ServiceContainer;
  let adminToken: string;
  let managerToken: string;
  let employeeToken: string;
  let mockQueueService: jest.Mocked<QueueServiceImpl>;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Reset and configure service container for tests
    ServiceContainer.reset();
    serviceContainer = ServiceContainer.getInstance(testDataSource);

    // Use mock cache service to avoid Redis connection issues
    const mockCacheService = new MockCacheService();
    serviceContainer.setCacheService(mockCacheService);

    app = express();
    app.use(express.json());

    // Mock queue service
    mockQueueService = {
      publishLeaveRequest: jest.fn().mockResolvedValue(undefined),
    } as any;
    MockedQueueService.mockImplementation(() => mockQueueService);

    // Initialize controllers
    const departmentController = new DepartmentController(
      serviceContainer.cacheService,
      serviceContainer.departmentService
    );
    const userController = new UserController(
      serviceContainer.cacheService,
      serviceContainer.userService
    );
    const leaveRequestController = new LeaveRequestController(
      serviceContainer.leaveRequestService
    );
    const healthController = new HealthController(
      serviceContainer.cacheService,
      mockQueueService
    );

    // Create test data
    const engineeringDept = await serviceContainer.departmentRepository.create({
      name: 'Engineering',
    });

    const adminUser = await serviceContainer.userRepository.create({
      name: 'System Admin',
      email: 'admin@company.com',
      password: await serviceContainer.authService.hashPassword('admin123'),
      role: UserRole.ADMIN,
      departmentId: engineeringDept.id,
    });

    const managerUser = await serviceContainer.userRepository.create({
      name: 'Engineering Manager',
      email: 'manager@company.com',
      password: await serviceContainer.authService.hashPassword('manager123'),
      role: UserRole.MANAGER,
      departmentId: engineeringDept.id,
    });

    const employeeUser = await serviceContainer.userRepository.create({
      name: 'John Developer',
      email: 'john@company.com',
      password: await serviceContainer.authService.hashPassword('employee123'),
      role: UserRole.EMPLOYEE,
      departmentId: engineeringDept.id,
    });

    // Generate tokens
    adminToken = serviceContainer.authService.generateToken(
      adminUser.id,
      UserRole.ADMIN,
      adminUser.email,
      adminUser.name
    );
    managerToken = serviceContainer.authService.generateToken(
      managerUser.id,
      UserRole.MANAGER,
      managerUser.email,
      managerUser.name
    );
    employeeToken = serviceContainer.authService.generateToken(
      employeeUser.id,
      UserRole.EMPLOYEE,
      employeeUser.email,
      employeeUser.name
    );

    // Setup all routes
    setupRoutes(app, {
      departmentController,
      userController,
      leaveRequestController,
      healthController,
    });

    app.use(errorHandler);
  });

  describe('Complete User Management Workflow', () => {
    it('should handle complete user lifecycle from creation to deletion', async () => {
      // 1. Admin creates a new department
      const departmentResponse = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Marketing' })
        .expect(201);

      const departmentId = departmentResponse.body.data.id;

      // 2. Admin creates a new user in the department
      const userData = {
        name: 'Jane Marketer',
        email: 'jane@company.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        departmentId: departmentId,
      };

      const userResponse = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      const userId = userResponse.body.data.id;

      // 3. Verify user can login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'jane@company.com',
          password: 'password123',
        })
        .expect(200);

      expect(loginResponse.body.data.accessToken).toBeDefined();

      // 4. Verify user profile access
      const profileResponse = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
        .expect(200);

      expect(profileResponse.body.data.email).toBe('jane@company.com');

      // 5. Admin updates user information
      const updateResponse = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Jane Senior Marketer',
          email: 'jane.senior@company.com',
        })
        .expect(200);

      expect(updateResponse.body.data.name).toBe('Jane Senior Marketer');

      // 6. Verify user appears in department users list
      const departmentUsersResponse = await request(app)
        .get(`/departments/${departmentId}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(departmentUsersResponse.body.data).toHaveLength(1);
      expect(departmentUsersResponse.body.data[0].name).toBe(
        'Jane Senior Marketer'
      );

      // 7. Admin deletes user
      await request(app)
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 8. Verify user is deleted
      const deletedUserResponse = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(deletedUserResponse.body.error).toBe('User not found');
    });
  });

  describe('Complete Leave Request Workflow', () => {
    it('should handle complete leave request lifecycle', async () => {
      // 1. Employee creates a leave request
      const leaveRequestData = {
        userId: 3, // John Developer
        startDate: getFutureDateString(7), // 7 days from now
        endDate: getFutureDateString(9), // 9 days from now
      };

      const createResponse = await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveRequestData)
        .expect(201);

      const leaveRequestId = createResponse.body.data.id;
      expect(createResponse.body.data.status).toBe(LeaveRequestStatus.PENDING);
      expect(mockQueueService.publishLeaveRequest).toHaveBeenCalled();

      // 2. Manager reviews and approves the leave request
      const approveResponse = await request(app)
        .put(`/leave-requests/${leaveRequestId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: LeaveRequestStatus.APPROVED })
        .expect(200);

      expect(approveResponse.body.data.status).toBe(
        LeaveRequestStatus.APPROVED
      );

      // 3. Verify leave request appears in user's leave history
      const leaveHistoryResponse = await request(app)
        .get('/users/3/leave-history')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(leaveHistoryResponse.body.data.leaveRequests).toHaveLength(1);
      expect(leaveHistoryResponse.body.data.leaveRequests[0].status).toBe(
        LeaveRequestStatus.APPROVED
      );

      // 4. Manager can view all approved leave requests
      const approvedRequestsResponse = await request(app)
        .get(`/leave-requests/status/${LeaveRequestStatus.APPROVED}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(approvedRequestsResponse.body.data).toHaveLength(1);
      expect(approvedRequestsResponse.body.data[0].id).toBe(leaveRequestId);

      // 5. Admin can delete the leave request
      await request(app)
        .delete(`/leave-requests/${leaveRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 6. Verify leave request is deleted
      const deletedRequestResponse = await request(app)
        .get(`/leave-requests/${leaveRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(deletedRequestResponse.body.error).toBe('Leave request not found');
    });
  });

  describe('Multi-User Collaboration Workflow', () => {
    it('should handle multiple users working with departments and leave requests', async () => {
      // 1. Admin creates multiple departments
      const salesDept = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sales' })
        .expect(201);

      const financeDept = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Finance' })
        .expect(201);

      // 2. Admin creates users in different departments
      const salesUser = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Alice Sales',
          email: 'alice@company.com',
          password: 'password123',
          role: UserRole.EMPLOYEE,
          departmentId: salesDept.body.data.id,
        })
        .expect(201);

      const financeUser = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bob Finance',
          email: 'bob@company.com',
          password: 'password123',
          role: UserRole.EMPLOYEE,
          departmentId: financeDept.body.data.id,
        })
        .expect(201);

      // 3. Both users create leave requests
      const aliceLeaveRequest = await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          userId: salesUser.body.data.id,
          startDate: getFutureDateString(7), // 7 days from now
          endDate: getFutureDateString(9), // 9 days from now
        })
        .expect(201);

      const bobLeaveRequest = await request(app)
        .post('/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          userId: financeUser.body.data.id,
          startDate: getFutureDateString(14), // 14 days from now
          endDate: getFutureDateString(16), // 16 days from now
        })
        .expect(201);

      // 4. Manager approves Alice's request but rejects Bob's
      await request(app)
        .put(`/leave-requests/${aliceLeaveRequest.body.data.id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: LeaveRequestStatus.APPROVED })
        .expect(200);

      await request(app)
        .put(`/leave-requests/${bobLeaveRequest.body.data.id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: LeaveRequestStatus.REJECTED })
        .expect(200);

      // 5. Verify department-specific user lists
      const salesUsers = await request(app)
        .get(`/departments/${salesDept.body.data.id}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const financeUsers = await request(app)
        .get(`/departments/${financeDept.body.data.id}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(salesUsers.body.data).toHaveLength(1);
      expect(financeUsers.body.data).toHaveLength(1);

      // 6. Verify leave request status filtering
      const approvedRequests = await request(app)
        .get(`/leave-requests/status/${LeaveRequestStatus.APPROVED}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const rejectedRequests = await request(app)
        .get(`/leave-requests/status/${LeaveRequestStatus.REJECTED}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(approvedRequests.body.data).toHaveLength(1);
      expect(rejectedRequests.body.data).toHaveLength(1);
    });
  });

  describe('System Health and Monitoring Workflow', () => {
    it('should provide comprehensive system health monitoring', async () => {
      // 1. Check overall system health
      const healthResponse = await request(app).get('/health').expect(200);

      expect(healthResponse.body.data.status).toBe('healthy');
      expect(healthResponse.body.data.services).toHaveProperty('database');
      expect(healthResponse.body.data.services).toHaveProperty('queue');
      expect(healthResponse.body.data.services).toHaveProperty('cache');

      // 2. Check queue health specifically
      const queueHealthResponse = await request(app)
        .get('/health/queue')
        .expect(200);

      expect(queueHealthResponse.body.data.status).toBe('healthy');
      expect(queueHealthResponse.body.data.connection).toBe(true);

      // 3. Check cache health specifically
      const cacheHealthResponse = await request(app)
        .get('/health/cache')
        .expect(200);

      expect(cacheHealthResponse.body.data.status).toBe('healthy');
      expect(cacheHealthResponse.body.data.connected).toBe(true);

      // 4. Perform some operations and verify system remains healthy
      await request(app)
        .get('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 5. Final health check
      const finalHealthResponse = await request(app).get('/health').expect(200);

      expect(finalHealthResponse.body.data.status).toBe('healthy');
    });
  });

  describe('Error Handling and Recovery Workflow', () => {
    it('should handle errors gracefully across the system', async () => {
      // 1. Test invalid authentication
      const invalidAuthResponse = await request(app)
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(invalidAuthResponse.body.success).toBe(false);
      expect(invalidAuthResponse.body.error).toBe('Authentication failed');

      // 2. Test insufficient permissions
      const insufficientPermsResponse = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'New User',
          email: 'new@company.com',
          password: 'password123',
          role: UserRole.EMPLOYEE,
          departmentId: 1,
        })
        .expect(401);

      expect(insufficientPermsResponse.body.success).toBe(false);
      expect(insufficientPermsResponse.body.error).toBe(
        'Authentication required'
      );

      // 3. Test validation errors
      const validationErrorResponse = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' })
        .expect(400);

      expect(validationErrorResponse.body.success).toBe(false);
      expect(validationErrorResponse.body.error).toContain('Validation failed');

      // 4. Test not found errors
      const notFoundResponse = await request(app)
        .get('/users/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(notFoundResponse.body.success).toBe(false);
      expect(notFoundResponse.body.error).toBe('User not found');

      // 5. Verify system remains functional after errors
      const recoveryResponse = await request(app)
        .get('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(recoveryResponse.body.success).toBe(true);
    });
  });

  describe('Performance and Scalability Workflow', () => {
    it('should handle multiple concurrent operations efficiently', async () => {
      const startTime = Date.now();

      // Perform multiple operations concurrently
      const promises = [
        request(app)
          .get('/departments')
          .set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/users').set('Authorization', `Bearer ${adminToken}`),
        request(app)
          .get('/leave-requests')
          .set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/health'),
        request(app).get('/health/queue'),
        request(app).get('/health/cache'),
      ];

      const responses = await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBeLessThan(400);
      });

      // Should complete within reasonable time (1 second)
      expect(totalTime).toBeLessThan(1000);
    });
  });
});

function setupRoutes(app: express.Application, controllers: any) {
  const {
    departmentController,
    userController,
    leaveRequestController,
    healthController,
  } = controllers;

  // Auth routes
  app.post(
    '/auth/login',
    validateRequest({ body: schemas.login }),
    userController.login
  );
  app.get('/auth/profile', authenticateToken, userController.getProfile);

  // User routes
  app.post(
    '/users',
    validateRequest({ body: schemas.createUser }),
    requireAdmin,
    userController.createUser
  );
  app.get(
    '/users/:id',
    validateRequest({ params: schemas.idParam }),
    authenticateToken,
    userController.getUserById
  );
  app.get(
    '/users/:id/leave-history',
    validateRequest({ params: schemas.idParam }),
    authenticateToken,
    userController.getUserWithLeaveHistory
  );
  app.get(
    '/departments/:departmentId/users',
    validateRequest({
      params: Joi.object({
        departmentId: Joi.number().integer().positive().required(),
      }),
      query: schemas.paginationQuery,
    }),
    authenticateToken,
    userController.getUsersByDepartment
  );
  app.get('/users', authenticateToken, userController.getAllUsers);
  app.put(
    '/users/:id',
    validateRequest({ params: schemas.idParam, body: schemas.updateUser }),
    authenticateToken,
    userController.updateUser
  );
  app.delete(
    '/users/:id',
    validateRequest({ params: schemas.idParam }),
    requireAdmin,
    userController.deleteUser
  );

  // Department routes
  app.post(
    '/departments',
    validateRequest({ body: schemas.createDepartment }),
    requireAdmin,
    departmentController.createDepartment
  );
  app.get(
    '/departments/:id',
    validateRequest({ params: schemas.idParam }),
    authenticateToken,
    departmentController.getDepartmentById
  );
  app.get(
    '/departments/:id/users',
    validateRequest({
      params: schemas.idParam,
      query: schemas.paginationQuery,
    }),
    authenticateToken,
    departmentController.getUsersByDepartment
  );
  app.get(
    '/departments/:id/users-with-department',
    validateRequest({ params: schemas.idParam }),
    authenticateToken,
    departmentController.getDepartmentWithUsers
  );
  app.get(
    '/departments',
    authenticateToken,
    departmentController.getAllDepartments
  );
  app.put(
    '/departments/:id',
    validateRequest({
      params: schemas.idParam,
      body: schemas.createDepartment,
    }),
    requireAdmin,
    departmentController.updateDepartment
  );
  app.delete(
    '/departments/:id',
    validateRequest({ params: schemas.idParam }),
    requireAdmin,
    departmentController.deleteDepartment
  );

  // Leave request routes
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
      params: Joi.object({
        userId: Joi.number().integer().positive().required(),
      }),
      query: schemas.paginationQuery,
    }),
    authenticateToken,
    leaveRequestController.getLeaveRequestsByUser
  );
  app.get(
    '/leave-requests/status/:status',
    validateRequest({
      params: Joi.object({
        status: Joi.string()
          .valid('PENDING', 'APPROVED', 'REJECTED', 'PENDING_APPROVAL')
          .required(),
      }),
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

  // Health check routes
  app.get('/health', healthController.healthCheck);
  app.get('/health/queue', healthController.queueHealth);
  app.get('/health/cache', healthController.cacheHealth);
}
