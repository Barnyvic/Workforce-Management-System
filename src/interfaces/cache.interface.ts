export interface CacheService {
  connect(): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  flushAll(): Promise<void>;
  close(): Promise<void>;
  isHealthy(): Promise<boolean>;
}
