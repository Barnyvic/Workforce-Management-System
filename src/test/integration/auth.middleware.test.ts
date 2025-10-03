import request from 'supertest';
import express from 'express';
import { UserController } from '@/controllers/user.controller';
import { UserServiceImpl } from '@/services/user.service';
import { UserRepositoryImpl } from '@/repositories/user.repository';
import { DepartmentRepositoryImpl } from '@/repositories/department.repository';
import { AuthServiceImpl } from '@/services/auth.service';

import { errorHandler } from '@/middleware/error.middleware';
import {
  authenticateToken,
  requireAdmin,
  requireManagerOrAdmin,
  AuthenticatedRequest,
} from '@/middleware/auth.middleware';
import { UserRole } from '@/types';
import {
  testDataSource,
  setupTestDatabase,
  teardownTestDatabase,
} from '../setup';

describe('Authentication Middleware Integration Tests', () => {
  let app: express.Application;
  let adminToken: string;
  let employeeToken: string;
  let managerToken: string;
  let expiredToken: string;
  let invalidToken: string;

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
    const authService = new AuthServiceImpl();
    const userService = new UserServiceImpl(
      userRepository,
      departmentRepository,
      authService
    );
    const userController = new UserController(userService);

    // Create test department
    await departmentRepository.create({ name: 'Engineering' });

    // Create test users
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
      departmentId: 1,
    });

    // Generate tokens
    adminToken = authService.generateToken(adminUser.id, UserRole.ADMIN);
    employeeToken = authService.generateToken(
      employeeUser.id,
      UserRole.EMPLOYEE
    );
    managerToken = authService.generateToken(managerUser.id, UserRole.MANAGER);

    // Generate expired token (simulate by creating with very short expiry)
    const originalExpiresIn = process.env['JWT_EXPIRES_IN'];
    process.env['JWT_EXPIRES_IN'] = '1'; // 1 second
    expiredToken = authService.generateToken(adminUser.id, UserRole.ADMIN);
    if (originalExpiresIn) {
      process.env['JWT_EXPIRES_IN'] = originalExpiresIn;
    }

    invalidToken = 'invalid.jwt.token';

    // Setup test routes with different middleware combinations
    app.get(
      '/protected',
      authenticateToken,
      (req: AuthenticatedRequest, res) => {
        res.json({ success: true, message: 'Access granted', user: req.user });
      }
    );

    app.get('/admin-only', requireAdmin, (req: AuthenticatedRequest, res) => {
      res.json({
        success: true,
        message: 'Admin access granted',
        user: req.user,
      });
    });

    app.get(
      '/manager-or-admin',
      requireManagerOrAdmin,
      (req: AuthenticatedRequest, res) => {
        res.json({
          success: true,
          message: 'Manager/Admin access granted',
          user: req.user,
        });
      }
    );

    app.get('/public', (_req, res) => {
      res.json({ success: true, message: 'Public access granted' });
    });

    app.get('/users', authenticateToken, userController.getAllUsers);
    app.post('/users', requireAdmin, userController.createUser);
    app.delete('/users/:id', requireAdmin, userController.deleteUser);

    app.use(errorHandler);
  });

  describe('authenticateToken middleware', () => {
    it('should allow access with valid admin token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Access granted');
      expect(response.body.user.role).toBe(UserRole.ADMIN);
    });

    it('should allow access with valid employee token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Access granted');
      expect(response.body.user.role).toBe(UserRole.EMPLOYEE);
    });

    it('should allow access with valid manager token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Access granted');
      expect(response.body.user.role).toBe(UserRole.MANAGER);
    });

    it('should return 401 without Authorization header', async () => {
      const response = await request(app).get('/protected').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should return 401 with invalid token format', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 401 with expired token', async () => {
      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 401 with malformed Bearer token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should return 401 with empty Bearer token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('requireAdmin middleware', () => {
    it('should allow admin access', async () => {
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Admin access granted');
      expect(response.body.user.role).toBe(UserRole.ADMIN);
    });

    it('should deny employee access', async () => {
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should deny manager access', async () => {
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/admin-only').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should work with user creation endpoint', async () => {
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
      expect(response.body.message).toBe('User created successfully');
    });

    it('should deny user creation for non-admin', async () => {
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
  });

  describe('requireManagerOrAdmin middleware', () => {
    it('should allow admin access', async () => {
      const response = await request(app)
        .get('/manager-or-admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Manager/Admin access granted');
      expect(response.body.user.role).toBe(UserRole.ADMIN);
    });

    it('should allow manager access', async () => {
      const response = await request(app)
        .get('/manager-or-admin')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Manager/Admin access granted');
      expect(response.body.user.role).toBe(UserRole.MANAGER);
    });

    it('should deny employee access', async () => {
      const response = await request(app)
        .get('/manager-or-admin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Manager or Admin access required');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/manager-or-admin').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('Middleware chain behavior', () => {
    it('should execute middleware in correct order', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should fail authentication before role check', async () => {
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should pass authentication but fail role check', async () => {
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('Token validation edge cases', () => {
    it('should handle tokens with extra whitespace', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer  ${adminToken}  `)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle case-insensitive Authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle mixed case Authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('AUTHORIZATION', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Public endpoints', () => {
    it('should allow access to public endpoints without authentication', async () => {
      const response = await request(app).get('/public').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Public access granted');
    });

    it('should allow access to public endpoints with authentication', async () => {
      const response = await request(app)
        .get('/public')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Public access granted');
    });
  });

  describe('Error handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Mock a middleware error
      const originalAuthenticateToken =
        require('@/middleware/auth.middleware').authenticateToken;
      const mockAuthenticateToken = jest.fn().mockImplementation(() => {
        throw new Error('Middleware error');
      });

      require('@/middleware/auth.middleware').authenticateToken =
        mockAuthenticateToken;

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Middleware error');

      // Restore original function
      require('@/middleware/auth.middleware').authenticateToken =
        originalAuthenticateToken;
    });
  });

  describe('Performance and security', () => {
    it('should respond quickly to authentication checks', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100);
      expect(response.body.success).toBe(true);
    });

    it('should not expose sensitive user information in error messages', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('secret');
    });
  });
});
