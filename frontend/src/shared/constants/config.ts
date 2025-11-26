/**
 * Centralized configuration for frontend application
 * SOLID Principle: Follows the Single Responsibility Principle by centralizing all configuration
 */

// API Configuration
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // Initial delay in ms, exponential backoff applied
} as const;

// File Upload Configuration
export const FILE_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxPdfPages: 50,
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  allowedExtensions: ['.pdf', '.docx', '.txt'],
} as const;

// Search Configuration
export const SEARCH_CONFIG = {
  minSimilarity: 0.2,
  defaultTopK: 8,
  chatTopK: 5,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
} as const;

// Environment
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
