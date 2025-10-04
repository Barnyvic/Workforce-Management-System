import { Request, Response } from 'express';
import { LeaveRequestServiceImpl } from '@/services/leave-request.service';
import { LeaveRequestStatus, PaginationParams } from '@/types';
import { AuthenticatedRequest } from '@/middleware/auth.middleware';

export class LeaveRequestController {
  private leaveRequestService: LeaveRequestServiceImpl;

  constructor(leaveRequestService?: LeaveRequestServiceImpl) {
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

  getLeaveRequestsByUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const userId = parseInt(req.params['userId'] || '0', 10);
    if (userId === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const pagination: PaginationParams = {
      page: parseInt(req.query['page'] as string) || 1,
      limit: parseInt(req.query['limit'] as string) || 10,
    };
    const result = await this.leaveRequestService.getLeaveRequestsByUser(
      userId,
      pagination
    );
    res.status(200).json(result);
  };

  getLeaveRequestsByStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const status = req.params['status'] as LeaveRequestStatus;
    if (!Object.values(LeaveRequestStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const pagination: PaginationParams = {
      page: parseInt(req.query['page'] as string) || 1,
      limit: parseInt(req.query['limit'] as string) || 10,
    };
    const result = await this.leaveRequestService.getLeaveRequestsByStatus(
      status,
      pagination
    );
    res.status(200).json(result);
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
    if (!Object.values(LeaveRequestStatus).includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const result = await this.leaveRequestService.updateLeaveRequestStatus(
      id,
      status
    );
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
  };

  getAllLeaveRequests = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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

    // Get user info from authenticated request
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // For now, we'll need to get the user's department ID from the database
    // This is a temporary solution - ideally the JWT should include departmentId
    const userInfo: { userId: number; role: string; departmentId?: number } = {
      userId: req.user.userId,
      role: req.user.role,
    };

    // TODO: Get departmentId from user service or include it in JWT
    // For now, we'll use the authorization method without departmentId for managers
    const result = await this.leaveRequestService.getAllLeaveRequestsWithAuth(
      userInfo,
      pagination
    );
    res.status(200).json(result);
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
