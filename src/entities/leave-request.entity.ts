import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Employee } from './employee.entity';
import { LeaveRequestStatus } from '@/types';

@Entity('leave_requests')
@Index(['employeeId'])
@Index(['status'])
@Index(['startDate', 'endDate'])
@Index(['createdAt'])
@Index(['employeeId', 'status'])
export class LeaveRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'employee_id' })
  employeeId!: number;

  @Column({ type: 'date', name: 'start_date' })
  startDate!: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate!: Date;

  @Column({
    type: 'enum',
    enum: LeaveRequestStatus,
    default: LeaveRequestStatus.PENDING,
  })
  status!: LeaveRequestStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Employee, (employee) => employee.leaveRequests)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  get durationInDays(): number {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }
}
