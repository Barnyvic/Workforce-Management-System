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

    // Create employees table
    await queryRunner.query(`
      CREATE TABLE \`employees\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`department_id\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_employee_email\` (\`email\`),
        INDEX \`IDX_employee_departmentId\` (\`department_id\`),
        INDEX \`IDX_employee_name\` (\`name\`),
        INDEX \`IDX_employee_createdAt\` (\`createdAt\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create leave_requests table
    await queryRunner.query(`
      CREATE TABLE \`leave_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`employee_id\` int NOT NULL,
        \`start_date\` date NOT NULL,
        \`end_date\` date NOT NULL,
        \`status\` enum('PENDING', 'APPROVED', 'REJECTED', 'PENDING_APPROVAL') NOT NULL DEFAULT 'PENDING',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_leaveRequest_employeeId\` (\`employee_id\`),
        INDEX \`IDX_leaveRequest_status\` (\`status\`),
        INDEX \`IDX_leaveRequest_dates\` (\`start_date\`, \`end_date\`),
        INDEX \`IDX_leaveRequest_createdAt\` (\`createdAt\`),
        INDEX \`IDX_leaveRequest_employee_status\` (\`employee_id\`, \`status\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE \`employees\` 
      ADD CONSTRAINT \`FK_employee_department\` 
      FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`leave_requests\` 
      ADD CONSTRAINT \`FK_leaveRequest_employee\` 
      FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE \`leave_requests\` DROP FOREIGN KEY \`FK_leaveRequest_employee\``);
    await queryRunner.query(`ALTER TABLE \`employees\` DROP FOREIGN KEY \`FK_employee_department\``);

    // Drop tables
    await queryRunner.query(`DROP TABLE \`leave_requests\``);
    await queryRunner.query(`DROP TABLE \`employees\``);
    await queryRunner.query(`DROP TABLE \`departments\``);
  }
}
