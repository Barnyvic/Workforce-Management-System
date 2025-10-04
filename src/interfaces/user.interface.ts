export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: string;
  departmentId?: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    departmentId?: number | undefined;
  };
}

export interface UserService {
  createUser(
    data: CreateUserDto
  ): Promise<import('@/types').ApiResponse<import('@/types').SafeUser>>;
  getUserById(
    id: number
  ): Promise<import('@/types').ApiResponse<import('@/types').SafeUser>>;
  getUserWithLeaveHistory(
    id: number
  ): Promise<import('@/types').ApiResponse<import('@/types').SafeUser>>;
  getUsersByDepartment(
    departmentId: number,
    pagination: import('@/types').PaginationParams
  ): Promise<import('@/types').PaginatedResponse<import('@/types').SafeUser>>;
  getAllUsers(
    pagination?: import('@/types').PaginationParams
  ): Promise<
    | import('@/types').ApiResponse<import('@/types').SafeUser[]>
    | import('@/types').PaginatedResponse<import('@/types').SafeUser>
  >;
  updateUser(
    id: number,
    data: Partial<CreateUserDto>
  ): Promise<import('@/types').ApiResponse<import('@/types').SafeUser>>;
  deleteUser(id: number): Promise<import('@/types').ApiResponse<void>>;
  login(data: LoginDto): Promise<import('@/types').ApiResponse<AuthResponse>>;
  validateToken(token: string): Promise<
    import('@/types').ApiResponse<{
      userId: number;
      role: string;
      email: string;
      name: string;
    }>
  >;
}
