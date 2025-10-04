import { Department } from '@/entities/department.entity';
import { DepartmentRepository } from '@/interfaces/repository.interfaces';
import { DepartmentRepositoryImpl } from '@/repositories/department.repository';
import {
  PaginationParams,
  ApiResponse,
  PaginatedResponse,
  SafeDepartment,
} from '@/types';
import {
  CreateDepartmentDto,
  DepartmentService,
} from '@/interfaces/department.interface';
import { CacheService } from '@/interfaces/cache.interface';
import { CacheServiceImpl } from '@/services/cache.service';
import { logger } from '@/services/logger.service';
import { createPaginatedResponse } from '@/utils/pagination.util';

export class DepartmentServiceImpl implements DepartmentService {
  private departmentRepository: DepartmentRepository;
  private cacheService: CacheService;

  constructor(
    departmentRepository?: DepartmentRepository,
    cacheService?: CacheService
  ) {
    this.departmentRepository =
      departmentRepository || new DepartmentRepositoryImpl();
    this.cacheService = cacheService || new CacheServiceImpl();
  }

  async createDepartment(
    data: CreateDepartmentDto
  ): Promise<ApiResponse<Department>> {
    logger.info('Creating department', { name: data.name });
    try {
      const existingDepartment = await this.departmentRepository.findByName(
        data.name
      );
      if (existingDepartment) {
        logger.warn('Department creation failed - name already exists', {
          name: data.name,
        });
        return {
          success: false,
          error: 'Department with this name already exists',
          timestamp: new Date().toISOString(),
        };
      }

      const department = await this.departmentRepository.create({
        name: data.name,
      });

      logger.info('Department created successfully', {
        departmentId: department.id,
        name: department.name,
      });
      return {
        success: true,
        data: department,
        message: 'Department created successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to create department', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: data.name,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create department',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getDepartmentById(id: number): Promise<ApiResponse<Department>> {
    logger.info('Getting department by ID', { departmentId: id });
    try {
      const department = await this.departmentRepository.findById(id);
      if (!department) {
        logger.warn('Department not found', { departmentId: id });
        return {
          success: false,
          error: 'Department not found',
          timestamp: new Date().toISOString(),
        };
      }

      logger.info('Department retrieved successfully', {
        departmentId: id,
        name: department.name,
      });
      return {
        success: true,
        data: department,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get department by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        departmentId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get department',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getDepartmentWithUsers(
    id: number
  ): Promise<ApiResponse<SafeDepartment>> {
    logger.info('Getting department with users', { departmentId: id });
    try {
      const department = await this.departmentRepository.findWithUsers(id);
      if (!department) {
        logger.warn('Department not found', { departmentId: id });
        return {
          success: false,
          error: 'Department not found',
          timestamp: new Date().toISOString(),
        };
      }

      const safeDepartment: SafeDepartment = {
        id: department.id,
        name: department.name,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
        users: department.users?.map((user) => user.toSafeObject()) || [],
      };

      logger.info('Department with users retrieved successfully', {
        departmentId: id,
        name: department.name,
        userCount: department.users?.length || 0,
      });

      return {
        success: true,
        data: safeDepartment,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get department with users', {
        error: error instanceof Error ? error.message : 'Unknown error',
        departmentId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get department with users',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getUsersByDepartment(
    departmentId: number,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<SafeDepartment>> {
    logger.info('Getting users by department', {
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
          data: [],
          pagination: {
            total: 0,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      }

      const result = await this.departmentRepository.findUsersByDepartment(
        departmentId,
        pagination
      );

      const safeDepartments: SafeDepartment[] = result.departments.map(
        (dept) => ({
          id: dept.id,
          name: dept.name,
          createdAt: dept.createdAt,
          updatedAt: dept.updatedAt,
          users: dept.users?.map((user) => user.toSafeObject()) || [],
        })
      );

      logger.info('Users by department retrieved successfully', {
        departmentId,
        total: result.total,
        returned: result.departments.length,
      });
      return createPaginatedResponse(safeDepartments, pagination, result.total);
    } catch (error) {
      logger.error('Failed to get users by department', {
        error: error instanceof Error ? error.message : 'Unknown error',
        departmentId,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get users by department',
        timestamp: new Date().toISOString(),
        data: [],
        pagination: {
          total: 0,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
  }

  async getAllDepartments(
    pagination?: PaginationParams
  ): Promise<ApiResponse<Department[]> | PaginatedResponse<Department>> {
    logger.info('Getting all departments', { pagination });

    const cacheKey = pagination
      ? `departments:all:page:${pagination.page}:limit:${pagination.limit}`
      : 'departments:all';

    try {
      const cached = await this.cacheService.get<string>(cacheKey);
      if (cached) {
        logger.info('Departments retrieved from cache', { cacheKey });
        return JSON.parse(cached);
      }

      if (pagination) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;

        const [departments, total] = await Promise.all([
          this.departmentRepository.findAll({
            skip,
            take: limit,
            order: { createdAt: 'DESC' },
          }),
          this.departmentRepository.count(),
        ]);

        const result = createPaginatedResponse(departments, pagination, total);

        await this.cacheService.set(cacheKey, JSON.stringify(result), 300);

        logger.info('All departments retrieved successfully with pagination', {
          count: departments.length,
          total,
          pagination,
        });

        return result;
      } else {
        const departments = await this.departmentRepository.findAll({
          order: { createdAt: 'DESC' },
        });

        const result = {
          success: true,
          data: departments,
          timestamp: new Date().toISOString(),
        };

        await this.cacheService.set(cacheKey, JSON.stringify(result), 300);

        logger.info('All departments retrieved successfully', {
          count: departments.length,
        });

        return result;
      }
    } catch (error) {
      logger.error('Failed to get all departments', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get departments',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async updateDepartment(
    id: number,
    data: Partial<CreateDepartmentDto>
  ): Promise<ApiResponse<Department>> {
    logger.info('Updating department', { departmentId: id, updateData: data });
    try {
      const department = await this.departmentRepository.findById(id);
      if (!department) {
        logger.warn('Department not found for update', { departmentId: id });
        return {
          success: false,
          error: 'Department not found',
          timestamp: new Date().toISOString(),
        };
      }

      if (data.name && data.name !== department.name) {
        const existingDepartment = await this.departmentRepository.findByName(
          data.name
        );
        if (existingDepartment) {
          logger.warn('Department update failed - name already exists', {
            departmentId: id,
            newName: data.name,
          });
          return {
            success: false,
            error: 'Department with this name already exists',
            timestamp: new Date().toISOString(),
          };
        }
      }

      const updatedDepartment = await this.departmentRepository.update(
        id,
        data
      );
      logger.info('Department updated successfully', {
        departmentId: id,
        name: updatedDepartment.name,
      });
      return {
        success: true,
        data: updatedDepartment,
        message: 'Department updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to update department', {
        error: error instanceof Error ? error.message : 'Unknown error',
        departmentId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update department',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async deleteDepartment(id: number): Promise<ApiResponse<void>> {
    logger.info('Deleting department', { departmentId: id });
    try {
      const department = await this.departmentRepository.findById(id);
      if (!department) {
        logger.warn('Department not found for deletion', { departmentId: id });
        return {
          success: false,
          error: 'Department not found',
          timestamp: new Date().toISOString(),
        };
      }

      await this.departmentRepository.delete(id);
      logger.info('Department deleted successfully', {
        departmentId: id,
        name: department.name,
      });
      return {
        success: true,
        message: 'Department deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to delete department', {
        error: error instanceof Error ? error.message : 'Unknown error',
        departmentId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete department',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
