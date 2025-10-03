import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Department } from './department.entity';
import { LeaveRequest } from './leave-request.entity';
import { UserRole } from '@/types';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['role'])
@Index(['name'])
@Index(['departmentId'])
@Index(['createdAt'])
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role!: UserRole;

  @Column({ type: 'int', nullable: true })
  departmentId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Department, (department) => department.users)
  @JoinColumn({ name: 'departmentId' })
  department!: Department;

  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.user)
  leaveRequests!: LeaveRequest[];
}
