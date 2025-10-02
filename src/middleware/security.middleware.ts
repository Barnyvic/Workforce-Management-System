import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '@/config/config.service';
import { logger } from '@/services/logger.service';

export const createRateLimiter = () => {
  const config = ConfigService.getInstance().getRateLimitConfig();

  return rateLimit({
    windowMs: config.windowMs,
    max: config.maxRequests,
    message: {
      success: false,
      error: 'Too many requests, please try again later',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next();
};

export const corsHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};
