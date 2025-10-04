import { QueueServiceImpl } from '@/services/queue.service';
import { CacheServiceImpl } from '@/services/cache.service';
import { QueueMessage } from '@/types';

jest.mock('amqplib');
jest.mock('@/services/cache.service');

describe('QueueService', () => {
  let queueService: QueueServiceImpl;
  let mockCacheService: jest.Mocked<CacheServiceImpl>;

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      flushAll: jest.fn(),
      close: jest.fn(),
      isHealthy: jest.fn(),
      connect: jest.fn(),
    } as any;

    queueService = new QueueServiceImpl(mockCacheService);
  });

  describe('connect', () => {
    it('should connect to RabbitMQ successfully', async () => {
      const mockConnection = {
        createChannel: jest.fn().mockResolvedValue({
          assertQueue: jest.fn().mockResolvedValue({}),
        }),
      };

      const mockAmqp = require('amqplib');
      mockAmqp.connect = jest.fn().mockResolvedValue(mockConnection);

      await expect(queueService.connect()).resolves.not.toThrow();
    });

    it('should handle connection errors', async () => {
      const mockAmqp = require('amqplib');
      mockAmqp.connect = jest
        .fn()
        .mockRejectedValue(new Error('Connection failed'));

      await expect(queueService.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('publishLeaveRequest', () => {
    beforeEach(async () => {
      const mockConnection = {
        createChannel: jest.fn().mockResolvedValue({
          assertQueue: jest.fn().mockResolvedValue({}),
          publish: jest.fn().mockReturnValue(true),
        }),
      };

      const mockAmqp = require('amqplib');
      mockAmqp.connect = jest.fn().mockResolvedValue(mockConnection);

      await queueService.connect();
    });

    it('should publish message successfully', async () => {
      const message: QueueMessage = {
        id: 'test-1',
        type: 'leave.requested',
        data: { leaveRequestId: 1, userId: 1 },
        timestamp: new Date().toISOString(),
      };

      await expect(
        queueService.publishLeaveRequest(message)
      ).resolves.not.toThrow();
    });

    it('should throw error when channel not initialized', async () => {
      (queueService as any).channel = null;

      const message: QueueMessage = {
        id: 'test-1',
        type: 'leave.requested',
        data: { leaveRequestId: 1, userId: 1 },
        timestamp: new Date().toISOString(),
      };

      await expect(queueService.publishLeaveRequest(message)).rejects.toThrow(
        'Queue channel not initialized'
      );
    });

    it('should throw error when publish fails', async () => {
      const mockChannel = {
        publish: jest.fn().mockReturnValue(false),
      };
      (queueService as any).channel = mockChannel;

      const message: QueueMessage = {
        id: 'test-1',
        type: 'leave.requested',
        data: { leaveRequestId: 1, userId: 1 },
        timestamp: new Date().toISOString(),
      };

      await expect(queueService.publishLeaveRequest(message)).rejects.toThrow(
        'Failed to publish message to queue'
      );
    });
  });

  describe('consumeLeaveRequests', () => {
    let mockChannel: any;
    let mockCallback: jest.Mock;

    beforeEach(async () => {
      mockCallback = jest.fn();
      mockChannel = {
        assertQueue: jest.fn().mockResolvedValue({}),
        prefetch: jest.fn().mockResolvedValue({}),
        consume: jest.fn(),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      const mockConnection = {
        createChannel: jest.fn().mockResolvedValue(mockChannel),
      };

      const mockAmqp = require('amqplib');
      mockAmqp.connect = jest.fn().mockResolvedValue(mockConnection);

      await queueService.connect();
    });

    it('should start consuming messages', async () => {
      await queueService.consumeLeaveRequests(mockCallback);

      expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
      expect(mockChannel.consume).toHaveBeenCalled();
    });

    it('should process message successfully', async () => {
      const message: QueueMessage = {
        id: 'test-1',
        type: 'leave.requested',
        data: { leaveRequestId: 1, userId: 1 },
        timestamp: new Date().toISOString(),
      };

      mockCacheService.get.mockResolvedValue(null);
      mockCallback.mockResolvedValue(undefined);

      await queueService.consumeLeaveRequests(mockCallback);

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const mockMsg = {
        content: Buffer.from(JSON.stringify(message)),
      };

      await consumeCallback(mockMsg);

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(message);
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
    });

    it('should skip already processed messages', async () => {
      const message: QueueMessage = {
        id: 'test-1',
        type: 'leave.requested',
        data: { leaveRequestId: 1, userId: 1 },
        timestamp: new Date().toISOString(),
      };

      mockCacheService.get.mockResolvedValue('processed');

      await queueService.consumeLeaveRequests(mockCallback);

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const mockMsg = {
        content: Buffer.from(JSON.stringify(message)),
      };

      await consumeCallback(mockMsg);

      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
    });

    it('should retry failed messages', async () => {
      const message: QueueMessage = {
        id: 'test-1',
        type: 'leave.requested',
        data: { leaveRequestId: 1, userId: 1 },
        timestamp: new Date().toISOString(),
      };

      mockCacheService.get.mockResolvedValue(null);
      mockCallback.mockRejectedValue(new Error('Processing failed'));

      await queueService.consumeLeaveRequests(mockCallback);

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const mockMsg = {
        content: Buffer.from(JSON.stringify(message)),
      };

      await consumeCallback(mockMsg);

      expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
    });

    it('should send to dead letter queue after max retries', async () => {
      const message: QueueMessage = {
        id: 'test-1',
        type: 'leave.requested',
        data: { leaveRequestId: 1, userId: 1 },
        timestamp: new Date().toISOString(),
        retryCount: 3,
      };

      mockCacheService.get.mockResolvedValue(null);
      mockCallback.mockRejectedValue(new Error('Processing failed'));

      await queueService.consumeLeaveRequests(mockCallback);

      const consumeCallback = mockChannel.consume.mock.calls[0][1];
      const mockMsg = {
        content: Buffer.from(JSON.stringify(message)),
      };

      await consumeCallback(mockMsg);

      expect(mockChannel.nack).toHaveBeenCalledWith(mockMsg, false, false);
    });

    it('should throw error when channel not initialized', async () => {
      (queueService as any).channel = null;

      await expect(
        queueService.consumeLeaveRequests(mockCallback)
      ).rejects.toThrow('Queue channel not initialized');
    });
  });

  describe('close', () => {
    it('should close connections successfully', async () => {
      const mockChannel = { close: jest.fn().mockResolvedValue({}) };
      const mockConnection = { close: jest.fn().mockResolvedValue({}) };

      (queueService as any).channel = mockChannel;
      (queueService as any).connection = mockConnection;

      await expect(queueService.close()).resolves.not.toThrow();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      const mockChannel = {
        close: jest.fn().mockRejectedValue(new Error('Close failed')),
      };
      const mockConnection = { close: jest.fn().mockResolvedValue({}) };

      (queueService as any).channel = mockChannel;
      (queueService as any).connection = mockConnection;

      await expect(queueService.close()).rejects.toThrow('Close failed');
    });
  });

  describe('isHealthy', () => {
    it('should return true when connection and channel exist', async () => {
      (queueService as any).connection = {};
      (queueService as any).channel = {};

      const result = await queueService.isHealthy();
      expect(result).toBe(true);
    });

    it('should return false when connection is null', async () => {
      (queueService as any).connection = null;
      (queueService as any).channel = {};

      const result = await queueService.isHealthy();
      expect(result).toBe(false);
    });

    it('should return false when channel is null', async () => {
      (queueService as any).connection = {};
      (queueService as any).channel = null;

      const result = await queueService.isHealthy();
      expect(result).toBe(false);
    });

    it('should return false when both are null', async () => {
      (queueService as any).connection = null;
      (queueService as any).channel = null;

      const result = await queueService.isHealthy();
      expect(result).toBe(false);
    });
  });

  describe('idempotency', () => {
    it('should generate consistent idempotency keys', () => {
      const message: QueueMessage = {
        id: 'test-1',
        type: 'leave.requested',
        data: { leaveRequestId: 1, userId: 1 },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const key1 = (queueService as any).generateIdempotencyKey(message);
      const key2 = (queueService as any).generateIdempotencyKey(message);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different messages', () => {
      const message1: QueueMessage = {
        id: 'test-1',
        type: 'leave.requested',
        data: { leaveRequestId: 1, userId: 1 },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const message2: QueueMessage = {
        id: 'test-2',
        type: 'leave.requested',
        data: { leaveRequestId: 2, userId: 1 },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const key1 = (queueService as any).generateIdempotencyKey(message1);
      const key2 = (queueService as any).generateIdempotencyKey(message2);

      expect(key1).not.toBe(key2);
    });
  });
});
