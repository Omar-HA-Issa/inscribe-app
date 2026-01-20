/**
 * Centralized error handling utilities
 * SOLID Principle: Single Responsibility - all error handling logic isolated
 */

/**
 * Custom error type with additional context
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly userMessage: string,
    public readonly originalError?: Error,
  ) {
    super(userMessage);
    this.name = 'ApiError';
  }
}

/**
 * Structured error response type
 */
export interface ErrorResponse {
  type: 'network' | 'auth' | 'validation' | 'server' | 'unknown';
  statusCode?: number;
  userMessage: string;
  originalError?: Error;
}

/**
 * Maps HTTP status codes to user-friendly error messages
 */
function getErrorMessageByStatus(statusCode: number, defaultMessage: string): string {
  const errorMap: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'Session expired. Please login again.',
    403: 'You do not have permission to access this resource.',
    404: 'Resource not found.',
    409: 'This resource already exists.',
    413: 'File is too large. Maximum size is 10MB.',
    422: 'Invalid data provided. Please check your input.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable. Please try again.',
    503: 'Service is under maintenance. Please try again later.',
  };

  return errorMap[statusCode] || defaultMessage;
}

/**
 * Handles and standardizes API errors
 */
export function handleApiError(error: unknown): ErrorResponse {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return {
      type: error.statusCode === 401 ? 'auth' : 'server',
      statusCode: error.statusCode,
      userMessage: error.userMessage,
      originalError: error.originalError,
    };
  }

  // Handle fetch network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      userMessage: 'Network error. Please check your connection.',
      originalError: error,
    };
  }

  // Handle standard errors
  if (error instanceof Error) {
    const message = error.message || 'An unexpected error occurred';
    return {
      type: 'unknown',
      userMessage: message,
      originalError: error,
    };
  }

  // Handle unknown error types
  return {
    type: 'unknown',
    userMessage: 'An unexpected error occurred. Please try again.',
    originalError: undefined,
  };
}

/**
 * Extracts error message from various response types
 */
export function extractErrorMessage(response: unknown): string {
  if (typeof response === 'string') {
    return response;
  }

  if (typeof response === 'object' && response !== null) {
    const res = response as { message?: string; error?: string; userMessage?: string };
    return (
      res.message ||
      res.error ||
      res.userMessage ||
      'An error occurred'
    );
  }

  return 'An unexpected error occurred';
}

/**
 * Logs error with development check
 */
export function logError(
  context: string,
  error: unknown,
  isDev: boolean = import.meta.env.DEV,
): void {
  if (!isDev) return;

  console.error(`[${context}]`, error);
}
