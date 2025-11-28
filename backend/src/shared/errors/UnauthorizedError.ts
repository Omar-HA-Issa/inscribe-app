import { AppError } from './AppError';

/**
 * Error thrown when user is not authenticated or unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, true);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}
