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
  createUser(data: CreateUserDto): Promise<any>;
  getUserById(id: number): Promise<any>;
  getUserWithLeaveHistory(id: number): Promise<any>;
  getUsersByDepartment(departmentId: number, pagination: any): Promise<any>;
  getAllUsers(): Promise<any>;
  updateUser(id: number, data: Partial<CreateUserDto>): Promise<any>;
  deleteUser(id: number): Promise<any>;
  login(data: LoginDto): Promise<any>;
  validateToken(token: string): Promise<any>;
}
