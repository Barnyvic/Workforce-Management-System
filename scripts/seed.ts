import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Department } from '../entities/department.entity';
import { Employee } from '../entities/employee.entity';
import { AppDataSource } from '../config/data-source';

async function seedDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established successfully.');

    const departmentRepository = AppDataSource.getRepository(Department);
    const employeeRepository = AppDataSource.getRepository(Employee);

    // Create departments
    const departments = [
      { name: 'Engineering' },
      { name: 'Human Resources' },
      { name: 'Marketing' },
      { name: 'Sales' },
      { name: 'Finance' },
    ];

    const createdDepartments = await departmentRepository.save(departments);
    console.log('Departments created:', createdDepartments.length);

    // Create employees
    const employees = [
      {
        name: 'John Doe',
        email: 'john.doe@company.com',
        departmentId: createdDepartments[0].id,
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        departmentId: createdDepartments[0].id,
      },
      {
        name: 'Bob Johnson',
        email: 'bob.johnson@company.com',
        departmentId: createdDepartments[1].id,
      },
      {
        name: 'Alice Brown',
        email: 'alice.brown@company.com',
        departmentId: createdDepartments[2].id,
      },
      {
        name: 'Charlie Wilson',
        email: 'charlie.wilson@company.com',
        departmentId: createdDepartments[3].id,
      },
    ];

    const createdEmployees = await employeeRepository.save(employees);
    console.log('Employees created:', createdEmployees.length);

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

seedDatabase();
