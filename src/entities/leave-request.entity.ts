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
import { User } from './user.entity';
import { LeaveRequestStatus } from '@/types';

@Entity('leave_requests')
@Index(['userId'])
@Index(['status'])
@Index(['startDate', 'endDate'])
@Index(['createdAt'])
@Index(['userId', 'status'])
export class LeaveRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ type: 'date', name: 'start_date' })
  startDate!: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate!: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'PENDING',
  })
  status!: LeaveRequestStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.leaveRequests)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  get durationInDays(): number {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }
}
