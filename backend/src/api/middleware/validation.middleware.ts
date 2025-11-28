import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../shared/errors';
import { logger } from '../../shared/utils/logger';

/**
 * Request validation middleware factory
 * Validates request using Zod schemas
 */
export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = {
        body: req.body,
        params: req.params,
        query: req.query,
      };

      await schema.parseAsync(data);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors: error.errors,
        });

        const fieldErrors: Record<string, string[]> = {};
        for (const err of error.errors) {
          const field = err.path.join('.');
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(err.message);
        }

        throw new ValidationError('Request validation failed', fieldErrors);
      }

      next(error);
    }
  };
}
