import { Request, Response } from 'express';
import { databaseService } from '@/config/database';
import { ConfigService } from '@/config/config.service';
import { CacheService } from '@/interfaces/cache.interface';
import { CacheServiceImpl } from '@/services/cache.service';
import { QueueServiceImpl } from '@/services/queue.service';
import { ApiResponse } from '@/types';

export class HealthController {
  private cacheService: CacheService;
  private queueService: QueueServiceImpl;
  private config = ConfigService.getInstance();

  constructor(cacheService?: CacheService, queueService?: QueueServiceImpl) {
    this.cacheService = cacheService || new CacheServiceImpl();
    this.queueService = queueService || new QueueServiceImpl();
  }

  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: this.config.getConfig().nodeEnv,
        version: '1.0.0',
        services: {
          database: 'healthy',
          cache: 'healthy',
          queue: 'healthy',
        },
      };

      try {
        const dataSource = databaseService.getDataSource();
        if (!dataSource.isInitialized) {
          health.status = 'unhealthy';
          health.services.database = 'unhealthy';
        }
      } catch (error) {
        health.status = 'unhealthy';
        health.services.database = 'unhealthy';
      }

      try {
        const cacheHealthy = await this.cacheService.isHealthy();
        if (!cacheHealthy) {
          health.status = 'degraded';
          health.services.cache = 'unhealthy';
        }
      } catch (error) {
        health.status = 'degraded';
        health.services.cache = 'unhealthy';
      }

      try {
        const queueHealthy = await this.queueService.isHealthy();
        if (!queueHealthy) {
          health.status = 'degraded';
          health.services.queue = 'unhealthy';
        }
      } catch (error) {
        health.status = 'degraded';
        health.services.queue = 'unhealthy';
      }

      const statusCode =
        health.status === 'healthy'
          ? 200
          : health.status === 'degraded'
            ? 200
            : 503;

      const response: ApiResponse = {
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      };

      res.status(statusCode).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      };
      res.status(503).json(response);
    }
  };

  queueHealth = async (_req: Request, res: Response): Promise<void> => {
    try {
      const queueHealthy = await this.queueService.isHealthy();
      const statusCode = queueHealthy ? 200 : 503;

      const response: ApiResponse = {
        success: queueHealthy,
        data: {
          status: queueHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      res.status(statusCode).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: 'Queue health check failed',
        timestamp: new Date().toISOString(),
      };
      res.status(503).json(response);
    }
  };

  cacheHealth = async (_req: Request, res: Response): Promise<void> => {
    try {
      const cacheHealthy = await this.cacheService.isHealthy();
      const statusCode = cacheHealthy ? 200 : 503;

      const response: ApiResponse = {
        success: cacheHealthy,
        data: {
          status: cacheHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      res.status(statusCode).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: 'Cache health check failed',
        timestamp: new Date().toISOString(),
      };
      res.status(503).json(response);
    }
  };
}
