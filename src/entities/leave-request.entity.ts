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
    const startDate =
      this.startDate instanceof Date
        ? this.startDate
        : new Date(this.startDate);
    const endDate =
      this.endDate instanceof Date ? this.endDate : new Date(this.endDate);
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }

  /**
   * Returns a safe version of the leave request object with safe user data
   */
  toSafeObject() {
    return {
      ...this,
      user: this.user ? this.user.toSafeObject() : undefined,
    };
  }
}
