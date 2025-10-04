import 'reflect-metadata';
import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import helmet from 'helmet';
import { ConfigService } from '@/config/config.service';
import { databaseService } from '@/config/database';
import { CacheServiceImpl } from '@/services/cache.service';
import { QueueServiceImpl } from '@/services/queue.service';
import { LeaveRequestServiceImpl } from '@/services/leave-request.service';
import { logger } from '@/services/logger.service';
import { createRoutes } from '@/routes';
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware';
import {
  createRateLimiter,
  requestLogger,
  corsHandler,
} from '@/middleware/security.middleware';

class Application {
  private app: express.Application;
  private config = ConfigService.getInstance();
  private cacheService: CacheServiceImpl;
  private queueService: QueueServiceImpl;
  private leaveRequestService: LeaveRequestServiceImpl;

  constructor() {
    this.app = express();
    this.cacheService = new CacheServiceImpl();
    this.queueService = new QueueServiceImpl();
    this.leaveRequestService = new LeaveRequestServiceImpl(
      undefined,
      undefined,
      this.queueService
    );
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(corsHandler);
    this.app.use(createRateLimiter());

    this.app.use(requestLogger);

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.get('/ping', (_req, res) => {
      res.json({ message: 'pong', timestamp: new Date().toISOString() });
    });
  }

  private setupRoutes(): void {
    const routes = createRoutes(this.cacheService, this.queueService);
    this.app.use('/api/v1', routes);
  }

  private setupErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      await databaseService.connect();
      logger.info('Database connected successfully');

      await this.cacheService.connect();
      logger.info('Redis connected successfully');

      await this.queueService.connect();
      logger.info('RabbitMQ connected successfully');

      await this.queueService.consumeLeaveRequests(
        this.leaveRequestService.processLeaveRequest.bind(
          this.leaveRequestService
        )
      );
      logger.info('Started consuming leave request messages');

      const port = this.config.getConfig().port;
      this.app.listen(port, () => {
        logger.info(`Server running on port ${port}`);
        logger.info(`Environment: ${this.config.getConfig().nodeEnv}`);
      });
    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.queueService.close();
      await this.cacheService.close();
      await databaseService.close();
      logger.info('Application stopped gracefully');
    } catch (error) {
      logger.error('Error stopping application:', error);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (app) {
    await app.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (app) {
    await app.stop();
  }
  process.exit(0);
});

const app = new Application();
app.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export default app;
