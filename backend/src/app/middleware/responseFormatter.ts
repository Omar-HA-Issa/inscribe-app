import { Request, Response, NextFunction } from 'express';

/**
 * Standardized API response formatter
 * Ensures all API responses follow consistent structure
 * Implements the envelope pattern for API responses
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    statusCode: number;
  };
  timestamp: string;
  path: string;
  method: string;
}

/**
 * Send standardized success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    path: res.req.path,
    method: res.req.method,
  };
  res.status(statusCode).json(response);
};

/**
 * Send standardized error response
 */
export const sendError = (
  res: Response,
  message: string,
  code: string,
  statusCode: number = 500
): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code,
      statusCode,
    },
    timestamp: new Date().toISOString(),
    path: res.req.path,
    method: res.req.method,
  };
  res.status(statusCode).json(response);
};

/**
 * Add helper methods to Response object
 */
export const responseFormatterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.sendSuccess = function <T>(data: T, statusCode = 200) {
    sendSuccess(this, data, statusCode);
  };

  res.sendError = function (message: string, code: string, statusCode = 500) {
    sendError(this, message, code, statusCode);
  };

  next();
};

// Extend Express Response type
declare global {
  namespace Express {
    interface Response {
      sendSuccess: <T>(data: T, statusCode?: number) => void;
      sendError: (message: string, code: string, statusCode?: number) => void;
    }
  }
}
