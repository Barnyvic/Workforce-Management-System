import { Employee } from '@/entities/employee.entity';
import { EmployeeRepository } from '@/interfaces/repository.interfaces';
import { EmployeeRepositoryImpl } from '@/repositories/employee.repository';
import { DepartmentRepository } from '@/interfaces/repository.interfaces';
import { DepartmentRepositoryImpl } from '@/repositories/department.repository';
import { PaginationParams, ApiResponse } from '@/types';
import {
  CreateEmployeeDto,
  EmployeeService,
} from '@/interfaces/employee.interface';
import { logger } from '@/services/logger.service';

export class EmployeeServiceImpl implements EmployeeService {
  private employeeRepository: EmployeeRepository;
  private departmentRepository: DepartmentRepository;

  constructor(
    employeeRepository?: EmployeeRepository,
    departmentRepository?: DepartmentRepository
  ) {
    this.employeeRepository =
      employeeRepository || new EmployeeRepositoryImpl();
    this.departmentRepository =
      departmentRepository || new DepartmentRepositoryImpl();
  }

  async createEmployee(
    data: CreateEmployeeDto
  ): Promise<ApiResponse<Employee>> {
    logger.info('Creating employee', {
      name: data.name,
      email: data.email,
      departmentId: data.departmentId,
    });
    try {
      const department = await this.departmentRepository.findById(
        data.departmentId
      );
      if (!department) {
        logger.warn('Employee creation failed - department not found', {
          departmentId: data.departmentId,
        });
        return {
          success: false,
          error: 'Department not found',
          timestamp: new Date().toISOString(),
        };
      }

      const existingEmployee = await this.employeeRepository.findByEmail(
        data.email
      );
      if (existingEmployee) {
        logger.warn('Employee creation failed - email already exists', {
          email: data.email,
        });
        return {
          success: false,
          error: 'Employee with this email already exists',
          timestamp: new Date().toISOString(),
        };
      }

      const employee = await this.employeeRepository.create(data);
      logger.info('Employee created successfully', {
        employeeId: employee.id,
        name: employee.name,
        email: employee.email,
      });
      return {
        success: true,
        data: employee,
        message: 'Employee created successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to create employee', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: data.name,
        email: data.email,
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create employee',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getEmployeeById(id: number): Promise<ApiResponse<Employee>> {
    logger.info('Getting employee by ID', { employeeId: id });
    try {
      const employee = await this.employeeRepository.findById(id);
      if (!employee) {
        logger.warn('Employee not found', { employeeId: id });
        return {
          success: false,
          error: 'Employee not found',
          timestamp: new Date().toISOString(),
        };
      }

      logger.info('Employee retrieved successfully', {
        employeeId: id,
        name: employee.name,
        email: employee.email,
      });
      return {
        success: true,
        data: employee,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get employee by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        employeeId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get employee',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getEmployeeWithLeaveHistory(
    id: number
  ): Promise<ApiResponse<Employee>> {
    logger.info('Getting employee with leave history', { employeeId: id });
    try {
      const employee = await this.employeeRepository.findWithLeaveHistory(id);
      if (!employee) {
        logger.warn('Employee not found', { employeeId: id });
        return {
          success: false,
          error: 'Employee not found',
          timestamp: new Date().toISOString(),
        };
      }

      logger.info('Employee with leave history retrieved successfully', {
        employeeId: id,
        name: employee.name,
        leaveRequestCount: employee.leaveRequests?.length || 0,
      });
      return {
        success: true,
        data: employee,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get employee with leave history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        employeeId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get employee with leave history',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getEmployeesByDepartment(
    departmentId: number,
    pagination: PaginationParams
  ): Promise<ApiResponse<Employee[]>> {
    logger.info('Getting employees by department', {
      departmentId,
      pagination,
    });
    try {
      const department = await this.departmentRepository.findById(departmentId);
      if (!department) {
        logger.warn('Department not found', { departmentId });
        return {
          success: false,
          error: 'Department not found',
          timestamp: new Date().toISOString(),
        };
      }

      const result = await this.employeeRepository.findByDepartmentId(
        departmentId,
        pagination
      );
      logger.info('Employees by department retrieved successfully', {
        departmentId,
        total: result.total,
        returned: result.employees.length,
      });
      return {
        success: true,
        data: result.employees,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get employees by department', {
        error: error instanceof Error ? error.message : 'Unknown error',
        departmentId,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get employees by department',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getAllEmployees(): Promise<ApiResponse<Employee[]>> {
    logger.info('Getting all employees');
    try {
      const employees = await this.employeeRepository.findAll();
      logger.info('All employees retrieved successfully', {
        count: employees.length,
      });
      return {
        success: true,
        data: employees,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get all employees', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get employees',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async updateEmployee(
    id: number,
    data: Partial<CreateEmployeeDto>
  ): Promise<ApiResponse<Employee>> {
    logger.info('Updating employee', { employeeId: id, updateData: data });
    try {
      const employee = await this.employeeRepository.findById(id);
      if (!employee) {
        logger.warn('Employee not found for update', { employeeId: id });
        return {
          success: false,
          error: 'Employee not found',
          timestamp: new Date().toISOString(),
        };
      }

      if (data.departmentId && data.departmentId !== employee.departmentId) {
        const department = await this.departmentRepository.findById(
          data.departmentId
        );
        if (!department) {
          logger.warn('Employee update failed - department not found', {
            employeeId: id,
            departmentId: data.departmentId,
          });
          return {
            success: false,
            error: 'Department not found',
            timestamp: new Date().toISOString(),
          };
        }
      }

      if (data.email && data.email !== employee.email) {
        const existingEmployee = await this.employeeRepository.findByEmail(
          data.email
        );
        if (existingEmployee) {
          logger.warn('Employee update failed - email already exists', {
            employeeId: id,
            newEmail: data.email,
          });
          return {
            success: false,
            error: 'Employee with this email already exists',
            timestamp: new Date().toISOString(),
          };
        }
      }

      const updatedEmployee = await this.employeeRepository.update(id, data);
      logger.info('Employee updated successfully', {
        employeeId: id,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
      });
      return {
        success: true,
        data: updatedEmployee,
        message: 'Employee updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to update employee', {
        error: error instanceof Error ? error.message : 'Unknown error',
        employeeId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update employee',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async deleteEmployee(id: number): Promise<ApiResponse<void>> {
    logger.info('Deleting employee', { employeeId: id });
    try {
      const employee = await this.employeeRepository.findById(id);
      if (!employee) {
        logger.warn('Employee not found for deletion', { employeeId: id });
        return {
          success: false,
          error: 'Employee not found',
          timestamp: new Date().toISOString(),
        };
      }

      await this.employeeRepository.delete(id);
      logger.info('Employee deleted successfully', {
        employeeId: id,
        name: employee.name,
        email: employee.email,
      });
      return {
        success: true,
        message: 'Employee deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to delete employee', {
        error: error instanceof Error ? error.message : 'Unknown error',
        employeeId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete employee',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
