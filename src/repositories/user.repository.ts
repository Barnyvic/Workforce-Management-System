import { Repository, FindManyOptions } from 'typeorm';
import { User } from '@/entities/user.entity';
import { PaginationParams } from '@/types';
import { dataSource } from '@/config/database';
import { UserRepository } from '@/interfaces/user-repository.interface';

export class UserRepositoryImpl implements UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = dataSource.getRepository(User);
  }

  async findById(id: number): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByDepartmentId(
    departmentId: number,
    pagination: PaginationParams
  ): Promise<{ users: User[]; total: number }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await this.repository.findAndCount({
      where: { departmentId },
      relations: ['department'],
      skip,
      take: limit,
    });

    return { users, total };
  }

  async findWithLeaveHistory(id: number): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['leaveRequests', 'department'],
    });
  }

  async findAll(options: FindManyOptions<User> = {}): Promise<User[]> {
    return this.repository.find(options);
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('User not found after update');
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new Error('User not found');
    }
  }

  async count(options?: FindManyOptions<User>): Promise<number> {
    return this.repository.count(options);
  }
}
