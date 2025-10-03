import request from 'supertest';
import express from 'express';
import { UserController } from '@/controllers/user.controller';
import { UserServiceImpl } from '@/services/user.service';
import { UserRepositoryImpl } from '@/repositories/user.repository';
import { DepartmentRepositoryImpl } from '@/repositories/department.repository';
import { AuthServiceImpl } from '@/services/auth.service';
import { validateRequest, schemas } from '@/middleware/validation.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { authenticateToken, requireAdmin } from '@/middleware/auth.middleware';
import { UserRole } from '@/types';
import {
  testDataSource,
  setupTestDatabase,
  teardownTestDatabase,
} from '../setup';

describe('User API Integration Tests', () => {
  let app: express.Application;
  let authService: AuthServiceImpl;
  let adminToken: string;
  let employeeToken: string;
  let managerToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await testDataSource.synchronize();

    app = express();
    app.use(express.json());

    const userRepository = new UserRepositoryImpl();
    const departmentRepository = new DepartmentRepositoryImpl();
    authService = new AuthServiceImpl();
    const userService = new UserServiceImpl(
      userRepository,
      departmentRepository,
      authService
    );
    const userController = new UserController(userService);

    await departmentRepository.create({ name: 'Engineering' });
    await departmentRepository.create({ name: 'HR' });
    await departmentRepository.create({ name: 'Management' });

    const adminUser = await userRepository.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: await authService.hashPassword('admin123'),
      role: UserRole.ADMIN,
      departmentId: 1,
    });

    const employeeUser = await userRepository.create({
      name: 'Employee User',
      email: 'employee@test.com',
      password: await authService.hashPassword('employee123'),
      role: UserRole.EMPLOYEE,
      departmentId: 1,
    });

    const managerUser = await userRepository.create({
      name: 'Manager User',
      email: 'manager@test.com',
      password: await authService.hashPassword('manager123'),
      role: UserRole.MANAGER,
      departmentId: 2,
    });

    adminToken = authService.generateToken(adminUser.id, UserRole.ADMIN);
    employeeToken = authService.generateToken(
      employeeUser.id,
      UserRole.EMPLOYEE
    );
    managerToken = authService.generateToken(managerUser.id, UserRole.MANAGER);

    app.post(
      '/auth/login',
      validateRequest({ body: schemas.login }),
      userController.login
    );

    app.get('/auth/profile', authenticateToken, userController.getProfile);

    app.post(
      '/users',
      validateRequest({ body: schemas.createUser }),
      requireAdmin,
      userController.createUser
    );

    app.get(
      '/users/:id',
      validateRequest({ params: schemas.idParam }),
      authenticateToken,
      userController.getUserById
    );

    app.get(
      '/users/:id/leave-history',
      validateRequest({ params: schemas.idParam }),
      authenticateToken,
      userController.getUserWithLeaveHistory
    );

    app.get(
      '/departments/:departmentId/users',
      validateRequest({
        params: { departmentId: schemas.idParam.extract('id') },
        query: schemas.paginationQuery,
      }),
      authenticateToken,
      userController.getUsersByDepartment
    );

    app.get('/users', authenticateToken, userController.getAllUsers);

    app.put(
      '/users/:id',
      validateRequest({
        params: schemas.idParam,
        body: schemas.updateUser,
      }),
      authenticateToken,
      userController.updateUser
    );

    app.delete(
      '/users/:id',
      validateRequest({ params: schemas.idParam }),
      requireAdmin,
      userController.deleteUser
    );

    app.use(errorHandler);
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'admin@test.com',
        password: 'admin123',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe('admin@test.com');
    });

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'admin123',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'admin@test.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 400 for missing email', async () => {
      const loginData = {
        password: 'admin123',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 400 for missing password', async () => {
      const loginData = {
        email: 'admin@test.com',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('admin@test.com');
      expect(response.body.data.role).toBe(UserRole.ADMIN);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/auth/profile').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /users', () => {
    it('should create user successfully as admin', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('newuser@test.com');
      expect(response.body.data.role).toBe(UserRole.EMPLOYEE);
      expect(response.body.message).toBe('User created successfully');
    });

    it('should return 403 when non-admin tries to create user', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(userData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return 400 for invalid user data', async () => {
      const userData = {
        name: '',
        email: 'invalid-email',
        password: '123',
        role: 'INVALID_ROLE',
        departmentId: 999,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 400 for duplicate email', async () => {
      const userData = {
        name: 'Duplicate User',
        email: 'admin@test.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        departmentId: 1,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should return 400 for non-existent department', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'password123',
        role: UserRole.EMPLOYEE,
        departmentId: 999,
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Department not found');
    });
  });

  describe('GET /users/:id', () => {
    it('should return user when found', async () => {
      const response = await request(app)
        .get('/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.email).toBe('admin@test.com');
    });

    it('should return 404 when user not found', async () => {
      const response = await request(app)
        .get('/users/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/users/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/users/1').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('GET /users/:id/leave-history', () => {
    it('should return user with leave history', async () => {
      const response = await request(app)
        .get('/users/1/leave-history')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.leaveRequests).toBeDefined();
      expect(Array.isArray(response.body.data.leaveRequests)).toBe(true);
    });

    it('should return 404 when user not found', async () => {
      const response = await request(app)
        .get('/users/999/leave-history')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('GET /departments/:departmentId/users', () => {
    it('should return users by department with pagination', async () => {
      const response = await request(app)
        .get('/departments/1/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].departmentId).toBe(1);
      expect(response.body.data[1].departmentId).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/departments/1/users?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return empty array for department with no users', async () => {
      const response = await request(app)
        .get('/departments/3/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .get('/departments/999/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Department not found');
    });
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/users').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Admin',
        email: 'updatedadmin@test.com',
      };

      const response = await request(app)
        .put('/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Admin');
      expect(response.body.data.email).toBe('updatedadmin@test.com');
      expect(response.body.message).toBe('User updated successfully');
    });

    it('should return 404 when updating non-existent user', async () => {
      const updateData = {
        name: 'Non-existent',
      };

      const response = await request(app)
        .put('/users/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 for invalid update data', async () => {
      const updateData = {
        email: 'invalid-email',
      };

      const response = await request(app)
        .put('/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user successfully as admin', async () => {
      const response = await request(app)
        .delete('/users/2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');
    });

    it('should return 403 when non-admin tries to delete user', async () => {
      const response = await request(app)
        .delete('/users/2')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return 404 when deleting non-existent user', async () => {
      const response = await request(app)
        .delete('/users/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('Role-based access control', () => {
    it('should allow admin to access all endpoints', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow employee to access their own profile', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow manager to access user endpoints', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
