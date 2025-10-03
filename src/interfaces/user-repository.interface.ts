import { FindManyOptions } from 'typeorm';
import { User } from '@/entities/user.entity';
import { PaginationParams } from '@/types';

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByDepartmentId(
    departmentId: number,
    pagination: PaginationParams
  ): Promise<{ users: User[]; total: number }>;
  findWithLeaveHistory(id: number): Promise<User | null>;
  findAll(options?: FindManyOptions<User>): Promise<User[]>;
  create(data: Partial<User>): Promise<User>;
  update(id: number, data: Partial<User>): Promise<User>;
  delete(id: number): Promise<void>;
  count(options?: FindManyOptions<User>): Promise<number>;
}
