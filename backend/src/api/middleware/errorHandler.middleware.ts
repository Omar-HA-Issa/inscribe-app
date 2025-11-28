import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../../shared/errors';
import { logger } from '../../shared/utils/logger';

/**
 * Global error handler middleware
 * Converts errors to HTTP responses with proper status codes
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ValidationError) {
    logger.warn('Validation error', {
      path: req.path,
      method: req.method,
      errors: err.errors,
    });

    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 400 && err.statusCode < 500) {
      logger.warn('Client error', {
        path: req.path,
        method: req.method,
        statusCode: err.statusCode,
        message: err.message,
      });
    } else {
      logger.error('Server error', {
        path: req.path,
        method: req.method,
        statusCode: err.statusCode,
        message: err.message,
        stack: err.stack,
      });
    }

    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Unhandled errors
  logger.error('Unhandled error', {
    path: req.path,
    method: req.method,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
};
