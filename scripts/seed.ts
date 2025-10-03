import 'reflect-metadata';
import { AppDataSource } from '../src/config/data-source';
import { Department } from '../src/entities/department.entity';
import { User } from '../src/entities/user.entity';
import { LeaveRequest } from '../src/entities/leave-request.entity';
import { UserRole, LeaveRequestStatus } from '../src/types';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established successfully.');

    const departmentRepository = AppDataSource.getRepository(Department);
    const userRepository = AppDataSource.getRepository(User);
    const leaveRequestRepository = AppDataSource.getRepository(LeaveRequest);

    const departments = [
      { name: 'Engineering' },
      { name: 'Human Resources' },
      { name: 'Marketing' },
      { name: 'Sales' },
      { name: 'Finance' },
    ];

    const createdDepartments = await departmentRepository.save(departments);
    console.log('Departments created:', createdDepartments.length);

    const hashedPassword = await bcrypt.hash('password123', 12);

    const users = [
      {
        name: 'Admin User',
        email: 'admin@company.com',
        password: hashedPassword,
        role: UserRole.ADMIN,
        departmentId: createdDepartments[0].id,
      },
      {
        name: 'Manager User',
        email: 'manager@company.com',
        password: hashedPassword,
        role: UserRole.MANAGER,
        departmentId: createdDepartments[0].id,
      },
      {
        name: 'John Doe',
        email: 'john.doe@company.com',
        password: hashedPassword,
        role: UserRole.EMPLOYEE,
        departmentId: createdDepartments[0].id,
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        password: hashedPassword,
        role: UserRole.EMPLOYEE,
        departmentId: createdDepartments[0].id,
      },
      {
        name: 'Bob Johnson',
        email: 'bob.johnson@company.com',
        password: hashedPassword,
        role: UserRole.EMPLOYEE,
        departmentId: createdDepartments[1].id,
      },
      {
        name: 'Alice Brown',
        email: 'alice.brown@company.com',
        password: hashedPassword,
        role: UserRole.EMPLOYEE,
        departmentId: createdDepartments[2].id,
      },
      {
        name: 'Charlie Wilson',
        email: 'charlie.wilson@company.com',
        password: hashedPassword,
        role: UserRole.EMPLOYEE,
        departmentId: createdDepartments[3].id,
      },
    ];

    const createdUsers = await userRepository.save(users);
    console.log('Users created:', createdUsers.length);

    const leaveRequests = [
      {
        userId: createdUsers[2].id,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-02'),
        status: LeaveRequestStatus.APPROVED,
      },
      {
        userId: createdUsers[3].id,
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-02-20'),
        status: LeaveRequestStatus.PENDING,
      },
      {
        userId: createdUsers[4].id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-01'),
        status: LeaveRequestStatus.APPROVED,
      },
    ];

    const createdLeaveRequests =
      await leaveRequestRepository.save(leaveRequests);
    console.log('Leave requests created:', createdLeaveRequests.length);

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

seedDatabase();
