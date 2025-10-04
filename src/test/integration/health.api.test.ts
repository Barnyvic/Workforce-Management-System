import request from 'supertest';
import express from 'express';
import { HealthController } from '@/controllers/health.controller';
import { CacheServiceImpl } from '@/services/cache.service';
import { QueueServiceImpl } from '@/services/queue.service';
import { errorHandler } from '@/middleware/error.middleware';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../setup';

// Mock services
jest.mock('@/services/queue.service');
jest.mock('@/services/cache.service');
jest.mock('@/config/database');

const MockedCacheService = CacheServiceImpl as jest.MockedClass<
  typeof CacheServiceImpl
>;
const MockedQueueService = QueueServiceImpl as jest.MockedClass<
  typeof QueueServiceImpl
>;

describe('Health Check API Integration Tests', () => {
  let app: express.Application;
  let mockCacheService: jest.Mocked<CacheServiceImpl>;
  let mockQueueService: jest.Mocked<QueueServiceImpl>;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    app = express();
    app.use(express.json());

    // Mock database service
    const mockDatabaseService = {
      getDataSource: jest.fn().mockReturnValue({
        isInitialized: true,
      }),
    };
    require('@/config/database').databaseService = mockDatabaseService;

    // Create mock services
    mockCacheService = {
      isHealthy: jest.fn().mockResolvedValue(true),
      connect: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      flushAll: jest.fn(),
      close: jest.fn(),
    } as any;

    mockQueueService = {
      isHealthy: jest.fn().mockResolvedValue(true),
      connect: jest.fn().mockResolvedValue(undefined),
      publishMessage: jest.fn(),
      close: jest.fn(),
    } as any;

    MockedCacheService.mockImplementation(() => mockCacheService);
    MockedQueueService.mockImplementation(() => mockQueueService);

    const healthController = new HealthController(
      mockCacheService,
      mockQueueService
    );

    // Setup routes
    app.get('/health', healthController.healthCheck);
    app.get('/health/queue', healthController.queueHealth);
    app.get('/health/cache', healthController.cacheHealth);

    app.use(errorHandler);
  });

  describe('GET /health', () => {
    it('should return overall system health', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data.services).toHaveProperty('database');
      expect(response.body.data.services).toHaveProperty('queue');
      expect(response.body.data.services).toHaveProperty('cache');
    });

    it('should return healthy status when all services are up', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.services.database).toBe('healthy');
      expect(response.body.data.services.queue).toBe('healthy');
      expect(response.body.data.services.cache).toBe('healthy');
    });

    it('should include basic system information', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data.environment).toBe('test');
      expect(response.body.data.version).toBe('1.0.0');
    });

    it('should include uptime information', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.data.uptime).toBeGreaterThan(0);
      expect(typeof response.body.data.uptime).toBe('number');
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /health/queue', () => {
    it('should return queue health status', async () => {
      const response = await request(app).get('/health/queue').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data.status).toBe('healthy');
    });

    it('should return healthy status when queue is connected', async () => {
      const response = await request(app).get('/health/queue').expect(200);

      expect(response.body.data.status).toBe('healthy');
      expect(response.body.success).toBe(true);
    });

    it('should return basic queue status (detailed config not exposed)', async () => {
      const response = await request(app).get('/health/queue').expect(200);

      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      // Note: Detailed config is not exposed for security reasons
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app).get('/health/queue').expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /health/cache', () => {
    it('should return cache health status', async () => {
      const response = await request(app).get('/health/cache').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data.status).toBe('healthy');
    });

    it('should return healthy status when cache is connected', async () => {
      const response = await request(app).get('/health/cache').expect(200);

      expect(response.body.data.status).toBe('healthy');
      expect(response.body.success).toBe(true);
    });

    it('should return basic cache status (detailed config not exposed)', async () => {
      const response = await request(app).get('/health/cache').expect(200);

      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      // Note: Detailed config is not exposed for security reasons
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app).get('/health/cache').expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Health Check Error Scenarios', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database service to simulate connection failure
      const mockDatabaseService = {
        getDataSource: jest.fn().mockReturnValue({
          isInitialized: false,
        }),
      };
      require('@/config/database').databaseService = mockDatabaseService;

      const response = await request(app).get('/health').expect(503);

      expect(response.body.data.status).toBe('unhealthy');
      expect(response.body.data.services.database).toBe('unhealthy');
    });

    it('should handle queue service errors gracefully', async () => {
      // Create a new health controller with a failing queue service
      const failingQueueService = {
        isHealthy: jest.fn().mockResolvedValue(false),
        connect: jest.fn(),
        publishMessage: jest.fn(),
        close: jest.fn(),
      };

      const healthController = new HealthController(
        mockCacheService,
        failingQueueService as any
      );
      app.get('/health/queue-fail', healthController.queueHealth);

      const response = await request(app).get('/health/queue-fail').expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe('unhealthy');
    });

    it('should handle cache service errors gracefully', async () => {
      // Create a new health controller with a failing cache service
      const failingCacheService = {
        isHealthy: jest.fn().mockResolvedValue(false),
        connect: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        flushAll: jest.fn(),
        close: jest.fn(),
      };

      const healthController = new HealthController(
        failingCacheService as any,
        mockQueueService
      );
      app.get('/health/cache-fail', healthController.cacheHealth);

      const response = await request(app).get('/health/cache-fail').expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe('unhealthy');
    });
  });

  describe('Health Check Performance', () => {
    it('should respond quickly to health checks', async () => {
      const startTime = Date.now();

      const response = await request(app).get('/health').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000);
      expect(response.body.success).toBe(true);
    });

    it('should respond quickly to queue health checks', async () => {
      const startTime = Date.now();

      const response = await request(app).get('/health/queue').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000);
      expect(response.body.success).toBe(true);
    });

    it('should respond quickly to cache health checks', async () => {
      const startTime = Date.now();

      const response = await request(app).get('/health/cache').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Health Check Monitoring Integration', () => {
    it('should provide consistent response format for monitoring tools', async () => {
      const response = await request(app).get('/health').expect(200);

      // Standard health check format
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('services');

      // Status should be a string
      expect(typeof response.body.data.status).toBe('string');
      expect(['healthy', 'unhealthy', 'degraded']).toContain(
        response.body.data.status
      );
    });

    it('should include version information', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.data).toHaveProperty('version');
      expect(typeof response.body.data.version).toBe('string');
    });

    it('should include environment information', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.data).toHaveProperty('environment');
      expect(typeof response.body.data.environment).toBe('string');
    });
  });

  describe('Health Check Security', () => {
    it('should not expose sensitive information', async () => {
      const response = await request(app).get('/health').expect(200);

      const responseString = JSON.stringify(response.body);

      // Should not contain sensitive information
      expect(responseString).not.toContain('password');
      expect(responseString).not.toContain('secret');
      expect(responseString).not.toContain('key');
      expect(responseString).not.toContain('token');
    });

    it('should be accessible from any origin for monitoring', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://monitoring.example.com')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
