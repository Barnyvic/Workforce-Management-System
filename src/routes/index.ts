import { Router } from 'express';
import Joi from 'joi';
import { DepartmentController } from '@/controllers/department.controller';
import { EmployeeController } from '@/controllers/employee.controller';
import { LeaveRequestController } from '@/controllers/leave-request.controller';
import { HealthController } from '@/controllers/health.controller';
import { validateRequest, schemas } from '@/middleware/validation.middleware';

const router = Router();

const departmentController = new DepartmentController();
const employeeController = new EmployeeController();
const leaveRequestController = new LeaveRequestController();
const healthController = new HealthController();

router.post(
  '/departments',
  validateRequest({ body: schemas.createDepartment }),
  departmentController.createDepartment
);

router.get(
  '/departments/:id',
  validateRequest({ params: schemas.idParam }),
  departmentController.getDepartmentById
);

router.get(
  '/departments/:id/employees',
  validateRequest({
    params: schemas.idParam,
    query: schemas.paginationQuery,
  }),
  departmentController.getEmployeesByDepartment
);

router.get(
  '/departments/:id/employees-with-department',
  validateRequest({ params: schemas.idParam }),
  departmentController.getDepartmentWithEmployees
);

router.get('/departments', departmentController.getAllDepartments);

router.put(
  '/departments/:id',
  validateRequest({
    params: schemas.idParam,
    body: schemas.createDepartment,
  }),
  departmentController.updateDepartment
);

router.delete(
  '/departments/:id',
  validateRequest({ params: schemas.idParam }),
  departmentController.deleteDepartment
);

router.post(
  '/employees',
  validateRequest({ body: schemas.createEmployee }),
  employeeController.createEmployee
);

router.get(
  '/employees/:id',
  validateRequest({ params: schemas.idParam }),
  employeeController.getEmployeeById
);

router.get(
  '/employees/:id/leave-history',
  validateRequest({ params: schemas.idParam }),
  employeeController.getEmployeeWithLeaveHistory
);

router.get(
  '/departments/:departmentId/employees',
  validateRequest({
    params: Joi.object({ departmentId: schemas.idParam.extract('id') }),
    query: schemas.paginationQuery,
  }),
  employeeController.getEmployeesByDepartment
);

router.get('/employees', employeeController.getAllEmployees);

router.put(
  '/employees/:id',
  validateRequest({
    params: schemas.idParam,
    body: schemas.createEmployee,
  }),
  employeeController.updateEmployee
);

router.delete(
  '/employees/:id',
  validateRequest({ params: schemas.idParam }),
  employeeController.deleteEmployee
);

router.post(
  '/leave-requests',
  validateRequest({ body: schemas.createLeaveRequest }),
  leaveRequestController.createLeaveRequest
);

router.get(
  '/leave-requests/:id',
  validateRequest({ params: schemas.idParam }),
  leaveRequestController.getLeaveRequestById
);

router.get(
  '/employees/:employeeId/leave-requests',
  validateRequest({
    params: Joi.object({ employeeId: schemas.idParam.extract('id') }),
    query: schemas.paginationQuery,
  }),
  leaveRequestController.getLeaveRequestsByEmployee
);

router.get(
  '/leave-requests/status/:status',
  validateRequest({
    params: Joi.object({
      status: schemas.updateLeaveRequestStatus.extract('status'),
    }),
    query: schemas.paginationQuery,
  }),
  leaveRequestController.getLeaveRequestsByStatus
);

router.put(
  '/leave-requests/:id/status',
  validateRequest({
    params: schemas.idParam,
    body: schemas.updateLeaveRequestStatus,
  }),
  leaveRequestController.updateLeaveRequestStatus
);

router.get('/leave-requests', leaveRequestController.getAllLeaveRequests);

router.delete(
  '/leave-requests/:id',
  validateRequest({ params: schemas.idParam }),
  leaveRequestController.deleteLeaveRequest
);

router.get('/health', healthController.healthCheck);
router.get('/health/queue', healthController.queueHealth);
router.get('/health/cache', healthController.cacheHealth);

export default router;
