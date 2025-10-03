import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConfigService } from './config.service';

const config = ConfigService.getInstance().getDatabaseConfig();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  database: config.database,
  synchronize: false,
  logging: false,
  entities: ['src/entities/*.entity.ts'],
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
