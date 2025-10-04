import request from 'supertest';
import express from 'express';
import { DepartmentController } from '@/controllers/department.controller';
import { ServiceContainer } from '@/container/service-container';
import { validateRequest, schemas } from '@/middleware/validation.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { authenticateToken, requireAdmin } from '@/middleware/auth.middleware';
import { UserRole } from '@/types';
import {
  testDataSource,
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
  MockCacheService,
} from '../setup';

describe('Department API Integration Tests', () => {
  jest.setTimeout(30000); // 30 second timeout for all tests
  let app: express.Application;
  let serviceContainer: ServiceContainer;
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
    await clearTestDatabase();

    // Reset and configure service container for tests
    ServiceContainer.reset();
    serviceContainer = ServiceContainer.getInstance(testDataSource);

    // Use mock cache service to avoid Redis connection issues
    const mockCacheService = new MockCacheService();
    serviceContainer.setCacheService(mockCacheService);

    app = express();
    app.use(express.json());

    const departmentController = new DepartmentController(
      serviceContainer.cacheService,
      serviceContainer.departmentService
    );

    // Create test departments
    await serviceContainer.departmentRepository.create({ name: 'Engineering' });
    await serviceContainer.departmentRepository.create({ name: 'HR' });
    await serviceContainer.departmentRepository.create({ name: 'Management' });

    // Create test users
    const adminUser = await serviceContainer.userRepository.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: await serviceContainer.authService.hashPassword('admin123'),
      role: UserRole.ADMIN,
      departmentId: 1,
    });

    const employeeUser = await serviceContainer.userRepository.create({
      name: 'Employee User',
      email: 'employee@test.com',
      password: await serviceContainer.authService.hashPassword('employee123'),
      role: UserRole.EMPLOYEE,
      departmentId: 1,
    });

    const managerUser = await serviceContainer.userRepository.create({
      name: 'Manager User',
      email: 'manager@test.com',
      password: await serviceContainer.authService.hashPassword('manager123'),
      role: UserRole.MANAGER,
      departmentId: 2,
    });

    // Generate tokens
    adminToken = serviceContainer.authService.generateToken(
      adminUser.id,
      UserRole.ADMIN,
      adminUser.email,
      adminUser.name
    );
    employeeToken = serviceContainer.authService.generateToken(
      employeeUser.id,
      UserRole.EMPLOYEE,
      employeeUser.email,
      employeeUser.name
    );
    managerToken = serviceContainer.authService.generateToken(
      managerUser.id,
      UserRole.MANAGER,
      managerUser.email,
      managerUser.name
    );

    // Setup routes
    app.post(
      '/departments',
      validateRequest({ body: schemas.createDepartment }),
      authenticateToken,
      requireAdmin,
      departmentController.createDepartment
    );

    app.get(
      '/departments/:id',
      validateRequest({ params: schemas.idParam }),
      authenticateToken,
      departmentController.getDepartmentById
    );

    app.get(
      '/departments/:id/users',
      validateRequest({
        params: schemas.idParam,
        query: schemas.paginationQuery,
      }),
      authenticateToken,
      departmentController.getUsersByDepartment
    );

    app.get(
      '/departments/:id/users-with-department',
      validateRequest({ params: schemas.idParam }),
      authenticateToken,
      departmentController.getDepartmentWithUsers
    );

    app.get(
      '/departments',
      authenticateToken,
      departmentController.getAllDepartments
    );

    app.put(
      '/departments/:id',
      validateRequest({
        params: schemas.idParam,
        body: schemas.createDepartment,
      }),
      authenticateToken,
      requireAdmin,
      departmentController.updateDepartment
    );

    app.delete(
      '/departments/:id',
      validateRequest({ params: schemas.idParam }),
      authenticateToken,
      requireAdmin,
      departmentController.deleteDepartment
    );

    app.use(errorHandler);
  });

  describe('POST /departments', () => {
    it('should create a department successfully as admin', async () => {
      const departmentData = { name: 'Sales' };

      const response = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(departmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Sales');
      expect(response.body.message).toBe('Department created successfully');
    });

    it('should return 403 when non-admin tries to create department', async () => {
      const departmentData = { name: 'Sales' };

      const response = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(departmentData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 401 without authentication', async () => {
      const departmentData = { name: 'Sales' };

      const response = await request(app)
        .post('/departments')
        .send(departmentData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = { name: '' };

      const response = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 400 for duplicate department name', async () => {
      const departmentData = { name: 'Finance' };

      // Create first department
      await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(departmentData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(departmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe(
        'Department with this name already exists'
      );
    });
  });

  describe('GET /departments/:id', () => {
    it('should return department when found', async () => {
      const response = await request(app)
        .get('/departments/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.name).toBe('Engineering');
    });

    it('should return 404 when department not found', async () => {
      const response = await request(app)
        .get('/departments/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Department not found');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .get('/departments/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/departments/1').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('GET /departments/:id/users', () => {
    it('should return users by department with pagination', async () => {
      const response = await request(app)
        .get('/departments/1/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1); // Returns 1 department
      expect(response.body.data[0].id).toBe(1);
      expect(response.body.data[0].users).toHaveLength(2); // Department has 2 users
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

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/departments/1/users')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('GET /departments/:id/users-with-department', () => {
    it('should return department with users', async () => {
      const response = await request(app)
        .get('/departments/1/users-with-department')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.name).toBe('Engineering');
      expect(response.body.data.users).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    it('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .get('/departments/999/users-with-department')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Department not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/departments/1/users-with-department')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('GET /departments', () => {
    it('should return all departments', async () => {
      const response = await request(app)
        .get('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].name).toBeDefined();
      expect(response.body.data[1].name).toBeDefined();
      expect(response.body.data[2].name).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/departments').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('PUT /departments/:id', () => {
    it('should update department successfully as admin', async () => {
      const response = await request(app)
        .put('/departments/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Engineering' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Engineering');
      expect(response.body.message).toBe('Department updated successfully');
    });

    it('should return 403 when non-admin tries to update department', async () => {
      const response = await request(app)
        .put('/departments/1')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Updated Engineering' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 404 when updating non-existent department', async () => {
      const response = await request(app)
        .put('/departments/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Non-existent' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Department not found');
    });

    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .put('/departments/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/departments/1')
        .send({ name: 'Updated Engineering' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('DELETE /departments/:id', () => {
    it('should delete department successfully as admin', async () => {
      const response = await request(app)
        .delete('/departments/3')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Department deleted successfully');
    });

    it('should return 403 when non-admin tries to delete department', async () => {
      const response = await request(app)
        .delete('/departments/3')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 404 when deleting non-existent department', async () => {
      const response = await request(app)
        .delete('/departments/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Department not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).delete('/departments/3').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('Role-based access control', () => {
    it('should allow admin to access all department endpoints', async () => {
      const response = await request(app)
        .get('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow employee to view departments', async () => {
      const response = await request(app)
        .get('/departments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow manager to view departments', async () => {
      const response = await request(app)
        .get('/departments')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
