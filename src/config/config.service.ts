import { AppConfig } from '@/types';

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): AppConfig {
    return {
      port: parseInt(process.env['PORT'] || '3000', 10),
      nodeEnv: process.env['NODE_ENV'] || 'development',
      database: {
        host: process.env['DB_HOST'] || 'localhost',
        port: parseInt(process.env['DB_PORT'] || '3306', 10),
        database: process.env['DB_NAME'] || 'workforce_management',
        username: process.env['DB_USER'] || 'root',
        password: process.env['DB_PASSWORD'] || 'password',
      },
      redis: {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
        ...(process.env['REDIS_PASSWORD'] && {
          password: process.env['REDIS_PASSWORD'],
        }),
      },
      rabbitmq: {
        url: process.env['RABBITMQ_URL'] || 'amqp://localhost:5672',
        queueName: process.env['RABBITMQ_QUEUE_NAME'] || 'leave_requests',
        dlqName: process.env['RABBITMQ_DLQ_NAME'] || 'leave_requests_dlq',
      },
      jwt: {
        secret: process.env['JWT_SECRET'] || 'your-super-secret-jwt-key',
        expiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
      },
      rateLimit: {
        windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10),
        maxRequests: parseInt(
          process.env['RATE_LIMIT_MAX_REQUESTS'] || '100',
          10
        ),
      },
      logging: {
        level: process.env['LOG_LEVEL'] || 'info',
        file: process.env['LOG_FILE'] || 'logs/app.log',
      },
    };
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public getDatabaseConfig() {
    return this.config.database;
  }

  public getRedisConfig() {
    return this.config.redis;
  }

  public getRabbitMQConfig() {
    return this.config.rabbitmq;
  }

  public getJwtConfig() {
    return this.config.jwt;
  }

  public getRateLimitConfig() {
    return this.config.rateLimit;
  }

  public getLoggingConfig() {
    return this.config.logging;
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }
}
