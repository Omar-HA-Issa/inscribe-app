/**
 * Base application error class with HTTP status code
 */
export class AppError extends Error {
  public readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly statusCode: number = 500,
    isOperational = true
  ) {
    super(message);
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to API response format
   */
  toJSON() {
    return {
      success: false,
      error: this.message,
      statusCode: this.statusCode,
    };
  }
}
