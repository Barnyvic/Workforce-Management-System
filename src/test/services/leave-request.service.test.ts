import { LeaveRequestServiceImpl } from '@/services/leave-request.service';
import { LeaveRequestRepositoryImpl } from '@/repositories/leave-request.repository';
import { UserRepositoryImpl } from '@/repositories/user.repository';
import { DepartmentRepositoryImpl } from '@/repositories/department.repository';
import { LeaveRequestStatus, QueueMessage, UserRole } from '@/types';
import {
  testDataSource,
  setupTestDatabase,
  teardownTestDatabase,
} from '../setup';

describe('LeaveRequestService', () => {
  let leaveRequestService: LeaveRequestServiceImpl;
  let leaveRequestRepository: LeaveRequestRepositoryImpl;
  let userRepository: UserRepositoryImpl;
  let departmentRepository: DepartmentRepositoryImpl;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await testDataSource.synchronize();

    leaveRequestRepository = new LeaveRequestRepositoryImpl();
    userRepository = new UserRepositoryImpl();
    departmentRepository = new DepartmentRepositoryImpl();
    leaveRequestService = new LeaveRequestServiceImpl(
      leaveRequestRepository,
      userRepository
    );
  });

  describe('createLeaveRequest', () => {
    beforeEach(async () => {
      await departmentRepository.create({ name: 'Engineering' });
      await userRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      });
    });

    it('should create leave request successfully', async () => {
      const leaveRequestData = {
        userId: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-02',
      };

      const result =
        await leaveRequestService.createLeaveRequest(leaveRequestData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.userId).toBe(1);
      expect(result.data?.status).toBe(LeaveRequestStatus.PENDING);
    });

    it('should fail when user does not exist', async () => {
      const leaveRequestData = {
        userId: 999,
        startDate: '2024-02-01',
        endDate: '2024-02-02',
      };

      const result =
        await leaveRequestService.createLeaveRequest(leaveRequestData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should fail when end date is before start date', async () => {
      const leaveRequestData = {
        userId: 1,
        startDate: '2024-02-02',
        endDate: '2024-02-01',
      };

      const result =
        await leaveRequestService.createLeaveRequest(leaveRequestData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('End date must be after start date');
    });

    it('should fail when start date is in the past', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const leaveRequestData = {
        userId: 1,
        startDate: yesterdayStr!,
        endDate: '2024-02-02',
      };

      const result =
        await leaveRequestService.createLeaveRequest(leaveRequestData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Start date cannot be in the past');
    });
  });

  describe('processLeaveRequest', () => {
    beforeEach(async () => {
      await departmentRepository.create({ name: 'Engineering' });
      await userRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      });
    });

    it('should auto-approve short leave requests (≤ 2 days)', async () => {
      const leaveRequest = await leaveRequestRepository.create({
        userId: 1,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-02'),
        status: LeaveRequestStatus.PENDING,
      });

      const message: QueueMessage = {
        id: 'test-1',
        type: 'leave.requested',
        data: {
          leaveRequestId: leaveRequest.id,
          userId: 1,
          startDate: '2024-02-01',
          endDate: '2024-02-02',
        },
        timestamp: new Date().toISOString(),
      };

      await leaveRequestService.processLeaveRequest(message);

      const updatedRequest = await leaveRequestRepository.findById(
        leaveRequest.id
      );
      expect(updatedRequest?.status).toBe(LeaveRequestStatus.APPROVED);
    });

    it('should mark long leave requests as pending approval (> 2 days)', async () => {
      const leaveRequest = await leaveRequestRepository.create({
        userId: 1,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-05'),
        status: LeaveRequestStatus.PENDING,
      });

      const message: QueueMessage = {
        id: 'test-2',
        type: 'leave.requested',
        data: {
          leaveRequestId: leaveRequest.id,
          userId: 1,
          startDate: '2024-02-01',
          endDate: '2024-02-05',
        },
        timestamp: new Date().toISOString(),
      };

      await leaveRequestService.processLeaveRequest(message);

      const updatedRequest = await leaveRequestRepository.findById(
        leaveRequest.id
      );
      expect(updatedRequest?.status).toBe(LeaveRequestStatus.PENDING_APPROVAL);
    });

    it('should handle processing errors gracefully', async () => {
      const message: QueueMessage = {
        id: 'test-3',
        type: 'leave.requested',
        data: {
          leaveRequestId: 999,
          userId: 1,
          startDate: '2024-02-01',
          endDate: '2024-02-02',
        },
        timestamp: new Date().toISOString(),
      };

      await expect(
        leaveRequestService.processLeaveRequest(message)
      ).resolves.not.toThrow();
    });
  });

  describe('updateLeaveRequestStatus', () => {
    beforeEach(async () => {
      await departmentRepository.create({ name: 'Engineering' });
      await userRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      });
    });

    it('should update leave request status successfully', async () => {
      const leaveRequest = await leaveRequestRepository.create({
        userId: 1,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-02'),
        status: LeaveRequestStatus.PENDING,
      });

      const result = await leaveRequestService.updateLeaveRequestStatus(
        leaveRequest.id,
        LeaveRequestStatus.APPROVED
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(LeaveRequestStatus.APPROVED);
      expect(result.message).toBe('Leave request status updated successfully');
    });

    it('should fail when leave request not found', async () => {
      const result = await leaveRequestService.updateLeaveRequestStatus(
        999,
        LeaveRequestStatus.APPROVED
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Leave request not found');
    });
  });
});
