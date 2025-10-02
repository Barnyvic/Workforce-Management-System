import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConfigService } from '@/config/config.service';
import { Department } from '@/entities/department.entity';
import { Employee } from '@/entities/employee.entity';
import { LeaveRequest } from '@/entities/leave-request.entity';

// Test database configuration
const testConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'workforce_management_test',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
};

// Create test database connection
export const testDataSource = new DataSource({
  type: 'mysql',
  host: testConfig.host,
  port: testConfig.port,
  username: testConfig.username,
  password: testConfig.password,
  database: testConfig.database,
  synchronize: true, // Auto-sync for tests
  logging: false, // Disable logging in tests
  entities: [Department, Employee, LeaveRequest],
  dropSchema: true, // Drop schema before each test
});

// Setup and teardown for tests
export const setupTestDatabase = async (): Promise<void> => {
  try {
    await testDataSource.initialize();
    console.log('Test database initialized');
  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
};

export const teardownTestDatabase = async (): Promise<void> => {
  try {
    await testDataSource.destroy();
    console.log('Test database destroyed');
  } catch (error) {
    console.error('Test database teardown failed:', error);
    throw error;
  }
};

// Mock services for testing
export const mockConfigService = {
  getConfig: () => ({
    port: 3000,
    nodeEnv: 'test',
    database: testConfig,
    redis: {
      host: 'localhost',
      port: 6379,
    },
    rabbitmq: {
      url: 'amqp://localhost:5672',
      queueName: 'test_queue',
      dlqName: 'test_dlq',
    },
    jwt: {
      secret: 'test-secret',
      expiresIn: '1h',
    },
    rateLimit: {
      windowMs: 900000,
      maxRequests: 100,
    },
    logging: {
      level: 'error',
      file: 'test.log',
    },
  }),
  getDatabaseConfig: () => testConfig,
  getRedisConfig: () => ({ host: 'localhost', port: 6379 }),
  getRabbitMQConfig: () => ({
    url: 'amqp://localhost:5672',
    queueName: 'test_queue',
    dlqName: 'test_dlq',
  }),
  getJwtConfig: () => ({ secret: 'test-secret', expiresIn: '1h' }),
  getRateLimitConfig: () => ({ windowMs: 900000, maxRequests: 100 }),
  getLoggingConfig: () => ({ level: 'error', file: 'test.log' }),
  isDevelopment: () => false,
  isProduction: () => false,
};