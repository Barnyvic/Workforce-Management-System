import { Request, Response } from 'express';
import {
  DepartmentService,
  DepartmentServiceImpl,
} from '@/services/department.service';
import { PaginationParams } from '@/types';

export class DepartmentController {
  private departmentService: DepartmentService;

  constructor(departmentService?: DepartmentService) {
    this.departmentService = departmentService || new DepartmentServiceImpl();
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

  getDepartmentWithEmployees = async (
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
    const result = await this.departmentService.getDepartmentWithEmployees(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  getEmployeesByDepartment = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const departmentId = parseInt(req.params['id'] || '0', 10);
    if (departmentId === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid department ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const pagination: PaginationParams = {
      page: parseInt((req.query['page'] as string) || '1', 10),
      limit: parseInt((req.query['limit'] as string) || '10', 10),
    };

    const result = await this.departmentService.getEmployeesByDepartment(
      departmentId,
      pagination
    );
    const statusCode = result.success ? 200 : 404;

    if (result.success && result.data) {
      const response = {
        ...result,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.data.length,
          totalPages: Math.ceil(result.data.length / pagination.limit),
        },
      };
      res.status(statusCode).json(response);
    } else {
      res.status(statusCode).json(result);
    }
  };

  getAllDepartments = async (req: Request, res: Response): Promise<void> => {
    const result = await this.departmentService.getAllDepartments();
    const statusCode = result.success ? 200 : 500;
    res.status(statusCode).json(result);
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
