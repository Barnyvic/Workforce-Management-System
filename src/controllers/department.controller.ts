import { Request, Response } from 'express';
import { DepartmentServiceImpl } from '@/services/department.service';
import { CacheService } from '@/interfaces/cache.interface';

export class DepartmentController {
  private departmentService: DepartmentServiceImpl;

  constructor(
    cacheService?: CacheService,
    departmentService?: DepartmentServiceImpl
  ) {
    this.departmentService =
      departmentService || new DepartmentServiceImpl(undefined, cacheService);
  }

  createDepartment = async (req: Request, res: Response): Promise<void> => {
    const result = await this.departmentService.createDepartment(req.body);
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  };

  getDepartmentById = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] || '0', 10);
    if (id === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid department ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const result = await this.departmentService.getDepartmentById(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  getUsersByDepartment = async (req: Request, res: Response): Promise<void> => {
    const departmentId = parseInt(req.params['id'] || '0', 10);
    if (departmentId === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid department ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const pagination = {
      page: parseInt(req.query['page'] as string) || 1,
      limit: parseInt(req.query['limit'] as string) || 10,
    };
    const result = await this.departmentService.getUsersByDepartment(
      departmentId,
      pagination
    );
    res.status(200).json(result);
  };

  getDepartmentWithUsers = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const id = parseInt(req.params['id'] || '0', 10);
    if (id === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid department ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await this.departmentService.getDepartmentWithUsers(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  getAllDepartments = async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query['page'] as string) || undefined;
    const limit = parseInt(req.query['limit'] as string) || undefined;

    let pagination;
    if (page && limit) {
      if (page < 1 || limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error:
            'Invalid pagination parameters. Page must be >= 1, limit must be 1-100',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      pagination = { page, limit };
    }

    const result = await this.departmentService.getAllDepartments(pagination);
    res.status(200).json(result);
  };

  updateDepartment = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] || '0', 10);
    if (id === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid department ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const result = await this.departmentService.updateDepartment(id, req.body);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  deleteDepartment = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] || '0', 10);
    if (id === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid department ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const result = await this.departmentService.deleteDepartment(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };
}
