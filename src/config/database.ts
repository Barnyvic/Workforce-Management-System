import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConfigService } from '@/config/config.service';
import { Department } from '@/entities/department.entity';
import { Employee } from '@/entities/employee.entity';
import { LeaveRequest } from '@/entities/leave-request.entity';
import { logger } from '@/services/logger.service';

class DatabaseService {
  private static instance: DatabaseService;
  private dataSource: DataSource;

  private constructor() {
    const config = ConfigService.getInstance().getDatabaseConfig();

    this.dataSource = new DataSource({
      type: 'mysql',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      synchronize: ConfigService.getInstance().isDevelopment(),
      logging: ConfigService.getInstance().isDevelopment(),
      entities: [Department, Employee, LeaveRequest],
      migrations: ['src/migrations/*.ts'],
      subscribers: ['src/subscribers/*.ts'],
      cache: {
        type: 'redis',
        options: {
          host: ConfigService.getInstance().getRedisConfig().host,
          port: ConfigService.getInstance().getRedisConfig().port,
        },
      },
      extra: {
        connectionLimit: 20,
        acquireTimeout: 30000,
        timeout: 10000,
      },
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.dataSource.initialize();
      logger.info('Database connection established successfully.');
    } catch (error) {
      logger.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  public async sync(): Promise<void> {
    try {
      await this.dataSource.synchronize();
      logger.info('Database synchronized successfully.');
    } catch (error) {
      logger.error('Database synchronization failed:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      await this.dataSource.destroy();
      logger.info('Database connection closed.');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  public getDataSource(): DataSource {
    return this.dataSource;
  }

  public async transaction<T>(
    callback: (manager: any) => Promise<T>
  ): Promise<T> {
    return this.dataSource.transaction(callback);
  }
}

export const databaseService = DatabaseService.getInstance();
export const dataSource = databaseService.getDataSource();
