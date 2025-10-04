import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ConfigService } from '@/config/config.service';
import { UserRole } from '@/types';

export interface AuthService {
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
  generateToken(userId: number, role: UserRole): string;
  verifyToken(token: string): any;
}

export class AuthServiceImpl implements AuthService {
  private config = ConfigService.getInstance();

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(userId: number, role: UserRole): string {
    const jwtConfig = this.config.getJwtConfig();
    const payload = { userId, role };
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn as any,
    });
  }

  verifyToken(token: string): any {
    const jwtConfig = this.config.getJwtConfig();
    return jwt.verify(token, jwtConfig.secret);
  }
}
