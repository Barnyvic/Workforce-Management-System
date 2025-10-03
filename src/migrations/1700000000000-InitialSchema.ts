import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create departments table
    await queryRunner.query(`
      CREATE TABLE \`departments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_department_name\` (\`name\`),
        INDEX \`IDX_department_createdAt\` (\`createdAt\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create leave_requests table
    await queryRunner.query(`
      CREATE TABLE \`leave_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`start_date\` date NOT NULL,
        \`end_date\` date NOT NULL,
        \`status\` enum('PENDING', 'APPROVED', 'REJECTED', 'PENDING_APPROVAL') NOT NULL DEFAULT 'PENDING',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_leaveRequest_userId\` (\`user_id\`),
        INDEX \`IDX_leaveRequest_status\` (\`status\`),
        INDEX \`IDX_leaveRequest_dates\` (\`start_date\`, \`end_date\`),
        INDEX \`IDX_leaveRequest_createdAt\` (\`createdAt\`),
        INDEX \`IDX_leaveRequest_user_status\` (\`user_id\`, \`status\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE \`leave_requests\` 
      ADD CONSTRAINT \`FK_leaveRequest_user\` 
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE \`leave_requests\` DROP FOREIGN KEY \`FK_leaveRequest_user\``);

    // Drop tables
    await queryRunner.query(`DROP TABLE \`leave_requests\``);
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP TABLE \`departments\``);
  }
}
