import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/types';
import { AuthServiceImpl } from '@/services/auth.service';
import { logger } from '@/services/logger.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: UserRole;
    email: string;
    name: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const authService = new AuthServiceImpl();
    const decoded = authService.verifyToken(token);

    req.user = {
      userId: decoded.userId,
      role: decoded.role as UserRole,
      email: decoded.email || '',
      name: decoded.name || '',
    };
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      timestamp: new Date().toISOString(),
    });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles,
      });
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requireManagerOrAdmin = requireRole([
  UserRole.MANAGER,
  UserRole.ADMIN,
]);
export const requireEmployeeOrAbove = requireRole([
  UserRole.EMPLOYEE,
  UserRole.MANAGER,
  UserRole.ADMIN,
]);
