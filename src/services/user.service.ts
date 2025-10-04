import { UserRepository } from '@/interfaces/user-repository.interface';
import { UserRepositoryImpl } from '@/repositories/user.repository';
import { DepartmentRepository } from '@/interfaces/repository.interfaces';
import { DepartmentRepositoryImpl } from '@/repositories/department.repository';
import { PaginationParams, ApiResponse, UserRole, SafeUser } from '@/types';
import {
  CreateUserDto,
  LoginDto,
  AuthResponse,
  UserService,
} from '@/interfaces/user.interface';
import { AuthServiceImpl } from '@/services/auth.service';
import { logger } from '@/services/logger.service';

export class UserServiceImpl implements UserService {
  private userRepository: UserRepository;
  private departmentRepository: DepartmentRepository;
  private authService: AuthServiceImpl;

  constructor(
    userRepository?: UserRepository,
    departmentRepository?: DepartmentRepository,
    authService?: AuthServiceImpl
  ) {
    this.userRepository = userRepository || new UserRepositoryImpl();
    this.departmentRepository =
      departmentRepository || new DepartmentRepositoryImpl();
    this.authService = authService || new AuthServiceImpl();
  }

  async createUser(data: CreateUserDto): Promise<ApiResponse<SafeUser>> {
    logger.info('Creating user', {
      name: data.name,
      email: data.email,
      role: data.role,
      departmentId: data.departmentId,
    });
    try {
      if (data.departmentId) {
        const department = await this.departmentRepository.findById(
          data.departmentId
        );
        if (!department) {
          logger.warn('User creation failed - department not found', {
            departmentId: data.departmentId,
          });
          return {
            success: false,
            error: 'Department not found',
            timestamp: new Date().toISOString(),
          };
        }
      }

      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        logger.warn('User creation failed - email already exists', {
          email: data.email,
        });
        return {
          success: false,
          error: 'User with this email already exists',
          timestamp: new Date().toISOString(),
        };
      }

      const hashedPassword = await this.authService.hashPassword(data.password);
      const user = await this.userRepository.create({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role as UserRole,
        departmentId: data.departmentId || null,
      });

      logger.info('User created successfully', {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
      return {
        success: true,
        data: user.toSafeObject(),
        message: 'User created successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to create user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: data.name,
        email: data.email,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getUserById(id: number): Promise<ApiResponse<SafeUser>> {
    logger.info('Getting user by ID', { userId: id });
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        logger.warn('User not found', { userId: id });
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        };
      }

      logger.info('User retrieved successfully', {
        userId: id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
      return {
        success: true,
        data: user.toSafeObject(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get user by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getUserWithLeaveHistory(id: number): Promise<ApiResponse<SafeUser>> {
    logger.info('Getting user with leave history', { userId: id });
    try {
      const user = await this.userRepository.findWithLeaveHistory(id);
      if (!user) {
        logger.warn('User not found', { userId: id });
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        };
      }

      logger.info('User with leave history retrieved successfully', {
        userId: id,
        name: user.name,
        leaveRequestCount: user.leaveRequests?.length || 0,
      });
      return {
        success: true,
        data: user.toSafeObject(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get user with leave history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: id,
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get user with leave history',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getUsersByDepartment(
    departmentId: number,
    pagination: PaginationParams
  ): Promise<ApiResponse<SafeUser[]>> {
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
        };
      }

      const result = await this.userRepository.findByDepartmentId(
        departmentId,
        pagination
      );
      logger.info('Users by department retrieved successfully', {
        departmentId,
        total: result.total,
        returned: result.users.length,
      });
      return {
        success: true,
        data: result.users.map((user) => user.toSafeObject()),
        timestamp: new Date().toISOString(),
      };
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
      };
    }
  }

  async getAllUsers(): Promise<ApiResponse<SafeUser[]>> {
    logger.info('Getting all users');
    try {
      const users = await this.userRepository.findAll();
      logger.info('All users retrieved successfully', {
        count: users.length,
      });
      return {
        success: true,
        data: users.map((user) => user.toSafeObject()),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get all users', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get users',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async updateUser(
    id: number,
    data: Partial<CreateUserDto>
  ): Promise<ApiResponse<SafeUser>> {
    logger.info('Updating user', { userId: id, updateData: data });
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        logger.warn('User not found for update', { userId: id });
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        };
      }

      if (data.departmentId && data.departmentId !== user.departmentId) {
        const department = await this.departmentRepository.findById(
          data.departmentId
        );
        if (!department) {
          logger.warn('User update failed - department not found', {
            userId: id,
            departmentId: data.departmentId,
          });
          return {
            success: false,
            error: 'Department not found',
            timestamp: new Date().toISOString(),
          };
        }
      }

      if (data.email && data.email !== user.email) {
        const existingUser = await this.userRepository.findByEmail(data.email);
        if (existingUser) {
          logger.warn('User update failed - email already exists', {
            userId: id,
            newEmail: data.email,
          });
          return {
            success: false,
            error: 'User with this email already exists',
            timestamp: new Date().toISOString(),
          };
        }
      }

      const updateData: any = { ...data };
      if (data.password) {
        updateData.password = await this.authService.hashPassword(
          data.password
        );
      }

      const updatedUser = await this.userRepository.update(id, updateData);
      logger.info('User updated successfully', {
        userId: id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      });
      return {
        success: true,
        data: updatedUser.toSafeObject(),
        message: 'User updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to update user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async deleteUser(id: number): Promise<ApiResponse<void>> {
    logger.info('Deleting user', { userId: id });
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        logger.warn('User not found for deletion', { userId: id });
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        };
      }

      await this.userRepository.delete(id);
      logger.info('User deleted successfully', {
        userId: id,
        name: user.name,
        email: user.email,
      });
      return {
        success: true,
        message: 'User deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to delete user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: id,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async login(data: LoginDto): Promise<ApiResponse<AuthResponse>> {
    logger.info('User login attempt', { email: data.email });
    try {
      const user = await this.userRepository.findByEmail(data.email);
      if (!user) {
        logger.warn('Login failed - user not found', { email: data.email });
        return {
          success: false,
          error: 'Invalid credentials',
          timestamp: new Date().toISOString(),
        };
      }

      const isValidPassword = await this.authService.comparePassword(
        data.password,
        user.password
      );
      if (!isValidPassword) {
        logger.warn('Login failed - invalid password', { email: data.email });
        return {
          success: false,
          error: 'Invalid credentials',
          timestamp: new Date().toISOString(),
        };
      }

      const token = this.authService.generateToken(user.id, user.role);
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const authResponse: AuthResponse = {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId || undefined,
        },
      };

      return {
        success: true,
        data: authResponse,
        message: 'Login successful',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Login failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: data.email,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async validateToken(token: string): Promise<ApiResponse<any>> {
    try {
      const decoded = this.authService.verifyToken(token);
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        return {
          success: false,
          error: 'Invalid token',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: {
          userId: user.id,
          role: user.role,
          email: user.email,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid token',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
