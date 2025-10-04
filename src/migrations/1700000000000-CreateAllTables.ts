import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAllTables1700000000000 implements MigrationInterface {
  name = 'CreateAllTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`departments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_departments_name\` (\`name\`),
        INDEX \`IDX_departments_createdAt\` (\`createdAt\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`role\` varchar(50) NOT NULL DEFAULT 'EMPLOYEE',
        \`departmentId\` int NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_users_email\` (\`email\`),
        INDEX \`IDX_users_role\` (\`role\`),
        INDEX \`IDX_users_name\` (\`name\`),
        INDEX \`IDX_users_departmentId\` (\`departmentId\`),
        INDEX \`IDX_users_createdAt\` (\`createdAt\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`leave_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`start_date\` date NOT NULL,
        \`end_date\` date NOT NULL,
        \`status\` varchar(50) NOT NULL DEFAULT 'PENDING',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_leave_requests_userId\` (\`user_id\`),
        INDEX \`IDX_leave_requests_status\` (\`status\`),
        INDEX \`IDX_leave_requests_dates\` (\`start_date\`, \`end_date\`),
        INDEX \`IDX_leave_requests_createdAt\` (\`createdAt\`),
        INDEX \`IDX_leave_requests_user_status\` (\`user_id\`, \`status\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`users\` 
      ADD CONSTRAINT \`FK_users_department\` 
      FOREIGN KEY (\`departmentId\`) REFERENCES \`departments\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`leave_requests\` 
      ADD CONSTRAINT \`FK_leave_requests_user\` 
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`leave_requests\` DROP FOREIGN KEY \`FK_leave_requests_user\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_users_department\``);

    await queryRunner.query(`DROP TABLE \`leave_requests\``);
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP TABLE \`departments\``);
  }
}
