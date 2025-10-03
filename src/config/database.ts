import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AppDataSource } from './data-source';
import { logger } from '@/services/logger.service';

class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    try {
      await AppDataSource.initialize();
      logger.info('Database connection established successfully.');
    } catch (error) {
      logger.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  public async sync(): Promise<void> {
    try {
      await AppDataSource.synchronize();
      logger.info('Database synchronized successfully.');
    } catch (error) {
      logger.error('Database synchronization failed:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      await AppDataSource.destroy();
      logger.info('Database connection closed.');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  public getDataSource(): DataSource {
    return AppDataSource;
  }

  public async transaction<T>(
    callback: (manager: any) => Promise<T>
  ): Promise<T> {
    return AppDataSource.transaction(callback);
  }
}

export const databaseService = DatabaseService.getInstance();
export const dataSource = databaseService.getDataSource();
