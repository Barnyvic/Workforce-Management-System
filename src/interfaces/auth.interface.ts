import { UserRole } from "@/types";

export interface AuthService {
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
  generateToken(
    userId: number,
    role: UserRole,
    email?: string,
    name?: string
  ): string;
  verifyToken(token: string): any;
}
