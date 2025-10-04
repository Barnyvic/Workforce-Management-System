import { Request, Response } from 'express';
import { UserServiceImpl } from '@/services/user.service';
import { CacheServiceImpl } from '@/services/cache.service';
import { AuthenticatedRequest } from '@/middleware/auth.middleware';

export class UserController {
  private userService: UserServiceImpl;

  constructor(cacheService?: CacheServiceImpl, userService?: UserServiceImpl) {
    this.userService =
      userService ||
      new UserServiceImpl(undefined, undefined, undefined, cacheService);
  }

  createUser = async (req: Request, res: Response): Promise<void> => {
    const result = await this.userService.createUser(req.body);
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] || '0');
    if (isNaN(id) || id <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await this.userService.getUserById(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  getUserWithLeaveHistory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const id = parseInt(req.params['id'] || '0');
    if (isNaN(id) || id <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await this.userService.getUserWithLeaveHistory(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  getUsersByDepartment = async (req: Request, res: Response): Promise<void> => {
    const departmentId = parseInt(req.params['departmentId'] || '0');
    if (isNaN(departmentId) || departmentId <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid department ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 10;

    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await this.userService.getUsersByDepartment(departmentId, {
      page,
      limit,
    });
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    const pagination =
      req.query['page'] && req.query['limit']
        ? {
            page: parseInt(req.query['page'] as string),
            limit: parseInt(req.query['limit'] as string),
          }
        : undefined;

    const result = await this.userService.getAllUsers(pagination);
    res.status(200).json(result);
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] || '0');
    if (isNaN(id) || id <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await this.userService.updateUser(id, req.body);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] || '0');
    if (isNaN(id) || id <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await this.userService.deleteUser(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.userService.login(req.body);
    const statusCode = result.success ? 200 : 401;
    res.status(statusCode).json(result);
  };

  getProfile = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await this.userService.getUserById(req.user.userId);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };
}
