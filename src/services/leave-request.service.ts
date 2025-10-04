import { LeaveRequest } from '@/entities/leave-request.entity';
import { LeaveRequestRepository } from '@/interfaces/repository.interfaces';
import { LeaveRequestRepositoryImpl } from '@/repositories/leave-request.repository';
import { UserRepository } from '@/interfaces/user-repository.interface';
import { UserRepositoryImpl } from '@/repositories/user.repository';
import {
  PaginationParams,
  ApiResponse,
  QueueMessage,
  LeaveRequestStatus,
  PaginatedResponse,
  PaginationMetadata,
} from '@/types';
import { QueueServiceImpl } from '@/services/queue.service';
import {
  CreateLeaveRequestDto,
  LeaveRequestService,
} from '@/interfaces/leave-request.interface';
import { logger } from '@/services/logger.service';

export class LeaveRequestServiceImpl implements LeaveRequestService {
  private leaveRequestRepository: LeaveRequestRepository;
  private userRepository: UserRepository;
  private queueService: QueueServiceImpl;

  constructor(
    leaveRequestRepository?: LeaveRequestRepository,
    userRepository?: UserRepository,
    queueService?: QueueServiceImpl
  ) {
    this.leaveRequestRepository =
      leaveRequestRepository || new LeaveRequestRepositoryImpl();
    this.userRepository = userRepository || new UserRepositoryImpl();
    this.queueService = queueService || new QueueServiceImpl();
  }

  async createLeaveRequest(
    data: CreateLeaveRequestDto
  ): Promise<ApiResponse<LeaveRequest>> {
    logger.info('Creating leave request', {
      userId: data.userId,
      startDate: data.startDate,
      endDate: data.endDate,
    });
    try {
      const user = await this.userRepository.findById(data.userId);
      if (!user) {
        logger.warn('Leave request creation failed - user not found', {
          userId: data.userId,
        });
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        };
      }

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (startDate >= endDate) {
        logger.warn('Leave request creation failed - invalid date range', {
          userId: data.userId,
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
          userId: data.userId,
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
          data.userId,
          startDate,
          endDate
        );

      if (overlappingRequests.length > 0) {
        logger.warn('Leave request creation failed - overlapping requests', {
          userId: data.userId,
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
        userId: data.userId,
        startDate,
        endDate,
        status: LeaveRequestStatus.PENDING,
      });

      await this.queueService.publishLeaveRequest({
        id: leaveRequest.id.toString(),
        type: 'leave.requested',
        data: {
          leaveRequestId: leaveRequest.id,
          userId: data.userId,
          startDate: data.startDate,
          endDate: data.endDate,
        },
        timestamp: new Date().toISOString(),
      });

      logger.info('Leave request created successfully', {
        leaveRequestId: leaveRequest.id,
        userId: data.userId,
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
        userId: data.userId,
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
        userId: leaveRequest.userId,
        status: leaveRequest.status,
      });
      return {
        success: true,
        data: leaveRequest.toSafeObject() as LeaveRequest,
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

  async getLeaveRequestsByUser(
    userId: number,
    pagination?: PaginationParams
  ): Promise<ApiResponse<LeaveRequest[]>> {
    logger.info('Getting leave requests by user', {
      userId,
      pagination,
    });
    try {
      const result = await this.leaveRequestRepository.findByUserId(
        userId,
        pagination
      );
      logger.info('Leave requests by user retrieved successfully', {
        userId,
        total: result.total,
        returned: result.leaveRequests.length,
      });
      return {
        success: true,
        data: result.leaveRequests.map((lr) =>
          lr.toSafeObject()
        ) as LeaveRequest[],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get leave requests by user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get leave requests by user',
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
        data: result.leaveRequests.map((lr) =>
          lr.toSafeObject()
        ) as LeaveRequest[],
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
        data: updatedLeaveRequest.toSafeObject() as LeaveRequest,
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

  async getAllLeaveRequests(
    pagination?: PaginationParams
  ): Promise<ApiResponse<LeaveRequest[]> | PaginatedResponse<LeaveRequest>> {
    logger.info('Getting all leave requests', { pagination });
    try {
      if (pagination) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;

        // Use findAll and count for pagination
        const [leaveRequests, total] = await Promise.all([
          this.leaveRequestRepository.findAll({
            skip,
            take: limit,
            order: { createdAt: 'DESC' },
            relations: ['user'],
          }),
          this.leaveRequestRepository.count(),
        ]);

        // Create safe leave requests without user passwords
        const safeLeaveRequests = leaveRequests.map((lr) => lr.toSafeObject());

        const totalPages = Math.ceil(total / limit);
        const paginationMetadata: PaginationMetadata = {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        };

        logger.info(
          'All leave requests retrieved successfully with pagination',
          {
            count: leaveRequests.length,
            total,
            pagination: paginationMetadata,
          }
        );

        return {
          success: true,
          data: safeLeaveRequests as LeaveRequest[],
          pagination: paginationMetadata,
          timestamp: new Date().toISOString(),
        };
      } else {
        const leaveRequests = await this.leaveRequestRepository.findAll({
          order: { createdAt: 'DESC' },
          relations: ['user'],
        });

        // Create safe leave requests without user passwords
        const safeLeaveRequests = leaveRequests.map((lr) => lr.toSafeObject());

        logger.info('All leave requests retrieved successfully', {
          count: leaveRequests.length,
        });

        return {
          success: true,
          data: safeLeaveRequests as LeaveRequest[],
          timestamp: new Date().toISOString(),
        };
      }
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

  async getAllLeaveRequestsWithAuth(
    userInfo: { userId: number; role: string; departmentId?: number },
    pagination?: PaginationParams
  ): Promise<ApiResponse<LeaveRequest[]>> {
    logger.info('Getting leave requests with authorization', {
      userInfo,
      pagination,
    });
    try {
      let leaveRequests: LeaveRequest[];

      if (userInfo.role === 'ADMIN') {
        // Admin can see all leave requests
        return this.getAllLeaveRequests(pagination);
      } else if (userInfo.role === 'MANAGER') {
        // Manager can see leave requests for employees in their department
        if (!userInfo.departmentId) {
          logger.warn('Manager user has no department assigned', {
            userId: userInfo.userId,
          });
          return {
            success: false,
            error: 'Manager user has no department assigned',
            timestamp: new Date().toISOString(),
          };
        }

        if (pagination) {
          const { page, limit } = pagination;
          const skip = (page - 1) * limit;
          leaveRequests = await this.leaveRequestRepository.findAll({
            skip,
            take: limit,
            order: { createdAt: 'DESC' },
            relations: ['user'],
            where: {
              user: { departmentId: userInfo.departmentId },
            },
          });
        } else {
          leaveRequests = await this.leaveRequestRepository.findAll({
            order: { createdAt: 'DESC' },
            relations: ['user'],
            where: {
              user: { departmentId: userInfo.departmentId },
            },
          });
        }
      } else {
        // Employee can only see their own leave requests
        if (pagination) {
          const { page, limit } = pagination;
          const skip = (page - 1) * limit;
          leaveRequests = await this.leaveRequestRepository.findAll({
            skip,
            take: limit,
            order: { createdAt: 'DESC' },
            relations: ['user'],
            where: { userId: userInfo.userId },
          });
        } else {
          leaveRequests = await this.leaveRequestRepository.findAll({
            order: { createdAt: 'DESC' },
            relations: ['user'],
            where: { userId: userInfo.userId },
          });
        }
      }

      // Create safe leave requests without user passwords
      const safeLeaveRequests = leaveRequests.map((lr) => lr.toSafeObject());

      logger.info('Leave requests with authorization retrieved successfully', {
        count: leaveRequests.length,
        userRole: userInfo.role,
        pagination,
      });
      return {
        success: true,
        data: safeLeaveRequests as LeaveRequest[],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get leave requests with authorization', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userInfo,
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
        userId: leaveRequest.userId,
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
