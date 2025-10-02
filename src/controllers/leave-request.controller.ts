import { Request, Response } from 'express';
import {
  LeaveRequestService,
  LeaveRequestServiceImpl,
} from '@/services/leave-request.service';
import { LeaveRequestStatus, PaginationParams } from '@/types';

export class LeaveRequestController {
  private leaveRequestService: LeaveRequestService;

  constructor(leaveRequestService?: LeaveRequestService) {
    this.leaveRequestService =
      leaveRequestService || new LeaveRequestServiceImpl();
  }

  createLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    const result = await this.leaveRequestService.createLeaveRequest(req.body);
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  };

  getLeaveRequestById = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] || '0', 10);
    if (id === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid leave request ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const result = await this.leaveRequestService.getLeaveRequestById(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  getLeaveRequestsByEmployee = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const employeeId = parseInt(req.params['employeeId'] || '0', 10);
    if (employeeId === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid employee ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const pagination: PaginationParams = {
      page: parseInt((req.query['page'] as string) || '1', 10),
      limit: parseInt((req.query['limit'] as string) || '10', 10),
    };

    const result = await this.leaveRequestService.getLeaveRequestsByEmployee(
      employeeId,
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

  getLeaveRequestsByStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const status = req.params['status'] as LeaveRequestStatus;
    if (!status || !Object.values(LeaveRequestStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid leave request status',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const pagination: PaginationParams = {
      page: parseInt((req.query['page'] as string) || '1', 10),
      limit: parseInt((req.query['limit'] as string) || '10', 10),
    };

    const result = await this.leaveRequestService.getLeaveRequestsByStatus(
      status,
      pagination
    );
    const statusCode = result.success ? 200 : 400;

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

  updateLeaveRequestStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const id = parseInt(req.params['id'] || '0', 10);
    if (id === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid leave request ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const { status } = req.body;
    const result = await this.leaveRequestService.updateLeaveRequestStatus(
      id,
      status
    );
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  getAllLeaveRequests = async (req: Request, res: Response): Promise<void> => {
    const result = await this.leaveRequestService.getAllLeaveRequests();
    const statusCode = result.success ? 200 : 500;
    res.status(statusCode).json(result);
  };

  deleteLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] || '0', 10);
    if (id === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid leave request ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const result = await this.leaveRequestService.deleteLeaveRequest(id);
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };
}
