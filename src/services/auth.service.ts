import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ConfigService } from '@/config/config.service';
import { UserRole } from '@/types';
import { AuthService } from '@/interfaces/auth.interface';


export class AuthServiceImpl implements AuthService {
  private config = ConfigService.getInstance();

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(
    userId: number,
    role: UserRole,
    email?: string,
    name?: string
  ): string {
    const jwtConfig = this.config.getJwtConfig();
    const payload = { userId, role, email, name };
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn as any,
    });
  }

  verifyToken(token: string): any {
    const jwtConfig = this.config.getJwtConfig();
    return jwt.verify(token, jwtConfig.secret);
  }
}
