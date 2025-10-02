const { DataSource } = require('typeorm');
const config = require('./src/config/config.service').ConfigService.getInstance().getDatabaseConfig();

const dataSource = new DataSource({
  type: 'mysql',
  host: config.host,
  port: config.port,
  database: config.database,
  username: config.username,
  password: config.password,
  synchronize: false,
  logging: true,
  entities: ['dist/entities/*.js'],
  migrations: ['dist/migrations/*.js'],
});

async function runMigrations() {
  try {
    await dataSource.initialize();
    console.log('Database connection established successfully.');

    await dataSource.runMigrations();
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runMigrations();