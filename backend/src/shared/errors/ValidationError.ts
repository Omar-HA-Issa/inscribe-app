import { AppError } from './AppError';

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly errors?: Record<string, string[]>
  ) {
    super(message, 400, true);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Convert error to API response format including field errors
   */
  override toJSON() {
    return {
      success: false,
      error: this.message,
      statusCode: this.statusCode,
      errors: this.errors,
    };
  }
}
