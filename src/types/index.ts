export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMetadata;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface RabbitMQConfig {
  url: string;
  queueName: string;
  dlqName: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  rabbitmq: RabbitMQConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: string;
    file: string;
  };
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  departmentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  leaveRequests?: SafeLeaveRequest[];
  department?: SafeDepartment;
}

export interface SafeLeaveRequest {
  id: number;
  userId: number;
  startDate: Date;
  endDate: Date;
  status: LeaveRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  durationInDays: number;
}

export interface SafeDepartment {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  users?: SafeUser[];
}

export enum LeaveRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs: number;
}

export interface QueueMessage {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  retryCount?: number;
}
