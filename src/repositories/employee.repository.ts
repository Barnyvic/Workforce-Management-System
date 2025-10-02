import { Repository, FindManyOptions } from 'typeorm';
import { Employee } from '@/entities/employee.entity';
import { PaginationParams } from '@/types';
import { dataSource } from '@/config/database';
import { EmployeeRepository } from '@/interfaces/repository.interfaces';

export class EmployeeRepositoryImpl implements EmployeeRepository {
  private repository: Repository<Employee>;

  constructor() {
    this.repository = dataSource.getRepository(Employee);
  }

  async findById(id: number): Promise<Employee | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByDepartmentId(
    departmentId: number,
    pagination?: PaginationParams
  ): Promise<{ employees: Employee[]; total: number }> {
    const options: FindManyOptions<Employee> = {
      where: { departmentId },
      relations: ['department'],
    };

    if (pagination) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      options.skip = skip;
      options.take = limit;
    }

    const [employees, total] = await this.repository.findAndCount(options);
    return { employees, total };
  }

  async findWithLeaveHistory(id: number): Promise<Employee | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['department', 'leaveRequests'],
      order: {
        leaveRequests: {
          createdAt: 'DESC',
        },
      },
    });
  }

  async findAll(options: FindManyOptions<Employee> = {}): Promise<Employee[]> {
    return this.repository.find({
      ...options,
      relations: ['department'],
    });
  }

  async create(data: Partial<Employee>): Promise<Employee> {
    const employee = this.repository.create(data);
    return this.repository.save(employee);
  }

  async update(id: number, data: Partial<Employee>): Promise<Employee> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Employee not found after update');
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new Error('Employee not found');
    }
  }

  async count(options: FindManyOptions<Employee> = {}): Promise<number> {
    return this.repository.count(options);
  }
}
