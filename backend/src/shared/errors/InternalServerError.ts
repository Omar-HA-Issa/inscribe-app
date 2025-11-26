import { AppError } from './AppError';

export class InternalServerError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
