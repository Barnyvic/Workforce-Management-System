import { LeaveRequest } from '@/entities/leave-request.entity';
import {
  PaginationParams,
  ApiResponse,
  QueueMessage,
  LeaveRequestStatus,
  PaginatedResponse,
} from '@/types';

export interface CreateLeaveRequestDto {
  userId: number;
  startDate: string;
  endDate: string;
}

export interface LeaveRequestService {
  createLeaveRequest(
    data: CreateLeaveRequestDto
  ): Promise<ApiResponse<LeaveRequest>>;
  getLeaveRequestById(id: number): Promise<ApiResponse<LeaveRequest>>;
  getLeaveRequestsByUser(
    userId: number,
    pagination?: PaginationParams
  ): Promise<ApiResponse<LeaveRequest[]>>;
  getLeaveRequestsByStatus(
    status: LeaveRequestStatus,
    pagination?: PaginationParams
  ): Promise<ApiResponse<LeaveRequest[]>>;
  updateLeaveRequestStatus(
    id: number,
    status: LeaveRequestStatus
  ): Promise<ApiResponse<LeaveRequest>>;
  processLeaveRequest(message: QueueMessage): Promise<void>;
  getAllLeaveRequests(
    pagination?: PaginationParams
  ): Promise<ApiResponse<LeaveRequest[]> | PaginatedResponse<LeaveRequest>>;
  getAllLeaveRequestsWithAuth(
    userInfo: { userId: number; role: string; departmentId?: number },
    pagination?: PaginationParams
  ): Promise<ApiResponse<LeaveRequest[]>>;
  deleteLeaveRequest(id: number): Promise<ApiResponse<void>>;
}
