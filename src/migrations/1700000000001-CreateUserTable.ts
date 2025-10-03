import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUserTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
            default: "'EMPLOYEE'",
            isNullable: false,
          },
          {
            name: 'departmentId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['departmentId'],
            referencedTableName: 'departments',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_users_email\` ON \`users\` (\`email\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_users_role\` ON \`users\` (\`role\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_users_name\` ON \`users\` (\`name\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_users_departmentId\` ON \`users\` (\`departmentId\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_users_createdAt\` ON \`users\` (\`createdAt\`)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
