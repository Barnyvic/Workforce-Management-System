import { Router } from 'express';
import Joi from 'joi';
import { DepartmentController } from '@/controllers/department.controller';
import { UserController } from '@/controllers/user.controller';
import { LeaveRequestController } from '@/controllers/leave-request.controller';
import { HealthController } from '@/controllers/health.controller';
import { CacheServiceImpl } from '@/services/cache.service';
import { QueueServiceImpl } from '@/services/queue.service';
import { validateRequest, schemas } from '@/middleware/validation.middleware';
import {
  authenticateToken,
  requireAdmin,
  requireManagerOrAdmin,
} from '@/middleware/auth.middleware';

export function createRoutes(cacheService?: CacheServiceImpl, queueService?: QueueServiceImpl): Router {
  const router = Router();

  const departmentController = new DepartmentController();
  const userController = new UserController();
  const leaveRequestController = new LeaveRequestController();
  const healthController = new HealthController(cacheService, queueService);

router.post(
  '/auth/login',
  validateRequest({ body: schemas.login }),
  userController.login
);

router.get('/auth/profile', authenticateToken, userController.getProfile);

router.post(
  '/users',
  validateRequest({ body: schemas.createUser }),
  requireAdmin,
  userController.createUser
);

router.get(
  '/users/:id',
  validateRequest({ params: schemas.idParam }),
  authenticateToken,
  userController.getUserById
);

router.get(
  '/users/:id/leave-history',
  validateRequest({ params: schemas.idParam }),
  authenticateToken,
  userController.getUserWithLeaveHistory
);

router.get(
  '/departments/:departmentId/users',
  validateRequest({
    params: Joi.object({ departmentId: schemas.idParam.extract('id') }),
    query: schemas.paginationQuery,
  }),
  authenticateToken,
  userController.getUsersByDepartment
);

router.get('/users', authenticateToken, userController.getAllUsers);

router.put(
  '/users/:id',
  validateRequest({
    params: schemas.idParam,
    body: schemas.updateUser,
  }),
  authenticateToken,
  userController.updateUser
);

router.delete(
  '/users/:id',
  validateRequest({ params: schemas.idParam }),
  requireAdmin,
  userController.deleteUser
);

router.post(
  '/departments',
  validateRequest({ body: schemas.createDepartment }),
  requireAdmin,
  departmentController.createDepartment
);

router.get(
  '/departments/:id',
  validateRequest({ params: schemas.idParam }),
  authenticateToken,
  departmentController.getDepartmentById
);

router.get(
  '/departments/:id/users',
  validateRequest({
    params: schemas.idParam,
    query: schemas.paginationQuery,
  }),
  authenticateToken,
  departmentController.getUsersByDepartment
);

router.get(
  '/departments/:id/users-with-department',
  validateRequest({ params: schemas.idParam }),
  authenticateToken,
  departmentController.getDepartmentWithUsers
);

router.get(
  '/departments',
  authenticateToken,
  departmentController.getAllDepartments
);

router.put(
  '/departments/:id',
  validateRequest({
    params: schemas.idParam,
    body: schemas.createDepartment,
  }),
  requireAdmin,
  departmentController.updateDepartment
);

router.delete(
  '/departments/:id',
  validateRequest({ params: schemas.idParam }),
  requireAdmin,
  departmentController.deleteDepartment
);

router.post(
  '/leave-requests',
  validateRequest({ body: schemas.createLeaveRequest }),
  authenticateToken,
  leaveRequestController.createLeaveRequest
);

router.get(
  '/leave-requests/:id',
  validateRequest({ params: schemas.idParam }),
  authenticateToken,
  leaveRequestController.getLeaveRequestById
);

router.get(
  '/users/:userId/leave-requests',
  validateRequest({
    params: Joi.object({ userId: schemas.idParam.extract('id') }),
    query: schemas.paginationQuery,
  }),
  authenticateToken,
  leaveRequestController.getLeaveRequestsByUser
);

router.get(
  '/leave-requests/status/:status',
  validateRequest({
    params: Joi.object({
      status: schemas.updateLeaveRequestStatus.extract('status'),
    }),
    query: schemas.paginationQuery,
  }),
  authenticateToken,
  leaveRequestController.getLeaveRequestsByStatus
);

router.put(
  '/leave-requests/:id/status',
  validateRequest({
    params: schemas.idParam,
    body: schemas.updateLeaveRequestStatus,
  }),
  requireManagerOrAdmin,
  leaveRequestController.updateLeaveRequestStatus
);

router.get(
  '/leave-requests',
  authenticateToken,
  leaveRequestController.getAllLeaveRequests
);

router.delete(
  '/leave-requests/:id',
  validateRequest({ params: schemas.idParam }),
  requireManagerOrAdmin,
  leaveRequestController.deleteLeaveRequest
);

  router.get('/health', healthController.healthCheck);
  router.get('/health/queue', healthController.queueHealth);
  router.get('/health/cache', healthController.cacheHealth);

  return router;
}

export default createRoutes();
