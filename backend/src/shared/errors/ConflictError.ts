import { AppError } from './AppError';

/**
 * Error thrown when there's a conflict (e.g., duplicate resource)
 */
export class ConflictError extends AppError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, 409, true);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
