import { Repository, FindManyOptions, DataSource } from 'typeorm';
import { Department } from '@/entities/department.entity';
import { PaginationParams } from '@/types';
import { dataSource } from '@/config/database';
import { DepartmentRepository } from '@/interfaces/repository.interfaces';

export class DepartmentRepositoryImpl implements DepartmentRepository {
  private repository: Repository<Department>;

  constructor(customDataSource?: DataSource) {
    const ds = customDataSource || dataSource;
    this.repository = ds.getRepository(Department);
  }

  async findById(id: number): Promise<Department | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Department | null> {
    return this.repository.findOne({ where: { name } });
  }

  async findAll(
    options: FindManyOptions<Department> = {}
  ): Promise<Department[]> {
    return this.repository.find(options);
  }

  async findWithUsers(
    id: number,
    pagination?: PaginationParams
  ): Promise<Department | null> {
    if (pagination) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const departments = await this.repository.find({
        where: { id },
        relations: ['users'],
        skip,
        take: limit,
      });

      return departments[0] || null;
    }

    return this.repository.findOne({
      where: { id },
      relations: ['users'],
    });
  }

  async findUsersByDepartment(
    departmentId: number,
    _pagination: PaginationParams
  ): Promise<{ departments: Department[]; total: number }> {
    // Find the specific department with its users
    const department = await this.repository.findOne({
      where: { id: departmentId },
      relations: ['users'],
    });

    if (!department) {
      return { departments: [], total: 0 };
    }

    // Return the department with all users (pagination can be applied later if needed)
    return { departments: [department], total: 1 };
  }

  async create(data: Partial<Department>): Promise<Department> {
    const department = this.repository.create(data);
    return this.repository.save(department);
  }

  async update(id: number, data: Partial<Department>): Promise<Department> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Department not found after update');
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new Error('Department not found');
    }
  }

  async count(): Promise<number> {
    return this.repository.count();
  }
}
