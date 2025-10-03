import { CacheServiceImpl } from '@/services/cache.service';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('CacheService', () => {
  let cacheService: CacheServiceImpl;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn().mockResolvedValue({}),
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      flushAll: jest.fn(),
      quit: jest.fn().mockResolvedValue({}),
      ping: jest.fn().mockResolvedValue('PONG'),
      on: jest.fn(),
    };

    const redis = require('redis');
    redis.createClient = jest.fn().mockReturnValue(mockClient);

    cacheService = new CacheServiceImpl();
  });

  describe('connect', () => {
    it('should connect to Redis successfully', async () => {
      await expect(cacheService.connect()).resolves.not.toThrow();

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle connection errors', async () => {
      mockClient.connect = jest
        .fn()
        .mockRejectedValue(new Error('Connection failed'));

      await expect(cacheService.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should get value successfully', async () => {
      mockClient.get.mockResolvedValue('{"test": "value"}');

      const result = await cacheService.get('test-key');

      expect(result).toEqual({ test: 'value' });
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent key', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should handle get errors gracefully', async () => {
      mockClient.get.mockRejectedValue(new Error('Get failed'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should throw error when client not initialized', async () => {
      (cacheService as any).client = null;

      await expect(cacheService.get('test-key')).rejects.toThrow(
        'Redis client not initialized'
      );
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should set value without TTL', async () => {
      mockClient.set.mockResolvedValue('OK');

      await cacheService.set('test-key', { test: 'value' });

      expect(mockClient.set).toHaveBeenCalledWith(
        'test-key',
        '{"test":"value"}'
      );
    });

    it('should set value with TTL', async () => {
      mockClient.setEx.mockResolvedValue('OK');

      await cacheService.set('test-key', { test: 'value' }, 3600);

      expect(mockClient.setEx).toHaveBeenCalledWith(
        'test-key',
        3600,
        '{"test":"value"}'
      );
    });

    it('should handle set errors', async () => {
      mockClient.set.mockRejectedValue(new Error('Set failed'));

      await expect(
        cacheService.set('test-key', { test: 'value' })
      ).rejects.toThrow('Set failed');
    });

    it('should throw error when client not initialized', async () => {
      (cacheService as any).client = null;

      await expect(
        cacheService.set('test-key', { test: 'value' })
      ).rejects.toThrow('Redis client not initialized');
    });
  });

  describe('del', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should delete key successfully', async () => {
      mockClient.del.mockResolvedValue(1);

      await cacheService.del('test-key');

      expect(mockClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle delete errors', async () => {
      mockClient.del.mockRejectedValue(new Error('Delete failed'));

      await expect(cacheService.del('test-key')).rejects.toThrow(
        'Delete failed'
      );
    });

    it('should throw error when client not initialized', async () => {
      (cacheService as any).client = null;

      await expect(cacheService.del('test-key')).rejects.toThrow(
        'Redis client not initialized'
      );
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should return true when key exists', async () => {
      mockClient.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(true);
      expect(mockClient.exists).toHaveBeenCalledWith('test-key');
    });

    it('should return false when key does not exist', async () => {
      mockClient.exists.mockResolvedValue(0);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(false);
    });

    it('should handle exists errors gracefully', async () => {
      mockClient.exists.mockRejectedValue(new Error('Exists failed'));

      const result = await cacheService.exists('test-key');

      expect(result).toBe(false);
    });

    it('should throw error when client not initialized', async () => {
      (cacheService as any).client = null;

      await expect(cacheService.exists('test-key')).rejects.toThrow(
        'Redis client not initialized'
      );
    });
  });

  describe('flushAll', () => {
    beforeEach(async () => {
      await cacheService.connect();
    });

    it('should flush all keys successfully', async () => {
      mockClient.flushAll.mockResolvedValue('OK');

      await cacheService.flushAll();

      expect(mockClient.flushAll).toHaveBeenCalled();
    });

    it('should handle flush errors', async () => {
      mockClient.flushAll.mockRejectedValue(new Error('Flush failed'));

      await expect(cacheService.flushAll()).rejects.toThrow('Flush failed');
    });

    it('should throw error when client not initialized', async () => {
      (cacheService as any).client = null;

      await expect(cacheService.flushAll()).rejects.toThrow(
        'Redis client not initialized'
      );
    });
  });

  describe('close', () => {
    it('should close connection successfully', async () => {
      (cacheService as any).client = mockClient;

      await cacheService.close();

      expect(mockClient.quit).toHaveBeenCalled();
    });

    it('should handle close errors', async () => {
      mockClient.quit = jest.fn().mockRejectedValue(new Error('Close failed'));
      (cacheService as any).client = mockClient;

      await expect(cacheService.close()).rejects.toThrow('Close failed');
    });

    it('should handle null client gracefully', async () => {
      (cacheService as any).client = null;

      await expect(cacheService.close()).resolves.not.toThrow();
    });
  });

  describe('isHealthy', () => {
    it('should return true when client is healthy', async () => {
      (cacheService as any).client = mockClient;

      const result = await cacheService.isHealthy();

      expect(result).toBe(true);
      expect(mockClient.ping).toHaveBeenCalled();
    });

    it('should return false when client is null', async () => {
      (cacheService as any).client = null;

      const result = await cacheService.isHealthy();

      expect(result).toBe(false);
    });

    it('should return false when ping fails', async () => {
      mockClient.ping = jest.fn().mockRejectedValue(new Error('Ping failed'));
      (cacheService as any).client = mockClient;

      const result = await cacheService.isHealthy();

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle Redis client errors', async () => {
      await cacheService.connect();

      const errorHandler = mockClient.on.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];

      expect(errorHandler).toBeDefined();

      // The error handler is already set up during connect()
      // We just need to verify it exists and can be called
      expect(() => errorHandler!(new Error('Redis error'))).not.toThrow();
    });
  });
});
