import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  username: process.env.DB_USER || 'workforce_user',
  password: process.env.DB_PASSWORD || 'workforce_password',
  database: process.env.DB_NAME || 'workforce_management',
  synchronize: false,
  logging: false,
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  extra: {
    connectionLimit: 20,
    acquireTimeout: 30000,
    timeout: 10000,
  },
});
