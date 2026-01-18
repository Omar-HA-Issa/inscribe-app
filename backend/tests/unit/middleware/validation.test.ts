import { describe, it, expect } from 'vitest';
import {
  validateString,
  validateUUID,
  validateNumber,
  validateQuestion,
  validateDocumentName,
} from '../../../src/app/middleware/validation';
import { ValidationError } from '../../../src/shared/errors';
import { TEST_USER_ID, TEST_DOCUMENT_ID, INVALID_UUID } from '../../mocks/fixtures';

describe('Validation Middleware', () => {
  describe('validateString', () => {
    const validator = validateString(3, 100);

    it('should return trimmed string for valid input', () => {
      const result = validator('  hello world  ', 'testField');
      expect(result).toBe('hello world');
    });

    it('should throw ValidationError for null value', () => {
      expect(() => validator(null, 'testField')).toThrow(ValidationError);
      expect(() => validator(null, 'testField')).toThrow('testField must be a string');
    });

    it('should throw ValidationError for undefined value', () => {
      expect(() => validator(undefined, 'testField')).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-string value', () => {
      expect(() => validator(123, 'testField')).toThrow(ValidationError);
      expect(() => validator({}, 'testField')).toThrow(ValidationError);
      expect(() => validator([], 'testField')).toThrow(ValidationError);
    });

    it('should throw ValidationError for string below minimum length', () => {
      expect(() => validator('ab', 'testField')).toThrow(ValidationError);
      expect(() => validator('ab', 'testField')).toThrow('testField must be at least 3 characters');
    });

    it('should throw ValidationError for string above maximum length', () => {
      const longString = 'a'.repeat(101);
      expect(() => validator(longString, 'testField')).toThrow(ValidationError);
      expect(() => validator(longString, 'testField')).toThrow('testField must not exceed 100 characters');
    });

    it('should accept string at minimum length', () => {
      const result = validator('abc', 'testField');
      expect(result).toBe('abc');
    });

    it('should accept string at maximum length', () => {
      const maxString = 'a'.repeat(100);
      const result = validator(maxString, 'testField');
      expect(result).toBe(maxString);
    });

    it('should throw for empty string after trimming', () => {
      expect(() => validator('   ', 'testField')).toThrow(ValidationError);
    });

    it('should use default min/max when not specified', () => {
      const defaultValidator = validateString();
      expect(defaultValidator('a', 'field')).toBe('a');
    });
  });

  describe('validateUUID', () => {
    it('should return valid UUID', () => {
      const result = validateUUID(TEST_USER_ID, 'userId');
      expect(result).toBe(TEST_USER_ID);
    });

    it('should accept valid UUID with lowercase letters', () => {
      const result = validateUUID(TEST_DOCUMENT_ID, 'documentId');
      expect(result).toBe(TEST_DOCUMENT_ID);
    });

    it('should accept valid UUID with uppercase letters', () => {
      const uppercaseUUID = TEST_USER_ID.toUpperCase();
      const result = validateUUID(uppercaseUUID, 'id');
      expect(result).toBe(uppercaseUUID);
    });

    it('should throw ValidationError for invalid UUID format', () => {
      expect(() => validateUUID(INVALID_UUID, 'id')).toThrow(ValidationError);
      expect(() => validateUUID(INVALID_UUID, 'id')).toThrow('id must be a valid UUID');
    });

    it('should throw ValidationError for null', () => {
      expect(() => validateUUID(null, 'id')).toThrow(ValidationError);
    });

    it('should throw ValidationError for undefined', () => {
      expect(() => validateUUID(undefined, 'id')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty string', () => {
      expect(() => validateUUID('', 'id')).toThrow(ValidationError);
    });

    it('should throw for UUID with wrong length', () => {
      expect(() => validateUUID('123e4567-e89b-12d3-a456', 'id')).toThrow(ValidationError);
    });

    it('should throw for UUID with invalid characters', () => {
      expect(() => validateUUID('123e4567-e89b-12d3-a456-42661417400g', 'id')).toThrow(ValidationError);
    });

    it('should use default field name when not specified', () => {
      expect(() => validateUUID('invalid', undefined)).toThrow('id must be a valid UUID');
    });
  });

  describe('validateNumber', () => {
    it('should return valid number', () => {
      const result = validateNumber(5, 'count');
      expect(result).toBe(5);
    });

    it('should accept number at minimum bound', () => {
      const result = validateNumber(1, 'count', 1, 10);
      expect(result).toBe(1);
    });

    it('should accept number at maximum bound', () => {
      const result = validateNumber(10, 'count', 1, 10);
      expect(result).toBe(10);
    });

    it('should throw ValidationError for non-number', () => {
      expect(() => validateNumber('5' as any, 'count')).toThrow(ValidationError);
      expect(() => validateNumber('5' as any, 'count')).toThrow('count must be a number');
    });

    it('should throw ValidationError for null', () => {
      expect(() => validateNumber(null as any, 'count')).toThrow(ValidationError);
    });

    it('should throw ValidationError for undefined', () => {
      expect(() => validateNumber(undefined as any, 'count')).toThrow(ValidationError);
    });

    it('should throw ValidationError for number below minimum', () => {
      expect(() => validateNumber(0, 'count', 1, 10)).toThrow(ValidationError);
      expect(() => validateNumber(0, 'count', 1, 10)).toThrow('count must be at least 1');
    });

    it('should throw ValidationError for number above maximum', () => {
      expect(() => validateNumber(11, 'count', 1, 10)).toThrow(ValidationError);
      expect(() => validateNumber(11, 'count', 1, 10)).toThrow('count must not exceed 10');
    });

    it('should accept negative numbers when allowed', () => {
      const result = validateNumber(-5, 'temperature', -10, 10);
      expect(result).toBe(-5);
    });

    it('should accept decimal numbers', () => {
      const result = validateNumber(0.5, 'threshold', 0, 1);
      expect(result).toBe(0.5);
    });

    it('should work without min/max bounds', () => {
      const result = validateNumber(-1000000, 'value');
      expect(result).toBe(-1000000);
    });

    it('should work with only min bound', () => {
      expect(() => validateNumber(-1, 'value', 0)).toThrow(ValidationError);
      expect(validateNumber(100, 'value', 0)).toBe(100);
    });

    it('should work with only max bound', () => {
      expect(() => validateNumber(11, 'value', undefined, 10)).toThrow(ValidationError);
      expect(validateNumber(-100, 'value', undefined, 10)).toBe(-100);
    });
  });

  describe('validateQuestion', () => {
    it('should accept valid question', () => {
      const result = validateQuestion('What is the main topic?');
      expect(result).toBe('What is the main topic?');
    });

    it('should throw for question too short', () => {
      expect(() => validateQuestion('Hi')).toThrow(ValidationError);
      expect(() => validateQuestion('Hi')).toThrow('question must be at least 3 characters');
    });

    it('should throw for question too long', () => {
      const longQuestion = 'a'.repeat(1001);
      expect(() => validateQuestion(longQuestion)).toThrow(ValidationError);
      expect(() => validateQuestion(longQuestion)).toThrow('question must not exceed 1000 characters');
    });

    it('should accept question at minimum length', () => {
      const result = validateQuestion('Why');
      expect(result).toBe('Why');
    });

    it('should accept question at maximum length', () => {
      const maxQuestion = 'a'.repeat(1000);
      const result = validateQuestion(maxQuestion);
      expect(result).toBe(maxQuestion);
    });

    it('should trim whitespace', () => {
      const result = validateQuestion('   What is this?   ');
      expect(result).toBe('What is this?');
    });
  });

  describe('validateDocumentName', () => {
    it('should accept valid document name', () => {
      const result = validateDocumentName('my-document.pdf');
      expect(result).toBe('my-document.pdf');
    });

    it('should throw for empty document name', () => {
      expect(() => validateDocumentName('')).toThrow(ValidationError);
    });

    it('should throw for document name too long', () => {
      const longName = 'a'.repeat(201);
      expect(() => validateDocumentName(longName)).toThrow(ValidationError);
      expect(() => validateDocumentName(longName)).toThrow('document name must not exceed 200 characters');
    });

    it('should accept document name at maximum length', () => {
      const maxName = 'a'.repeat(200);
      const result = validateDocumentName(maxName);
      expect(result).toBe(maxName);
    });

    it('should trim whitespace', () => {
      const result = validateDocumentName('  document.pdf  ');
      expect(result).toBe('document.pdf');
    });
  });
});
