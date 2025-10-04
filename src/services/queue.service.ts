import * as amqp from 'amqplib';
import { ConfigService } from '@/config/config.service';
import { QueueMessage, RetryPolicy } from '@/types';
import { QueueService } from '@/interfaces/queue.interface';
import { logger } from '@/services/logger.service';
import { CacheServiceImpl } from '@/services/cache.service';

interface AmqpConnection {
  createChannel(): Promise<amqp.Channel>;
  close(): Promise<void>;
}

export class QueueServiceImpl implements QueueService {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private config = ConfigService.getInstance().getRabbitMQConfig();
  private cacheService: CacheServiceImpl;
  private retryPolicy: RetryPolicy = {
    maxRetries: 3,
    backoffMs: 1000,
    maxBackoffMs: 10000,
  };

  constructor(cacheService?: CacheServiceImpl) {
    this.cacheService = cacheService || new CacheServiceImpl();
  }

  private generateIdempotencyKey(message: QueueMessage): string {
    const messageData = JSON.stringify({
      id: message.id,
      type: message.type,
      data: message.data,
      timestamp: message.timestamp,
    });
    return `processed:${Buffer.from(messageData).toString('base64')}`;
  }

  private async isMessageProcessed(message: QueueMessage): Promise<boolean> {
    try {
      const idempotencyKey = this.generateIdempotencyKey(message);
      const result = await this.cacheService.get(idempotencyKey);
      return result !== null;
    } catch (error) {
      logger.error('Error checking message idempotency:', error);
      return false;
    }
  }

  private async markMessageAsProcessed(message: QueueMessage): Promise<void> {
    try {
      const idempotencyKey = this.generateIdempotencyKey(message);
      await this.cacheService.set(idempotencyKey, 'processed', 3600);
      logger.info(`Message marked as processed: ${message.id}`);
    } catch (error) {
      logger.error('Error marking message as processed:', error);
    }
  }

  async connect(): Promise<void> {
    try {
      this.connection = (await amqp.connect(this.config.url)) as AmqpConnection;
      this.channel = await this.connection.createChannel();

      await this.channel!.assertQueue(this.config.queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': this.config.dlqName,
        },
      });

      await this.channel!.assertQueue(this.config.dlqName, {
        durable: true,
      });

      logger.info('Connected to RabbitMQ');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publishLeaveRequest(message: QueueMessage): Promise<void> {
    if (!this.channel) {
      throw new Error('Queue channel not initialized');
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const published = this.channel.publish(
        '',
        this.config.queueName,
        messageBuffer,
        {
          persistent: true,
          messageId: message.id,
          timestamp: Date.now(),
        }
      );

      if (!published) {
        throw new Error('Failed to publish message to queue');
      }

      logger.info(`Published leave request message: ${message.id}`);
    } catch (error) {
      logger.error('Error publishing message:', error);
      throw error;
    }
  }

  async consumeLeaveRequests(
    callback: (message: QueueMessage) => Promise<void>,
    options: { prefetchCount?: number; consumerTag?: string } = {}
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Queue channel not initialized');
    }

    try {
      const prefetchCount = options.prefetchCount || 1;
      await this.channel.prefetch(prefetchCount);

      const consumerTag =
        options.consumerTag || `consumer-${process.pid}-${Date.now()}`;

      await this.channel.consume(
        this.config.queueName,
        async (msg) => {
          if (!msg) return;

          try {
            const message: QueueMessage = JSON.parse(msg.content.toString());
            logger.info(`Processing leave request message: ${message.id}`);

            const isProcessed = await this.isMessageProcessed(message);
            if (isProcessed) {
              logger.info(`Message already processed, skipping: ${message.id}`);
              this.channel!.ack(msg);
              return;
            }

            await callback(message);
            await this.markMessageAsProcessed(message);
            this.channel!.ack(msg);
            logger.info(`Successfully processed message: ${message.id}`);
          } catch (error) {
            const message: QueueMessage = JSON.parse(msg.content.toString());
            logger.error(`Error processing message ${message.id}:`, error);

            const retryCount = (message.retryCount || 0) + 1;

            if (retryCount <= this.retryPolicy.maxRetries) {
              const delay = Math.min(
                this.retryPolicy.backoffMs * Math.pow(2, retryCount - 1),
                this.retryPolicy.maxBackoffMs
              );

              setTimeout(() => {
                const retryMessage = { ...message, retryCount };
                this.publishLeaveRequest(retryMessage).catch(logger.error);
              }, delay);

              this.channel!.ack(msg);
              logger.info(
                `Scheduled retry ${retryCount}/${this.retryPolicy.maxRetries} for message: ${message.id}`
              );
            } else {
              this.channel!.nack(msg, false, false);
              logger.info(
                `Message ${message.id} sent to dead letter queue after ${this.retryPolicy.maxRetries} retries`
              );
            }
          }
        },
        { consumerTag }
      );

      logger.info(
        `Started consuming leave request messages with tag: ${consumerTag}`
      );
    } catch (error) {
      logger.error('Error setting up consumer:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      return this.connection !== null && this.channel !== null;
    } catch {
      return false;
    }
  }
}
