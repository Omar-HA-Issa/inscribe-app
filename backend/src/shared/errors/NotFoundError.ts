import { AppError } from './AppError';

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;

    super(message, 404, true);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
