#!/usr/bin/env node

/**
 * Queue Worker for Leave Request Processing
 *
 * This worker can be run as a separate process to scale queue processing.
 * Multiple instances can be started to handle high queue loads.
 *
 * Usage:
 * - Single worker: npm run worker
 * - Multiple workers: npm run worker:scale
 */

import 'reflect-metadata';

import { QueueServiceImpl } from '@/services/queue.service';
import { LeaveRequestServiceImpl } from '@/services/leave-request.service';
import { CacheServiceImpl } from '@/services/cache.service';
import { databaseService } from '@/config/database';
import { logger } from '@/services/logger.service';

class QueueWorker {
  private queueService: QueueServiceImpl;
  private leaveRequestService: LeaveRequestServiceImpl;
  private cacheService: CacheServiceImpl;

  private workerId: string;

  constructor() {
    this.workerId = `worker-${process.pid}-${Date.now()}`;
    this.cacheService = new CacheServiceImpl();
    this.queueService = new QueueServiceImpl(this.cacheService);
    this.leaveRequestService = new LeaveRequestServiceImpl(
      undefined,
      undefined,
      this.queueService,
      this.cacheService
    );
  }

  async start(): Promise<void> {
    try {
      logger.info(`Starting queue worker: ${this.workerId}`);

      await databaseService.connect();
      logger.info('Database connected successfully');

      await this.cacheService.connect();
      logger.info('Redis connected successfully');

      await this.queueService.connect();
      logger.info('RabbitMQ connected successfully');

      await this.queueService.consumeLeaveRequests(
        this.leaveRequestService.processLeaveRequest.bind(
          this.leaveRequestService
        ),
        {
          prefetchCount: 5,
          consumerTag: this.workerId,
        }
      );

      logger.info(`Queue worker ${this.workerId} started successfully`);
      logger.info('Worker is now consuming leave request messages...');

      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));
    } catch (error) {
      logger.error('Failed to start queue worker:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info(`Shutting down queue worker: ${this.workerId}`);

    try {
      await this.queueService.close();
      await this.cacheService.close();
      await databaseService.close();
      logger.info(`Queue worker ${this.workerId} stopped gracefully`);
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const worker = new QueueWorker();
  worker.start().catch((error) => {
    logger.error('Failed to start queue worker:', error);
    process.exit(1);
  });
}

export { QueueWorker };
