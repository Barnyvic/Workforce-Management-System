import { AuthServiceImpl } from '@/services/auth.service';
import { UserRole } from '@/types';

jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('AuthService', () => {
  let authService: AuthServiceImpl;

  beforeEach(() => {
    authService = new AuthServiceImpl();
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const bcrypt = require('bcryptjs');
      bcrypt.hash = jest.fn().mockResolvedValue('hashedpassword123');

      const result = await authService.hashPassword('password123');

      expect(result).toBe('hashedpassword123');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should handle hashing errors', async () => {
      const bcrypt = require('bcryptjs');
      bcrypt.hash = jest.fn().mockRejectedValue(new Error('Hashing failed'));

      await expect(authService.hashPassword('password123')).rejects.toThrow(
        'Hashing failed'
      );
    });
  });

  describe('comparePassword', () => {
    it('should compare password successfully', async () => {
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const result = await authService.comparePassword(
        'password123',
        'hashedpassword123'
      );

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedpassword123'
      );
    });

    it('should return false for incorrect password', async () => {
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const result = await authService.comparePassword(
        'wrongpassword',
        'hashedpassword123'
      );

      expect(result).toBe(false);
    });

    it('should handle comparison errors', async () => {
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest
        .fn()
        .mockRejectedValue(new Error('Comparison failed'));

      await expect(
        authService.comparePassword('password123', 'hashedpassword123')
      ).rejects.toThrow('Comparison failed');
    });
  });

  describe('generateToken', () => {
    it('should generate token successfully', () => {
      const jwt = require('jsonwebtoken');
      jwt.sign = jest.fn().mockReturnValue('mock-jwt-token');

      const result = authService.generateToken(1, UserRole.EMPLOYEE);

      expect(result).toBe('mock-jwt-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 1, role: UserRole.EMPLOYEE },
        'your-super-secret-jwt-key',
        { expiresIn: 24 }
      );
    });

    it('should handle token generation errors', () => {
      const jwt = require('jsonwebtoken');
      jwt.sign = jest.fn().mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      expect(() => authService.generateToken(1, UserRole.EMPLOYEE)).toThrow(
        'Token generation failed'
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify token successfully', () => {
      const jwt = require('jsonwebtoken');
      const mockPayload = {
        userId: 1,
        email: 'john@example.com',
        role: UserRole.EMPLOYEE,
        name: 'John Doe',
      };

      jwt.verify = jest.fn().mockReturnValue(mockPayload);

      const result = authService.verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith(
        'valid-token',
        'your-super-secret-jwt-key'
      );
    });

    it('should handle invalid token', () => {
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => authService.verifyToken('invalid-token')).toThrow(
        'Invalid token'
      );
    });

    it('should handle expired token', () => {
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Token expired');
      });

      expect(() => authService.verifyToken('expired-token')).toThrow(
        'Token expired'
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token successfully', () => {
      const jwt = require('jsonwebtoken');
      jwt.sign = jest.fn().mockReturnValue('mock-refresh-token');

      const result = authService.generateToken(1, UserRole.EMPLOYEE);

      expect(result).toBe('mock-refresh-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 1, role: UserRole.EMPLOYEE },
        'your-super-secret-jwt-key',
        { expiresIn: 24 }
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify refresh token successfully', () => {
      const jwt = require('jsonwebtoken');
      const mockPayload = {
        userId: 1,
        role: UserRole.EMPLOYEE,
      };

      jwt.verify = jest.fn().mockReturnValue(mockPayload);

      const result = authService.verifyToken('valid-refresh-token');

      expect(result).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith(
        'valid-refresh-token',
        'your-super-secret-jwt-key'
      );
    });

    it('should handle invalid refresh token', () => {
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid refresh token');
      });

      expect(() => authService.verifyToken('invalid-refresh-token')).toThrow(
        'Invalid refresh token'
      );
    });
  });
});
