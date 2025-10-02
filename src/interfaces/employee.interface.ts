import { Employee } from '@/entities/employee.entity';
import { PaginationParams, ApiResponse } from '@/types';

export interface CreateEmployeeDto {
  name: string;
  email: string;
  departmentId: number;
}

export interface EmployeeService {
  createEmployee(data: CreateEmployeeDto): Promise<ApiResponse<Employee>>;
  getEmployeeById(id: number): Promise<ApiResponse<Employee>>;
  getEmployeeWithLeaveHistory(id: number): Promise<ApiResponse<Employee>>;
  getEmployeesByDepartment(
    departmentId: number,
    pagination: PaginationParams
  ): Promise<ApiResponse<Employee[]>>;
  getAllEmployees(): Promise<ApiResponse<Employee[]>>;
  updateEmployee(
    id: number,
    data: Partial<CreateEmployeeDto>
  ): Promise<ApiResponse<Employee>>;
  deleteEmployee(id: number): Promise<ApiResponse<void>>;
}
