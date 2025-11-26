import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/utils/logger';

/**
 * Global error handling middleware
 * Catches all errors and returns standardized error responses
 * Follows error hierarchy: AppError types have specific status codes
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error with request context
  logger.error('Request error', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  // Handle known AppError types
  if (error instanceof AppError) {
    res.status(error.statusCode).json(error.toJSON());
    return;
  }

  // Handle unexpected errors
  const statusCode = 500;
  const response = {
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
      code: 'INTERNAL_SERVER_ERROR',
      statusCode,
    },
  };

  res.status(statusCode).json(response);
};
