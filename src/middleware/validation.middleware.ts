import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponse } from '@/types';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details.map((d) => d.message).join(', ')}`);
      }
    }

    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details.map((d) => d.message).join(', ')}`);
      }
    }

    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(
          `Params: ${error.details.map((d) => d.message).join(', ')}`
        );
      }
    }

    if (errors.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: `Validation failed: ${errors.join('; ')}`,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    next();
  };
};

export const schemas = {
  idParam: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),

  createDepartment: Joi.object({
    name: Joi.string().min(2).max(255).required(),
  }),

  createEmployee: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().required(),
    departmentId: Joi.number().integer().positive().required(),
  }),

  createLeaveRequest: Joi.object({
    employeeId: Joi.number().integer().positive().required(),
    startDate: Joi.date().iso().greater('now').required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  }),

  updateLeaveRequestStatus: Joi.object({
    status: Joi.string()
      .valid('PENDING', 'APPROVED', 'REJECTED', 'PENDING_APPROVAL')
      .required(),
  }),
};
