import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Department } from '@/entities/department.entity';
import { User } from '@/entities/user.entity';
import { LeaveRequest } from '@/entities/leave-request.entity';
import { CacheService } from '@/interfaces/cache.interface';

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

export const clearTestDatabase = async (): Promise<void> => {
  if (testDataSource.isInitialized) {
    await testDataSource.dropDatabase();
    await testDataSource.synchronize();
  }
};

export const teardownTestDatabase = async (): Promise<void> => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
};

// Mock Cache Service for tests
export class MockCacheService implements CacheService {
  private cache = new Map<string, unknown>();

  async connect(): Promise<void> {
    // No-op for mock
  }

  async close(): Promise<void> {
    this.cache.clear();
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get(key);
    return value as T | null;
  }

  async set(key: string, value: unknown, _ttlSeconds?: number): Promise<void> {
    this.cache.set(key, value);
    // Ignore TTL for mock
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async flushAll(): Promise<void> {
    this.cache.clear();
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
