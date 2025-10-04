import { UserServiceImpl } from '@/services/user.service';
import { UserRepositoryImpl } from '@/repositories/user.repository';
import { DepartmentRepositoryImpl } from '@/repositories/department.repository';
import { AuthServiceImpl } from '@/services/auth.service';
import { CacheServiceImpl } from '@/services/cache.service';
import { UserRole } from '@/types';
import {
  testDataSource,
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../setup';

describe('UserService', () => {
  let userService: UserServiceImpl;
  let userRepository: UserRepositoryImpl;
  let departmentRepository: DepartmentRepositoryImpl;
  let authService: AuthServiceImpl;
  let cacheService: CacheServiceImpl;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    userRepository = new UserRepositoryImpl(testDataSource);
    departmentRepository = new DepartmentRepositoryImpl(testDataSource);
    authService = new AuthServiceImpl();
    cacheService = new CacheServiceImpl();
    userService = new UserServiceImpl(
      userRepository,
      departmentRepository,
      authService,
      cacheService
    );
  });

  describe('createUser', () => {
    beforeEach(async () => {
      await departmentRepository.create({ name: 'Engineering' });
    });

    it('should create user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      };

      const result = await userService.createUser(userData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('John Doe');
      expect(result.data?.email).toBe('john@example.com');
      expect(result.data?.role).toBe(UserRole.EMPLOYEE);
      expect(result.data?.departmentId).toBe(1);
      expect(result.message).toBe('User created successfully');
    });

    it('should fail when department does not exist', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        departmentId: 999,
      };

      const result = await userService.createUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Department not found');
    });

    it('should fail when email already exists', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      };

      await userService.createUser(userData);
      const result = await userService.createUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with this email already exists');
    });

    it('should create user without department', async () => {
      const userData = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: UserRole.ADMIN,
      };

      const result = await userService.createUser(userData);

      expect(result.success).toBe(true);
      expect(result.data?.departmentId).toBeNull();
    });
  });

  describe('getUserById', () => {
    beforeEach(async () => {
      await departmentRepository.create({ name: 'Engineering' });
      await userRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      });
    });

    it('should return user when found', async () => {
      const result = await userService.getUserById(1);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(1);
      expect(result.data?.name).toBe('John Doe');
      expect(result.data?.email).toBe('john@example.com');
    });

    it('should return error when user not found', async () => {
      const result = await userService.getUserById(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('getUserWithLeaveHistory', () => {
    beforeEach(async () => {
      await departmentRepository.create({ name: 'Engineering' });
      await userRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      });
    });

    it('should return user with leave history', async () => {
      const result = await userService.getUserWithLeaveHistory(1);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(1);
      expect(result.data?.name).toBe('John Doe');
      expect(result.data?.leaveRequests).toBeDefined();
    });

    it('should return error when user not found', async () => {
      const result = await userService.getUserWithLeaveHistory(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('getUsersByDepartment', () => {
    beforeEach(async () => {
      await departmentRepository.create({ name: 'Engineering' });
      await departmentRepository.create({ name: 'HR' });

      await userRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      });
      await userRepository.create({
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'hashedpassword',
        role: UserRole.MANAGER,
        departmentId: 1,
      });
    });

    it('should return users by department with pagination', async () => {
      const result = await userService.getUsersByDepartment(1, {
        page: 1,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]?.departmentId).toBe(1);
      expect(result.data?.[1]?.departmentId).toBe(1);
    });

    it('should return empty array for department with no users', async () => {
      const result = await userService.getUsersByDepartment(2, {
        page: 1,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle pagination correctly', async () => {
      const result = await userService.getUsersByDepartment(1, {
        page: 1,
        limit: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('updateUser', () => {
    beforeEach(async () => {
      await departmentRepository.create({ name: 'Engineering' });
      await userRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      });
    });

    it('should update user successfully', async () => {
      const updateData = {
        name: 'John Updated',
        role: UserRole.MANAGER,
      };

      const result = await userService.updateUser(1, updateData);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('John Updated');
      expect(result.data?.role).toBe(UserRole.MANAGER);
      expect(result.message).toBe('User updated successfully');
    });

    it('should fail when updating non-existent user', async () => {
      const updateData = { name: 'Non-existent' };
      const result = await userService.updateUser(999, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('deleteUser', () => {
    beforeEach(async () => {
      await departmentRepository.create({ name: 'Engineering' });
      await userRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      });
    });

    it('should delete user successfully', async () => {
      const result = await userService.deleteUser(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User deleted successfully');
    });

    it('should fail when deleting non-existent user', async () => {
      const result = await userService.deleteUser(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await departmentRepository.create({ name: 'Engineering' });
      await userRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: await authService.hashPassword('password123'),
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      });
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'john@example.com',
        password: 'password123',
      };

      const result = await userService.login(loginData);

      expect(result.success).toBe(true);
      expect(result.data?.token).toBeDefined();
      expect(result.data?.user).toBeDefined();
      expect(result.data?.user.email).toBe('john@example.com');
    });

    it('should fail with invalid email', async () => {
      const loginData = {
        email: 'invalid@example.com',
        password: 'password123',
      };

      const result = await userService.login(loginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const loginData = {
        email: 'john@example.com',
        password: 'wrongpassword',
      };

      const result = await userService.login(loginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('validateToken', () => {
    beforeEach(async () => {
      await departmentRepository.create({ name: 'Engineering' });
      await userRepository.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: await authService.hashPassword('password123'),
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      });
    });

    it('should validate token successfully', async () => {
      const loginResult = await userService.login({
        email: 'john@example.com',
        password: 'password123',
      });

      const token = loginResult.data?.token;
      const result = await userService.validateToken(token!);

      expect(result.success).toBe(true);
      expect(result.data?.userId).toBe(1);
      expect(result.data?.email).toBe('john@example.com');
    });

    it('should fail with invalid token', async () => {
      const result = await userService.validateToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });
});
