import { Department } from '@/entities/department.entity';
import {
  PaginationParams,
  ApiResponse,
  PaginatedResponse,
  SafeDepartment,
} from '@/types';

export interface CreateDepartmentDto {
  name: string;
}

export interface DepartmentService {
  createDepartment(data: CreateDepartmentDto): Promise<ApiResponse<Department>>;
  getDepartmentById(id: number): Promise<ApiResponse<Department>>;
  getDepartmentWithUsers(id: number): Promise<ApiResponse<SafeDepartment>>;
  getUsersByDepartment(
    departmentId: number,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<SafeDepartment>>;
  getAllDepartments(
    pagination?: PaginationParams
  ): Promise<ApiResponse<Department[]> | PaginatedResponse<Department>>;
  updateDepartment(
    id: number,
    data: Partial<CreateDepartmentDto>
  ): Promise<ApiResponse<Department>>;
  deleteDepartment(id: number): Promise<ApiResponse<void>>;
}
