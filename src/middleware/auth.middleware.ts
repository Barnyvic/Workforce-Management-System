import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/types';
import { UserServiceImpl } from '@/services/user.service';
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

    const userService = new UserServiceImpl();
    const result = await userService.validateToken(token);

    if (!result.success || !result.data) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.user = {
      userId: result.data.userId,
      role: result.data.role as UserRole,
      email: result.data.email,
      name: result.data.name,
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
