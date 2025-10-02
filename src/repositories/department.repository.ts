import { Repository, FindManyOptions } from 'typeorm';
import { Department } from '@/entities/department.entity';
import { PaginationParams } from '@/types';
import { dataSource } from '@/config/database';
import { DepartmentRepository } from '@/interfaces/repository.interfaces';

export class DepartmentRepositoryImpl implements DepartmentRepository {
  private repository: Repository<Department>;

  constructor() {
    this.repository = dataSource.getRepository(Department);
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

  async findWithEmployees(id: number): Promise<Department | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['employees'],
    });
  }

  async findEmployeesByDepartment(
    departmentId: number,
    pagination: PaginationParams
  ): Promise<{ departments: Department[]; total: number }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [departments, total] = await this.repository.findAndCount({
      where: { id: departmentId },
      relations: ['employees'],
      skip,
      take: limit,
    });

    return { departments, total };
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
