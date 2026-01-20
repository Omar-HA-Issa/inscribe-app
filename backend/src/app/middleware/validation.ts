import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../shared/errors';
import { VALIDATION_CONFIG } from '../../shared/constants/config';

/**
 * Request validation middleware for common validations
 * Prevents invalid data from reaching service layer
 */

export const validateString = (
  minLength: number = 1,
  maxLength: number = 10000
) => {
  return (value: any, fieldName: string): string => {
    if (!value || typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, { [fieldName]: [`${fieldName} must be a string`] });
    }

    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      throw new ValidationError(
        `${fieldName} must be at least ${minLength} characters`,
        { [fieldName]: [`${fieldName} must be at least ${minLength} characters`] }
      );
    }

    if (trimmed.length > maxLength) {
      throw new ValidationError(
        `${fieldName} must not exceed ${maxLength} characters`,
        { [fieldName]: [`${fieldName} must not exceed ${maxLength} characters`] }
      );
    }

    return trimmed;
  };
};

export const validateUUID = (value: any, fieldName: string = 'id'): string => {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a valid UUID`, { [fieldName]: [`${fieldName} must be a valid UUID`] });
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`, { [fieldName]: [`${fieldName} must be a valid UUID`] });
  }

  return value;
};

export const validateNumber = (
  value: any,
  fieldName: string,
  min?: number,
  max?: number
): number => {
  if (typeof value !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`, { [fieldName]: [`${fieldName} must be a number`] });
  }

  if (min !== undefined && value < min) {
    throw new ValidationError(
      `${fieldName} must be at least ${min}`,
      { [fieldName]: [`${fieldName} must be at least ${min}`] }
    );
  }

  if (max !== undefined && value > max) {
    throw new ValidationError(
      `${fieldName} must not exceed ${max}`,
      { [fieldName]: [`${fieldName} must not exceed ${max}`] }
    );
  }

  return value;
};

export const validateQuestion = (value: any): string => {
  return validateString(
    VALIDATION_CONFIG.QUESTION_MIN_LENGTH,
    VALIDATION_CONFIG.QUESTION_MAX_LENGTH
  )(value, 'question');
};

export const validateDocumentName = (value: any): string => {
  return validateString(1, VALIDATION_CONFIG.DOCUMENT_NAME_MAX_LENGTH)(
    value,
    'document name'
  );
};
