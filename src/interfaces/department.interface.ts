import { Department } from '@/entities/department.entity';
import { PaginationParams, ApiResponse } from '@/types';

export interface CreateDepartmentDto {
  name: string;
}

export interface DepartmentService {
  createDepartment(data: CreateDepartmentDto): Promise<ApiResponse<Department>>;
  getDepartmentById(id: number): Promise<ApiResponse<Department>>;
  getDepartmentWithEmployees(id: number): Promise<ApiResponse<Department>>;
  getEmployeesByDepartment(
    departmentId: number,
    pagination: PaginationParams
  ): Promise<ApiResponse<Department[]>>;
  getAllDepartments(): Promise<ApiResponse<Department[]>>;
  updateDepartment(
    id: number,
    data: Partial<CreateDepartmentDto>
  ): Promise<ApiResponse<Department>>;
  deleteDepartment(id: number): Promise<ApiResponse<void>>;
}
