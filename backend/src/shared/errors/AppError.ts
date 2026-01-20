/**
 * Base application error class with HTTP status code
 */
export class AppError extends Error {
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    public readonly statusCode: number = 500,
    isOperationalOrCode: boolean | string = true
  ) {
    super(message);

    // Handle both boolean (isOperational) and string (error code) as third param
    if (typeof isOperationalOrCode === 'string') {
      this.isOperational = true;
      this.code = isOperationalOrCode;
    } else {
      this.isOperational = isOperationalOrCode;
    }

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
      ...(this.code && { code: this.code }),
    };
  }
}
