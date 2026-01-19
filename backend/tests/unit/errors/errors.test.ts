import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
} from '../../../src/shared/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with default status code 500', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create error with custom status code', () => {
      const error = new AppError('Test error', 418);
      expect(error.statusCode).toBe(418);
    });

    it('should set isOperational flag', () => {
      const operationalError = new AppError('Operational', 500, true);
      const programmingError = new AppError('Programming', 500, false);

      expect(operationalError.isOperational).toBe(true);
      expect(programmingError.isOperational).toBe(false);
    });

    it('should be instance of Error', () => {
      const error = new AppError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should have stack trace', () => {
      const error = new AppError('Test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test');
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', 400);
      const json = error.toJSON();

      expect(json).toEqual({
        success: false,
        error: 'Test error',
        statusCode: 400,
      });
    });
  });

  describe('BadRequestError', () => {
    it('should have status code 400', () => {
      const error = new BadRequestError('Bad request');
      expect(error.statusCode).toBe(400);
    });

    it('should have correct message', () => {
      const error = new BadRequestError('Invalid input');
      expect(error.message).toBe('Invalid input');
    });

    it('should be instance of AppError', () => {
      const error = new BadRequestError('Test');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('UnauthorizedError', () => {
    it('should have status code 401', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
    });

    it('should have default message', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('Unauthorized access');
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Invalid token');
      expect(error.message).toBe('Invalid token');
    });

    it('should be instance of AppError', () => {
      const error = new UnauthorizedError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnauthorizedError);
    });

    it('should be operational', () => {
      const error = new UnauthorizedError();
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ForbiddenError', () => {
    it('should have status code 403', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
    });

    it('should have default message', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Access forbidden');
    });

    it('should accept custom message', () => {
      const error = new ForbiddenError('You do not have permission');
      expect(error.message).toBe('You do not have permission');
    });

    it('should be instance of AppError', () => {
      const error = new ForbiddenError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('NotFoundError', () => {
    it('should have status code 404', () => {
      const error = new NotFoundError('Document');
      expect(error.statusCode).toBe(404);
    });

    it('should create message with resource name', () => {
      const error = new NotFoundError('Document');
      expect(error.message).toBe('Document not found');
    });

    it('should create message with resource name and identifier', () => {
      const error = new NotFoundError('Document', '123');
      expect(error.message).toBe("Document with id '123' not found");
    });

    it('should be instance of AppError', () => {
      const error = new NotFoundError('Resource');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should be operational', () => {
      const error = new NotFoundError('Resource');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ConflictError', () => {
    it('should have status code 409', () => {
      const error = new ConflictError('Duplicate entry');
      expect(error.statusCode).toBe(409);
    });

    it('should have correct message', () => {
      const error = new ConflictError('Document already exists');
      expect(error.message).toBe('Document already exists');
    });

    it('should store details', () => {
      const details = { existingId: '123', field: 'email' };
      const error = new ConflictError('Conflict', details);
      expect(error.details).toEqual(details);
    });

    it('should be instance of AppError', () => {
      const error = new ConflictError('Test');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ConflictError);
    });

    it('should be operational', () => {
      const error = new ConflictError('Test');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should have status code 400', () => {
      const error = new ValidationError('Validation failed');
      expect(error.statusCode).toBe(400);
    });

    it('should have correct message', () => {
      const error = new ValidationError('Invalid email format');
      expect(error.message).toBe('Invalid email format');
    });

    it('should store field errors', () => {
      const fieldErrors = {
        email: ['Invalid format', 'Already exists'],
        password: ['Too short'],
      };
      const error = new ValidationError('Validation failed', fieldErrors);
      expect(error.errors).toEqual(fieldErrors);
    });

    it('should be instance of AppError', () => {
      const error = new ValidationError('Test');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should serialize to JSON with errors', () => {
      const fieldErrors = { email: ['Invalid'] };
      const error = new ValidationError('Validation failed', fieldErrors);
      const json = error.toJSON();

      expect(json).toEqual({
        success: false,
        error: 'Validation failed',
        statusCode: 400,
        errors: fieldErrors,
      });
    });

    it('should serialize to JSON without errors when not provided', () => {
      const error = new ValidationError('Validation failed');
      const json = error.toJSON();

      expect(json).toEqual({
        success: false,
        error: 'Validation failed',
        statusCode: 400,
        errors: undefined,
      });
    });
  });

  describe('TooManyRequestsError', () => {
    it('should have status code 429', () => {
      const error = new TooManyRequestsError();
      expect(error.statusCode).toBe(429);
    });

    it('should have default message', () => {
      const error = new TooManyRequestsError();
      expect(error.message).toBe('Too many requests');
    });

    it('should accept custom message', () => {
      const error = new TooManyRequestsError('Rate limit exceeded, try again in 5 minutes');
      expect(error.message).toBe('Rate limit exceeded, try again in 5 minutes');
    });

    it('should be instance of AppError', () => {
      const error = new TooManyRequestsError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(TooManyRequestsError);
    });
  });

  describe('Error inheritance chain', () => {
    it('all custom errors should be instances of Error', () => {
      const errors = [
        new AppError('Test'),
        new BadRequestError('Test'),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError('Test'),
        new ConflictError('Test'),
        new ValidationError('Test'),
        new TooManyRequestsError(),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('all custom errors except AppError should be instances of AppError', () => {
      const errors = [
        new BadRequestError('Test'),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError('Test'),
        new ConflictError('Test'),
        new ValidationError('Test'),
        new TooManyRequestsError(),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(AppError);
      });
    });
  });
});
