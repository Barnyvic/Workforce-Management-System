import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Department } from '@/entities/department.entity';
import { User } from '@/entities/user.entity';
import { LeaveRequest } from '@/entities/leave-request.entity';

const testConfig = {
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '3306', 10),
  database: process.env['DB_NAME'] || 'workforce_management_test',
  username: process.env['DB_USER'] || 'root',
  password: process.env['DB_PASSWORD'] || 'password',
};

export const testDataSource = new DataSource({
  type: 'mysql',
  host: testConfig.host,
  port: testConfig.port,
  username: testConfig.username,
  password: testConfig.password,
  database: testConfig.database,
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
