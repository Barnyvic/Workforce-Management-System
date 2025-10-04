import { Repository, FindManyOptions, In, DataSource } from 'typeorm';
import { LeaveRequest } from '@/entities/leave-request.entity';
import { LeaveRequestStatus, PaginationParams } from '@/types';
import { dataSource } from '@/config/database';
import { LeaveRequestRepository } from '@/interfaces/repository.interfaces';

export class LeaveRequestRepositoryImpl implements LeaveRequestRepository {
  private repository: Repository<LeaveRequest>;

  constructor(customDataSource?: DataSource) {
    const ds = customDataSource || dataSource;
    this.repository = ds.getRepository(LeaveRequest);
  }

  async findById(id: number): Promise<LeaveRequest | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByUserId(
    userId: number,
    pagination?: PaginationParams
  ): Promise<{ leaveRequests: LeaveRequest[]; total: number }> {
    const options: FindManyOptions<LeaveRequest> = {
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    };

    if (pagination) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      options.skip = skip;
      options.take = limit;
    }

    const [leaveRequests, total] = await this.repository.findAndCount(options);
    return { leaveRequests, total };
  }

  async findByStatus(
    status: LeaveRequestStatus,
    pagination?: PaginationParams
  ): Promise<{ leaveRequests: LeaveRequest[]; total: number }> {
    const options: FindManyOptions<LeaveRequest> = {
      where: { status },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    };

    if (pagination) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      options.skip = skip;
      options.take = limit;
    }

    const [leaveRequests, total] = await this.repository.findAndCount(options);
    return { leaveRequests, total };
  }

  async findPendingRequests(): Promise<LeaveRequest[]> {
    return this.repository.find({
      where: { status: LeaveRequestStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOverlappingRequests(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<LeaveRequest[]> {
    const existingRequests = await this.repository.find({
      where: {
        userId,
        status: In([
          LeaveRequestStatus.PENDING,
          LeaveRequestStatus.APPROVED,
          LeaveRequestStatus.PENDING_APPROVAL,
        ]),
      },
    });

    return existingRequests.filter((request) => {
      const requestStart = new Date(request.startDate);
      const requestEnd = new Date(request.endDate);

      return requestStart <= endDate && requestEnd >= startDate;
    });
  }

  async findAll(
    options: FindManyOptions<LeaveRequest> = {}
  ): Promise<LeaveRequest[]> {
    return this.repository.find({
      ...options,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const leaveRequest = this.repository.create(data);
    return this.repository.save(leaveRequest);
  }

  async update(id: number, data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Leave request not found after update');
    }
    return updated;
  }

  async updateStatus(
    id: number,
    status: LeaveRequestStatus
  ): Promise<LeaveRequest> {
    return this.update(id, { status });
  }

  async delete(id: number): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new Error('Leave request not found');
    }
  }

  async count(options: FindManyOptions<LeaveRequest> = {}): Promise<number> {
    return this.repository.count(options);
  }
}
