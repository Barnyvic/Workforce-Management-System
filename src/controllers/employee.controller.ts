import { Request, Response } from 'express';
import {
  EmployeeService,
  EmployeeServiceImpl,
} from '@/services/employee.service';
import { PaginationParams } from '@/types';

export class EmployeeController {
  private employeeService: EmployeeService;

  constructor(employeeService?: EmployeeService) {
    this.employeeService = employeeService || new EmployeeServiceImpl();
  }

  createEmployee = async (req: Request, res: Response): Promise<void> => {
    const result = await this.employeeService.createEmployee(req.body);
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  };

  getEmployeeById = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] || '0', 10);
    if (id === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid employee ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const result = await this.employeeService.getEmployeeById(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  getEmployeeWithLeaveHistory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const id = parseInt(req.params['id'] || '0', 10);
    if (id === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid employee ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const result = await this.employeeService.getEmployeeWithLeaveHistory(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  getEmployeesByDepartment = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const departmentId = parseInt(req.params['departmentId'] || '0', 10);
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

    const result = await this.employeeService.getEmployeesByDepartment(
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

  getAllEmployees = async (req: Request, res: Response): Promise<void> => {
    const result = await this.employeeService.getAllEmployees();
    const statusCode = result.success ? 200 : 500;
    res.status(statusCode).json(result);
  };

  updateEmployee = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] || '0', 10);
    if (id === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid employee ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const result = await this.employeeService.updateEmployee(id, req.body);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  deleteEmployee = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] || '0', 10);
    if (id === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid employee ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const result = await this.employeeService.deleteEmployee(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };
}
