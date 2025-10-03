import request from 'supertest';
import express from 'express';
import { HealthController } from '@/controllers/health.controller';
import { errorHandler } from '@/middleware/error.middleware';
import {
  testDataSource,
  setupTestDatabase,
  teardownTestDatabase,
} from '../setup';

// Mock services
jest.mock('@/services/queue.service');
jest.mock('@/services/cache.service');

describe('Health Check API Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await testDataSource.synchronize();

    app = express();
    app.use(express.json());

    const healthController = new HealthController();

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
      expect(response.body.data.services.database.status).toBe('healthy');
      expect(response.body.data.services.queue.status).toBe('healthy');
      expect(response.body.data.services.cache.status).toBe('healthy');
    });

    it('should include system information', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data.system).toHaveProperty('platform');
      expect(response.body.data.system).toHaveProperty('nodeVersion');
      expect(response.body.data.system).toHaveProperty('memory');
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
      expect(response.body.data).toHaveProperty('connection');
      expect(response.body.data).toHaveProperty('channel');
    });

    it('should return healthy status when queue is connected', async () => {
      const response = await request(app).get('/health/queue').expect(200);

      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.connection).toBe(true);
      expect(response.body.data.channel).toBe(true);
    });

    it('should include queue configuration info', async () => {
      const response = await request(app).get('/health/queue').expect(200);

      expect(response.body.data).toHaveProperty('config');
      expect(response.body.data.config).toHaveProperty('url');
      expect(response.body.data.config).toHaveProperty('queueName');
      expect(response.body.data.config).toHaveProperty('dlqName');
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
      expect(response.body.data).toHaveProperty('connected');
    });

    it('should return healthy status when cache is connected', async () => {
      const response = await request(app).get('/health/cache').expect(200);

      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.connected).toBe(true);
    });

    it('should include cache configuration info', async () => {
      const response = await request(app).get('/health/cache').expect(200);

      expect(response.body.data).toHaveProperty('config');
      expect(response.body.data.config).toHaveProperty('host');
      expect(response.body.data.config).toHaveProperty('port');
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app).get('/health/cache').expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Health Check Error Scenarios', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database connection failure
      const originalQuery = testDataSource.query;
      testDataSource.query = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/health').expect(200);

      expect(response.body.data.status).toBe('unhealthy');
      expect(response.body.data.services.database.status).toBe('unhealthy');
      expect(response.body.data.services.database.error).toContain(
        'Database connection failed'
      );

      // Restore original method
      testDataSource.query = originalQuery;
    });

    it('should handle queue service errors gracefully', async () => {
      const QueueService = require('@/services/queue.service').QueueServiceImpl;
      const mockQueueService = {
        isHealthy: jest
          .fn()
          .mockRejectedValue(new Error('Queue service unavailable')),
      };
      QueueService.mockImplementation(() => mockQueueService);

      const response = await request(app).get('/health/queue').expect(200);

      expect(response.body.data.status).toBe('unhealthy');
      expect(response.body.data.connection).toBe(false);
      expect(response.body.data.error).toContain('Queue service unavailable');
    });

    it('should handle cache service errors gracefully', async () => {
      const CacheService = require('@/services/cache.service').CacheServiceImpl;
      const mockCacheService = {
        isHealthy: jest
          .fn()
          .mockRejectedValue(new Error('Cache service unavailable')),
      };
      CacheService.mockImplementation(() => mockCacheService);

      const response = await request(app).get('/health/cache').expect(200);

      expect(response.body.data.status).toBe('unhealthy');
      expect(response.body.data.connected).toBe(false);
      expect(response.body.data.error).toContain('Cache service unavailable');
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
