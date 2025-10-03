import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Department } from '@/entities/department.entity';
import { User } from '@/entities/user.entity';
import { LeaveRequest } from '@/entities/leave-request.entity';

export const testDataSource = new DataSource({
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  logging: false,
  entities: [Department, User, LeaveRequest],
  dropSchema: true,
});

export const setupTestDatabase = async (): Promise<void> => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
  }
};

export const teardownTestDatabase = async (): Promise<void> => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};
