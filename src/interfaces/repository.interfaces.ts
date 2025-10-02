import { FindManyOptions } from 'typeorm';
import { Department } from '@/entities/department.entity';
import { Employee } from '@/entities/employee.entity';
import { LeaveRequest } from '@/entities/leave-request.entity';
import { PaginationParams, LeaveRequestStatus } from '@/types';

export interface DepartmentRepository {
  findById(id: number): Promise<Department | null>;
  findByName(name: string): Promise<Department | null>;
  findAll(options?: FindManyOptions<Department>): Promise<Department[]>;
  findWithEmployees(id: number): Promise<Department | null>;
  findEmployeesByDepartment(
    departmentId: number,
    pagination: PaginationParams
  ): Promise<{ departments: Department[]; total: number }>;
  create(data: Partial<Department>): Promise<Department>;
  update(id: number, data: Partial<Department>): Promise<Department>;
  delete(id: number): Promise<void>;
  count(): Promise<number>;
}

export interface EmployeeRepository {
  findById(id: number): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByDepartmentId(
    departmentId: number,
    pagination?: PaginationParams
  ): Promise<{ employees: Employee[]; total: number }>;
  findWithLeaveHistory(id: number): Promise<Employee | null>;
  findAll(options?: FindManyOptions<Employee>): Promise<Employee[]>;
  create(data: Partial<Employee>): Promise<Employee>;
  update(id: number, data: Partial<Employee>): Promise<Employee>;
  delete(id: number): Promise<void>;
  count(options?: FindManyOptions<Employee>): Promise<number>;
}

export interface LeaveRequestRepository {
  findById(id: number): Promise<LeaveRequest | null>;
  findByEmployeeId(
    employeeId: number,
    pagination?: PaginationParams
  ): Promise<{ leaveRequests: LeaveRequest[]; total: number }>;
  findByStatus(
    status: LeaveRequestStatus,
    pagination?: PaginationParams
  ): Promise<{ leaveRequests: LeaveRequest[]; total: number }>;
  findPendingRequests(): Promise<LeaveRequest[]>;
  findOverlappingRequests(
    employeeId: number,
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
