import { LeaveRequest } from '@/entities/leave-request.entity';
import { LeaveRequestRepository } from '@/interfaces/repository.interfaces';
import { LeaveRequestRepositoryImpl } from '@/repositories/leave-request.repository';
import { EmployeeRepository } from '@/interfaces/repository.interfaces';
import { EmployeeRepositoryImpl } from '@/repositories/employee.repository';
import {
  PaginationParams,
  ApiResponse,
  QueueMessage,
  LeaveRequestStatus,
} from '@/types';
import { QueueServiceImpl } from '@/services/queue.service';
import {
  CreateLeaveRequestDto,
  LeaveRequestService,
} from '@/interfaces/leave-request.interface';
import { logger } from '@/services/logger.service';

export class LeaveRequestServiceImpl implements LeaveRequestService {
  private leaveRequestRepository: LeaveRequestRepository;
  private employeeRepository: EmployeeRepository;
  private queueService: QueueServiceImpl;

  constructor(
    leaveRequestRepository?: LeaveRequestRepository,
    employeeRepository?: EmployeeRepository,
    queueService?: QueueServiceImpl
  ) {
    this.leaveRequestRepository =
      leaveRequestRepository || new LeaveRequestRepositoryImpl();
    this.employeeRepository =
      employeeRepository || new EmployeeRepositoryImpl();
    this.queueService = queueService || new QueueServiceImpl();
  }

  async createLeaveRequest(
    data: CreateLeaveRequestDto
  ): Promise<ApiResponse<LeaveRequest>> {
    logger.info('Creating leave request', {
      employeeId: data.employeeId,
      startDate: data.startDate,
      endDate: data.endDate,
    });
    try {
      const employee = await this.employeeRepository.findById(data.employeeId);
      if (!employee) {
        logger.warn('Leave request creation failed - employee not found', {
          employeeId: data.employeeId,
        });
        return {
          success: false,
          error: 'Employee not found',
          timestamp: new Date().toISOString(),
        };
      }

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (startDate >= endDate) {
        logger.warn('Leave request creation failed - invalid date range', {
          employeeId: data.employeeId,
          startDate: data.startDate,
          endDate: data.endDate,
        });
        return {
          success: false,
          error: 'End date must be after start date',
          timestamp: new Date().toISOString(),
        };
      }

      if (startDate < new Date()) {
        logger.warn('Leave request creation failed - start date in past', {
          employeeId: data.employeeId,
          startDate: data.startDate,
        });
        return {
          success: false,
          error: 'Start date cannot be in the past',
          timestamp: new Date().toISOString(),
        };
      }

      const overlappingRequests =
        await this.leaveRequestRepository.findOverlappingRequests(
          data.employeeId,
          startDate,
          endDate
        );

      if (overlappingRequests.length > 0) {
        logger.warn('Leave request creation failed - overlapping requests', {
          employeeId: data.employeeId,
          overlappingCount: overlappingRequests.length,
        });
        return {
          success: false,
          error:
            'Leave request overlaps with existing approved or pending requests',
          timestamp: new Date().toISOString(),
        };
      }

      const leaveRequest = await this.leaveRequestRepository.create({
        employeeId: data.employeeId,
        startDate,
        endDate,
        status: LeaveRequestStatus.PENDING,
      });

      await this.queueService.publishLeaveRequest({
        id: leaveRequest.id.toString(),
        type: 'leave.requested',
        data: {
          leaveRequestId: leaveRequest.id,
          employeeId: data.employeeId,
          startDate: data.startDate,
          endDate: data.endDate,
        },
        timestamp: new Date().toISOString(),
      });

      logger.info('Leave request created successfully', {
        leaveRequestId: leaveRequest.id,
        employeeId: data.employeeId,
        duration: leaveRequest.durationInDays,
      });
      return {
        success: true,
        data: leaveRequest,
        message: 'Leave request created successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to create leave request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        employeeId: data.employeeId,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create leave request',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getLeaveRequestById(id: number): Promise<ApiResponse<LeaveRequest>> {
    logger.info('Getting leave request by ID', { leaveRequestId: id });
    try {
      const leaveRequest = await this.leaveRequestRepository.findById(id);
      if (!leaveRequest) {
        logger.warn('Leave request not found', { leaveRequestId: id });
        return {
          success: false,
          error: 'Leave request not found',
          timestamp: new Date().toISOString(),
        };
      }

      logger.info('Leave request retrieved successfully', {
        leaveRequestId: id,
        employeeId: leaveRequest.employeeId,
        status: leaveRequest.status,
      });
      return {
        success: true,
        data: leaveRequest,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get leave request by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        leaveRequestId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get leave request',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getLeaveRequestsByEmployee(
    employeeId: number,
    pagination?: PaginationParams
  ): Promise<ApiResponse<LeaveRequest[]>> {
    logger.info('Getting leave requests by employee', {
      employeeId,
      pagination,
    });
    try {
      const result = await this.leaveRequestRepository.findByEmployeeId(
        employeeId,
        pagination
      );
      logger.info('Leave requests by employee retrieved successfully', {
        employeeId,
        total: result.total,
        returned: result.leaveRequests.length,
      });
      return {
        success: true,
        data: result.leaveRequests,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get leave requests by employee', {
        error: error instanceof Error ? error.message : 'Unknown error',
        employeeId,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get leave requests by employee',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getLeaveRequestsByStatus(
    status: LeaveRequestStatus,
    pagination?: PaginationParams
  ): Promise<ApiResponse<LeaveRequest[]>> {
    logger.info('Getting leave requests by status', { status, pagination });
    try {
      const result = await this.leaveRequestRepository.findByStatus(
        status,
        pagination
      );
      logger.info('Leave requests by status retrieved successfully', {
        status,
        total: result.total,
        returned: result.leaveRequests.length,
      });
      return {
        success: true,
        data: result.leaveRequests,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get leave requests by status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        status,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get leave requests by status',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async updateLeaveRequestStatus(
    id: number,
    status: LeaveRequestStatus
  ): Promise<ApiResponse<LeaveRequest>> {
    logger.info('Updating leave request status', {
      leaveRequestId: id,
      newStatus: status,
    });
    try {
      const leaveRequest = await this.leaveRequestRepository.findById(id);
      if (!leaveRequest) {
        logger.warn('Leave request not found for status update', {
          leaveRequestId: id,
        });
        return {
          success: false,
          error: 'Leave request not found',
          timestamp: new Date().toISOString(),
        };
      }

      const updatedLeaveRequest =
        await this.leaveRequestRepository.updateStatus(id, status);
      logger.info('Leave request status updated successfully', {
        leaveRequestId: id,
        oldStatus: leaveRequest.status,
        newStatus: status,
      });
      return {
        success: true,
        data: updatedLeaveRequest,
        message: 'Leave request status updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to update leave request status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        leaveRequestId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update leave request status',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async processLeaveRequest(message: QueueMessage): Promise<void> {
    try {
      const { leaveRequestId } = message.data as {
        leaveRequestId: number;
        employeeId: number;
        startDate: string;
        endDate: string;
      };

      const leaveRequest =
        await this.leaveRequestRepository.findById(leaveRequestId);
      if (!leaveRequest) {
        logger.error(`Leave request ${leaveRequestId} not found`);
        return;
      }

      if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
        logger.info(
          `Leave request ${leaveRequestId} already processed with status: ${leaveRequest.status}`
        );
        return;
      }

      const durationInDays = leaveRequest.durationInDays;
      let newStatus: LeaveRequestStatus;

      if (durationInDays <= 2) {
        newStatus = LeaveRequestStatus.APPROVED;
      } else {
        newStatus = LeaveRequestStatus.PENDING_APPROVAL;
      }

      await this.leaveRequestRepository.updateStatus(leaveRequestId, newStatus);
      logger.info(
        `Leave request ${leaveRequestId} processed: ${newStatus} (${durationInDays} days)`
      );
    } catch (error) {
      logger.error('Error processing leave request:', error);
      throw error;
    }
  }

  async getAllLeaveRequests(): Promise<ApiResponse<LeaveRequest[]>> {
    logger.info('Getting all leave requests');
    try {
      const leaveRequests = await this.leaveRequestRepository.findAll();
      logger.info('All leave requests retrieved successfully', {
        count: leaveRequests.length,
      });
      return {
        success: true,
        data: leaveRequests,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get all leave requests', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get leave requests',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async deleteLeaveRequest(id: number): Promise<ApiResponse<void>> {
    logger.info('Deleting leave request', { leaveRequestId: id });
    try {
      const leaveRequest = await this.leaveRequestRepository.findById(id);
      if (!leaveRequest) {
        logger.warn('Leave request not found for deletion', {
          leaveRequestId: id,
        });
        return {
          success: false,
          error: 'Leave request not found',
          timestamp: new Date().toISOString(),
        };
      }

      await this.leaveRequestRepository.delete(id);
      logger.info('Leave request deleted successfully', {
        leaveRequestId: id,
        employeeId: leaveRequest.employeeId,
        status: leaveRequest.status,
      });
      return {
        success: true,
        message: 'Leave request deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to delete leave request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        leaveRequestId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete leave request',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
