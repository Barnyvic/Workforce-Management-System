import { FindManyOptions } from 'typeorm';
import { Department } from '@/entities/department.entity';
import { LeaveRequest } from '@/entities/leave-request.entity';
import { PaginationParams, LeaveRequestStatus } from '@/types';

export interface DepartmentRepository {
  findById(id: number): Promise<Department | null>;
  findByName(name: string): Promise<Department | null>;
  findAll(options?: FindManyOptions<Department>): Promise<Department[]>;
  findWithUsers(id: number): Promise<Department | null>;
  findUsersByDepartment(
    departmentId: number,
    pagination: PaginationParams
  ): Promise<{ departments: Department[]; total: number }>;
  create(data: Partial<Department>): Promise<Department>;
  update(id: number, data: Partial<Department>): Promise<Department>;
  delete(id: number): Promise<void>;
  count(): Promise<number>;
}

export interface LeaveRequestRepository {
  findById(id: number): Promise<LeaveRequest | null>;
  findByUserId(
    userId: number,
    pagination?: PaginationParams
  ): Promise<{ leaveRequests: LeaveRequest[]; total: number }>;
  findByStatus(
    status: LeaveRequestStatus,
    pagination?: PaginationParams
  ): Promise<{ leaveRequests: LeaveRequest[]; total: number }>;
  findPendingRequests(): Promise<LeaveRequest[]>;
  findOverlappingRequests(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<LeaveRequest[]>;
  findAll(options?: FindManyOptions<LeaveRequest>): Promise<LeaveRequest[]>;
  create(data: Partial<LeaveRequest>): Promise<LeaveRequest>;
  update(id: number, data: Partial<LeaveRequest>): Promise<LeaveRequest>;
  updateStatus(id: number, status: LeaveRequestStatus): Promise<LeaveRequest>;
  delete(id: number): Promise<void>;
  count(options?: FindManyOptions<LeaveRequest>): Promise<number>;
}
