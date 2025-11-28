/**
 * Application configuration constants
 */
export const FILE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.txt'],
  MAX_PDF_PAGES: 50,
} as const;

export const CHUNKING_CONFIG = {
  CHUNK_SIZE: 1200, // tokens
  CHUNK_OVERLAP: 150, // tokens
} as const;

export const EMBEDDING_CONFIG = {
  MODEL: 'text-embedding-3-small',
  BATCH_SIZE: 64,
} as const;

export const LLM_CONFIG = {
  CHAT_MODEL: 'gpt-4o-mini',
  ANALYSIS_MODEL: 'gpt-4o',
  CHAT_TEMPERATURE: 0.7,
  SUMMARY_TEMPERATURE: 0.5,
  ANALYSIS_TEMPERATURE: 0.6,
  VALIDATION_TEMPERATURE: 0.3,
  CHAT_MAX_TOKENS: 800,
  SUMMARY_MAX_TOKENS: 500,
  ANALYSIS_MAX_TOKENS: 5500,
} as const;

export const SEARCH_CONFIG = {
  DEFAULT_MATCH_THRESHOLD: 0.5,
  DEFAULT_TOP_K: 5,
  MAX_TOP_K: 50,
  DEFAULT_MAX_CHUNKS: 30, // for summarization
} as const;

export const CACHE_CONFIG = {
  SUMMARY_CACHE: true,
  INSIGHTS_CACHE: true,
  VALIDATION_CACHE: true,
} as const;

export const JWT_CONFIG = {
  COOKIE_NAME: 'sb_access',
  COOKIE_SECURE: process.env.NODE_ENV === 'production',
  COOKIE_SAMESITE: 'lax' as const,
  COOKIE_HTTP_ONLY: true,
} as const;

export const API_ROUTES = {
  BASE: '/api',
  AUTH: '/api/auth',
  DOCUMENTS: '/api/documents',
  CHAT: '/api/chat',
  SEARCH: '/api/search',
  INSIGHTS: '/api/insights',
  VALIDATION: '/api/validation',
  REPORTS: '/api/reports',
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
} as const;

export const CORS_CONFIG = {
  ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  CREDENTIALS: true,
} as const;

export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: {
    DEFAULT: 1000, // High limit for normal operations (search, insights, validation)
    UPLOAD: 50, // Moderate limit for file uploads
    CHAT: 200, // High limit for chat (users may ask many questions)
    AUTH: 10, // Low limit for auth to prevent brute force
  },
} as const;

export const CACHE_TTL = {
  SUMMARY: 60 * 60 * 1000, // 1 hour
  INSIGHTS: 60 * 60 * 1000, // 1 hour
  VALIDATION: 24 * 60 * 60 * 1000, // 24 hours
  MAX_SIZE: 100, // max entries per cache
} as const;

export const VALIDATION_CONFIG = {
  PROMPT_MAX_LENGTH: 20000,
  DOCUMENT_NAME_MAX_LENGTH: 200,
  QUESTION_MIN_LENGTH: 3,
  QUESTION_MAX_LENGTH: 1000,
} as const;

export const LOGGING_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || 'info',
  FORMAT: 'json',
} as const;
