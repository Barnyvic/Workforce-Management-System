import { DataSource } from 'typeorm';
import { UserServiceImpl } from '@/services/user.service';
import { DepartmentServiceImpl } from '@/services/department.service';
import { LeaveRequestServiceImpl } from '@/services/leave-request.service';
import { AuthServiceImpl } from '@/services/auth.service';
import { CacheServiceImpl } from '@/services/cache.service';
import { QueueServiceImpl } from '@/services/queue.service';
import { CacheService } from '@/interfaces/cache.interface';
import { UserRepositoryImpl } from '@/repositories/user.repository';
import { DepartmentRepositoryImpl } from '@/repositories/department.repository';
import { LeaveRequestRepositoryImpl } from '@/repositories/leave-request.repository';
import { dataSource } from '@/config/database';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private _dataSource: DataSource;

  private _userRepository?: UserRepositoryImpl;
  private _departmentRepository?: DepartmentRepositoryImpl;
  private _leaveRequestRepository?: LeaveRequestRepositoryImpl;

  private _authService?: AuthServiceImpl;
  private _cacheService?: CacheService;
  private _queueService?: QueueServiceImpl;
  private _userService?: UserServiceImpl;
  private _departmentService?: DepartmentServiceImpl;
  private _leaveRequestService?: LeaveRequestServiceImpl;

  private constructor(customDataSource?: DataSource) {
    this._dataSource = customDataSource || dataSource;
  }

  public static getInstance(customDataSource?: DataSource): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer(customDataSource);
    }
    return ServiceContainer.instance;
  }

  public static reset(): void {
    ServiceContainer.instance = undefined as any;
  }

  public setDataSource(dataSource: DataSource): void {
    this._dataSource = dataSource;
    delete this._userRepository;
    delete this._departmentRepository;
    delete this._leaveRequestRepository;
    delete this._userService;
    delete this._departmentService;
    delete this._leaveRequestService;
  }

  public setCacheService(cacheService: CacheService): void {
    this._cacheService = cacheService;
    delete this._userService;
    delete this._departmentService;
    delete this._leaveRequestService;
  }

  public get userRepository(): UserRepositoryImpl {
    if (!this._userRepository) {
      this._userRepository = new UserRepositoryImpl(this._dataSource);
    }
    return this._userRepository;
  }

  public get departmentRepository(): DepartmentRepositoryImpl {
    if (!this._departmentRepository) {
      this._departmentRepository = new DepartmentRepositoryImpl(
        this._dataSource
      );
    }
    return this._departmentRepository;
  }

  public get leaveRequestRepository(): LeaveRequestRepositoryImpl {
    if (!this._leaveRequestRepository) {
      this._leaveRequestRepository = new LeaveRequestRepositoryImpl(
        this._dataSource
      );
    }
    return this._leaveRequestRepository;
  }

  public get authService(): AuthServiceImpl {
    if (!this._authService) {
      this._authService = new AuthServiceImpl();
    }
    return this._authService;
  }

  public get cacheService(): CacheService {
    if (!this._cacheService) {
      this._cacheService = new CacheServiceImpl();
    }
    return this._cacheService;
  }

  public get queueService(): QueueServiceImpl {
    if (!this._queueService) {
      this._queueService = new QueueServiceImpl();
    }
    return this._queueService;
  }

  public get userService(): UserServiceImpl {
    if (!this._userService) {
      this._userService = new UserServiceImpl(
        this.userRepository,
        this.departmentRepository,
        this.authService,
        this.cacheService
      );
    }
    return this._userService;
  }

  public get departmentService(): DepartmentServiceImpl {
    if (!this._departmentService) {
      this._departmentService = new DepartmentServiceImpl(
        this.departmentRepository,
        this.cacheService
      );
    }
    return this._departmentService;
  }

  public get leaveRequestService(): LeaveRequestServiceImpl {
    if (!this._leaveRequestService) {
      this._leaveRequestService = new LeaveRequestServiceImpl(
        this.leaveRequestRepository,
        this.userRepository,
        this.queueService,
        this.cacheService
      );
    }
    return this._leaveRequestService;
  }
}

export const serviceContainer = ServiceContainer.getInstance();
