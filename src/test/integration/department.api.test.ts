import request from 'supertest';
import express from 'express';
import { DepartmentController } from '@/controllers/department.controller';
import { DepartmentServiceImpl } from '@/services/department.service';
import { DepartmentRepositoryImpl } from '@/repositories/department.repository';
import { validateRequest, schemas } from '@/middleware/validation.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { testDataSource, setupTestDatabase, teardownTestDatabase } from '../../setup';

describe('Department API Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up database
    await testDataSource.synchronize();

    // Create test app
    app = express();
    app.use(express.json());

    // Initialize services and controllers
    const departmentRepository = new DepartmentRepositoryImpl();
    const departmentService = new DepartmentServiceImpl(departmentRepository);
    const departmentController = new DepartmentController(departmentService);

    // Setup routes
    app.post(
      '/departments',
      validateRequest({ body: schemas.createDepartment }),
      departmentController.createDepartment
    );

    app.get(
      '/departments/:id',
      validateRequest({ params: schemas.idParam }),
      departmentController.getDepartmentById
    );

    app.get('/departments', departmentController.getAllDepartments);

    app.put(
      '/departments/:id',
      validateRequest({ 
        params: schemas.idParam,
        body: schemas.createDepartment 
      }),
      departmentController.updateDepartment
    );

    app.delete(
      '/departments/:id',
      validateRequest({ params: schemas.idParam }),
      departmentController.deleteDepartment
    );

    app.use(errorHandler);
  });

  describe('POST /departments', () => {
    it('should create a department successfully', async () => {
      const departmentData = { name: 'Engineering' };

      const response = await request(app)
        .post('/departments')
        .send(departmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Engineering');
      expect(response.body.message).toBe('Department created successfully');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = { name: '' };

      const response = await request(app)
        .post('/departments')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 400 for duplicate department name', async () => {
      const departmentData = { name: 'HR' };

      // Create first department
      await request(app)
        .post('/departments')
        .send(departmentData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/departments')
        .send(departmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Department with this name already exists');
    });
  });

  describe('GET /departments/:id', () => {
    it('should return department when found', async () => {
      // Create department first
      const createResponse = await request(app)
        .post('/departments')
        .send({ name: 'Marketing' })
        .expect(201);

      const departmentId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/departments/${departmentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(departmentId);
      expect(response.body.data.name).toBe('Marketing');
    });

    it('should return 404 when department not found', async () => {
      const response = await request(app)
        .get('/departments/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Department not found');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .get('/departments/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('GET /departments', () => {
    it('should return all departments', async () => {
      // Create test departments
      await request(app)
        .post('/departments')
        .send({ name: 'Engineering' })
        .expect(201);

      await request(app)
        .post('/departments')
        .send({ name: 'HR' })
        .expect(201);

      const response = await request(app)
        .get('/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBeDefined();
      expect(response.body.data[1].name).toBeDefined();
    });
  });

  describe('PUT /departments/:id', () => {
    it('should update department successfully', async () => {
      // Create department first
      const createResponse = await request(app)
        .post('/departments')
        .send({ name: 'Sales' })
        .expect(201);

      const departmentId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/departments/${departmentId}`)
        .send({ name: 'Updated Sales' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Sales');
      expect(response.body.message).toBe('Department updated successfully');
    });

    it('should return 404 when updating non-existent department', async () => {
      const response = await request(app)
        .put('/departments/999')
        .send({ name: 'Non-existent' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Department not found');
    });
  });

  describe('DELETE /departments/:id', () => {
    it('should delete department successfully', async () => {
      // Create department first
      const createResponse = await request(app)
        .post('/departments')
        .send({ name: 'Finance' })
        .expect(201);

      const departmentId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/departments/${departmentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Department deleted successfully');
    });

    it('should return 404 when deleting non-existent department', async () => {
      const response = await request(app)
        .delete('/departments/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Department not found');
    });
  });
});
