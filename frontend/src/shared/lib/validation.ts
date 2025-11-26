/**
 * Input validation utilities
 * SOLID Principle: Follows Single Responsibility Principle - validation logic isolated
 */

import { FILE_CONFIG } from '@/shared/constants/config';

/**
 * Validates email format
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  return { isValid: true };
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' };
  }
  return { isValid: true };
}

/**
 * Validates file for upload
 */
export function validateFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'File is required' };
  }

  // Check file type
  if (!FILE_CONFIG.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files only.',
    };
  }

  // Check file size
  if (file.size > FILE_CONFIG.maxSize) {
    const maxSizeMB = FILE_CONFIG.maxSize / (1024 * 1024);
    return {
      isValid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB.\nYour file: ${formatFileSize(file.size)}`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return { isValid: false, error: 'File is empty. Please upload a file with content.' };
  }

  return { isValid: true };
}

/**
 * Validates search query
 */
export function validateSearchQuery(query: string): { isValid: boolean; error?: string } {
  if (!query || query.trim().length === 0) {
    return { isValid: false, error: 'Search query cannot be empty' };
  }
  if (query.length > 1000) {
    return { isValid: false, error: 'Search query is too long (max 1000 characters)' };
  }
  return { isValid: true };
}

/**
 * Formats file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats date to human-readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}
