import { DepartmentServiceImpl } from '@/services/department.service';
import { DepartmentRepositoryImpl } from '@/repositories/department.repository';
import { CacheServiceImpl } from '@/services/cache.service';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDataSource,
  clearTestDatabase,
} from '../setup';

describe('DepartmentService', () => {
  let departmentService: DepartmentServiceImpl;
  let departmentRepository: DepartmentRepositoryImpl;
  let cacheService: CacheServiceImpl;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    departmentRepository = new DepartmentRepositoryImpl(testDataSource);
    cacheService = new CacheServiceImpl();
    departmentService = new DepartmentServiceImpl(
      departmentRepository,
      cacheService
    );
  });

  describe('createDepartment', () => {
    it('should create a department successfully', async () => {
      const departmentData = { name: 'Engineering' };
      const result = await departmentService.createDepartment(departmentData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Engineering');
      expect(result.message).toBe('Department created successfully');
    });

    it('should fail when creating department with duplicate name', async () => {
      const departmentData = { name: 'Engineering' };

      await departmentService.createDepartment(departmentData);

      const result = await departmentService.createDepartment(departmentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Department with this name already exists');
    });

    it('should create department with empty name (validation handled at API level)', async () => {
      const departmentData = { name: '' };
      const result = await departmentService.createDepartment(departmentData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('');
    });
  });

  describe('getDepartmentById', () => {
    it('should return department when found', async () => {
      const departmentData = { name: 'HR' };
      const createResult =
        await departmentService.createDepartment(departmentData);
      const departmentId = createResult.data?.id;

      const result = await departmentService.getDepartmentById(departmentId!);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(departmentId);
      expect(result.data?.name).toBe('HR');
    });

    it('should return error when department not found', async () => {
      const result = await departmentService.getDepartmentById(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Department not found');
    });
  });

  describe('updateDepartment', () => {
    it('should update department successfully', async () => {
      const departmentData = { name: 'Marketing' };
      const createResult =
        await departmentService.createDepartment(departmentData);
      const departmentId = createResult.data?.id;

      const updateData = { name: 'Updated Marketing' };
      const result = await departmentService.updateDepartment(
        departmentId!,
        updateData
      );

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Marketing');
      expect(result.message).toBe('Department updated successfully');
    });

    it('should fail when updating non-existent department', async () => {
      const updateData = { name: 'Non-existent' };
      const result = await departmentService.updateDepartment(999, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Department not found');
    });
  });

  describe('deleteDepartment', () => {
    it('should delete department successfully', async () => {
      const departmentData = { name: 'Finance' };
      const createResult =
        await departmentService.createDepartment(departmentData);
      const departmentId = createResult.data?.id;

      const result = await departmentService.deleteDepartment(departmentId!);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Department deleted successfully');
    });

    it('should fail when deleting non-existent department', async () => {
      const result = await departmentService.deleteDepartment(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Department not found');
    });
  });
});
