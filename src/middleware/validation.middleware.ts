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

  createUser: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('ADMIN', 'MANAGER', 'EMPLOYEE').required(),
    departmentId: Joi.number().integer().positive().optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateUser: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).optional(),
    role: Joi.string().valid('ADMIN', 'MANAGER', 'EMPLOYEE').optional(),
    departmentId: Joi.number().integer().positive().optional(),
  }),

  createLeaveRequest: Joi.object({
    userId: Joi.number().integer().positive().required(),
    startDate: Joi.date().iso().greater('now').required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  }),

  updateLeaveRequestStatus: Joi.object({
    status: Joi.string()
      .valid('PENDING', 'APPROVED', 'REJECTED', 'PENDING_APPROVAL')
      .required(),
  }),
};
