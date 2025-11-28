/**
 * Centralized error messages used throughout the application
 */
export const ERROR_MESSAGES = {
  // Authentication errors
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_TOKEN: 'Invalid or expired token',
  MISSING_TOKEN: 'Missing authentication token',
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',

  // Document errors
  DOCUMENT_NOT_FOUND: 'Document not found',
  DOCUMENT_ALREADY_EXISTS: 'Document with this hash already exists for this user',
  INVALID_FILE_TYPE: 'Invalid file type. Only PDF, DOCX, and TXT are allowed',
  FILE_TOO_LARGE: 'File size exceeds maximum limit of 10MB',
  FILE_TOO_MANY_PAGES: 'PDF exceeds maximum page limit of 50',
  EMPTY_FILE: 'File is empty or contains no readable content',
  CORRUPTED_FILE: 'File is corrupted or cannot be parsed',

  // Chunk errors
  CHUNK_NOT_FOUND: 'Chunk not found',
  NO_CHUNKS_FOR_DOCUMENT: 'No chunks found for this document',

  // Chat/Search errors
  SEARCH_FAILED: 'Failed to perform vector search',
  CHAT_FAILED: 'Failed to generate chat response',
  NO_SEARCH_RESULTS: 'No relevant documents found for your query',

  // Summary/Insights errors
  SUMMARY_GENERATION_FAILED: 'Failed to generate summary',
  INSIGHTS_GENERATION_FAILED: 'Failed to generate insights',
  VALIDATION_FAILED: 'Failed to perform validation analysis',

  // Server errors
  INTERNAL_SERVER_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database operation failed',
  EXTERNAL_API_ERROR: 'External API call failed',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

/**
 * Validation error field messages
 */
export const VALIDATION_ERRORS = {
  INVALID_EMAIL: 'Invalid email format',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  REQUIRED_FIELD: 'This field is required',
  INVALID_UUID: 'Invalid UUID format',
  INVALID_ENUM: 'Invalid value for this field',
} as const;
