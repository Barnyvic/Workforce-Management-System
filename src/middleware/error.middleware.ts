import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types';
import { ConfigService } from '@/config/config.service';
import { logger } from '@/services/logger.service';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error:', error);

  const config = ConfigService.getInstance();
  const response: ApiResponse = {
    success: false,
    error: config.isProduction() ? 'Internal server error' : error.message,
    timestamp: new Date().toISOString(),
  };

  if (error.name === 'ValidationError') {
    res.status(400).json(response);
    return;
  }

  if (error.name === 'QueryFailedError') {
    response.error = 'Database query failed';
    res.status(400).json(response);
    return;
  }

  if (error.name === 'EntityNotFoundError') {
    response.error = 'Resource not found';
    res.status(404).json(response);
    return;
  }

  if (error.name === 'CannotCreateEntityIdMapError') {
    response.error = 'Invalid entity data';
    res.status(400).json(response);
    return;
  }

  res.status(500).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  };
  res.status(404).json(response);
};
