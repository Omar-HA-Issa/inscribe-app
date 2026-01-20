/**
 * Authentication and API Client
 * SOLID Principles: Single Responsibility - Auth logic and API calls separated by concern
 */

import { API_CONFIG, STORAGE_KEYS, IS_DEVELOPMENT } from '@/shared/constants/config';
import { ApiError, extractErrorMessage, logError } from '@/shared/lib/errorHandler';

// =====================
// Token Management
// =====================

/**
 * Retrieves auth token from storage with error handling
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch {
    logError('getAuthToken', 'Failed to retrieve token from storage', IS_DEVELOPMENT);
    return null;
  }
}

/**
 * Sets both access and refresh tokens in storage
 */
export function setAuthTokens(accessToken: string, refreshToken: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  } catch (error) {
    logError('setAuthTokens', 'Failed to store tokens', IS_DEVELOPMENT);
    throw new Error('Failed to save authentication tokens');
  }
}

/**
 * Clears all authentication tokens from storage
 */
export function clearAuthTokens(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    logError('clearAuthTokens', 'Failed to clear tokens', IS_DEVELOPMENT);
  }
}

/**
 * Checks if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  return !!token && token.length > 0;
}

/**
 * Builds authorization headers
 */
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

// =====================
// Auth Response Types
// =====================

export interface AuthUser {
  id: string;
  email: string;
  [key: string]: unknown;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse {
  user?: AuthUser;
  session?: AuthSession;
  needs_email_confirm?: boolean;
  error?: string;
  message?: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface UploadDocumentResponse {
  success: boolean;
  document?: {
    id: string;
    file_name: string;
    [key: string]: unknown;
  };
  message?: string;
}

export interface ChatResponse {
  success: boolean;
  answer?: string;
  sources?: unknown[];
  [key: string]: unknown;
}

export interface SearchResponse {
  success: boolean;
  results?: unknown[];
  [key: string]: unknown;
}

interface ErrorPayload {
  code?: string;
  message?: string;
  [key: string]: unknown;
}

// =====================
// Authentication APIs
// =====================

/**
 * Registers a new user
 * POST /api/signup
 */
export async function signUp(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    let data: AuthResponse;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(response.status, 'Invalid server response');
    }

    if (!response.ok) {
      const message = extractErrorMessage(data);
      throw new ApiError(response.status, message || 'Signup failed');
    }

    // Store tokens if provided
    if (data.session?.access_token && data.session?.refresh_token) {
      setAuthTokens(data.session.access_token, data.session.refresh_token);
    }

    return data;
  } catch (error) {
    logError('signUp', error, IS_DEVELOPMENT);
    throw error;
  }
}

/**
 * Signs in an existing user
 * POST /api/login
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    let data: AuthResponse;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(response.status, 'Invalid server response');
    }

    if (!response.ok) {
      const message = extractErrorMessage(data);
      throw new ApiError(response.status, message || 'Login failed');
    }

    // Store tokens if provided
    if (data.session?.access_token && data.session?.refresh_token) {
      setAuthTokens(data.session.access_token, data.session.refresh_token);
    }

    return data;
  } catch (error) {
    logError('signIn', error, IS_DEVELOPMENT);
    throw error;
  }
}

/**
 * Signs out the current user
 * POST /api/logout
 */
export async function signOut(): Promise<void> {
  try {
    await fetch(`${API_CONFIG.BASE_URL}/api/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    }).catch(() => {
      // Ignore logout errors - always clear local tokens
    });
  } finally {
    clearAuthTokens();
  }
}

/**
 * Gets current user information
 * GET /api/me
 */
export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/me`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthTokens();
        throw new ApiError(401, 'Session expired. Please login again.');
      }
      throw new ApiError(response.status, 'Failed to get user info');
    }

    return response.json() as Promise<AuthResponse>;
  } catch (error) {
    logError('getCurrentUser', error, IS_DEVELOPMENT);
    throw error;
  }
}

/**
 * Requests a password reset email
 * POST /api/forgot-password
 */
export async function resetPasswordRequest(email: string): Promise<PasswordResetResponse> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    let data: PasswordResetResponse;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(response.status, 'Invalid server response');
    }

    if (!response.ok) {
      const message = extractErrorMessage(data);
      throw new ApiError(response.status, message || 'Failed to send reset email');
    }

    return data;
  } catch (error) {
    logError('resetPasswordRequest', error, IS_DEVELOPMENT);
    throw error;
  }
}

/**
 * Resets password with a token
 * POST /api/reset-password
 */
export async function resetPassword(accessToken: string, newPassword: string): Promise<PasswordResetResponse> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password: newPassword }),
    });

    let data: PasswordResetResponse;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(response.status, 'Invalid server response');
    }

    if (!response.ok) {
      const message = extractErrorMessage(data);
      throw new ApiError(response.status, message || 'Failed to reset password');
    }

    return data;
  } catch (error) {
    logError('resetPassword', error, IS_DEVELOPMENT);
    throw error;
  }
}

// =====================
// Document Response Types
// =====================

export interface UserDocumentsResponse {
  documents: Array<{
    id: string;
    title: string;
    file_name: string;
    file_type: string;
    created_at: string;
    file_size: number;
  }>;
}

export interface ChatQuery {
  question: string;
  topK?: number;
}

export interface SearchQuery {
  query: string;
  topK?: number;
  minSimilarity?: number;
}

// =====================
// Document APIs (Protected)
// =====================

/**
 * Fetches user's documents
 * GET /api/documents
 */
export async function fetchUserDocuments(): Promise<UserDocumentsResponse> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/documents`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthTokens();
        throw new ApiError(401, 'Session expired. Please login again.');
      }
      throw new ApiError(response.status, 'Failed to fetch documents');
    }

    return response.json() as Promise<UserDocumentsResponse>;
  } catch (error) {
    logError('fetchUserDocuments', error, IS_DEVELOPMENT);
    throw error;
  }
}

/**
 * Uploads a document
 * POST /api/upload
 */
export async function uploadDocument(file: File): Promise<UploadDocumentResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const token = getAuthToken();
    if (!token) {
      throw new ApiError(401, 'Not authenticated. Please login again.');
    }

    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    let errorPayload: ErrorPayload | null = null;
    if (!response.ok) {
      try {
        errorPayload = await response.json();
      } catch {
        // Response is not JSON
      }

      // Handle specific error cases
      if (response.status === 409 && errorPayload?.code === "DUPLICATE_DOCUMENT") {
        throw new ApiError(
          409,
          errorPayload.message || "This document already exists in your library."
        );
      }

      if (response.status === 401) {
        clearAuthTokens();
        throw new ApiError(401, 'Not authenticated. Please login again.');
      }

      const message = extractErrorMessage(errorPayload) || "Upload failed";
      throw new ApiError(response.status, message);
    }

    return response.json();
  } catch (error) {
    logError('uploadDocument', error, IS_DEVELOPMENT);
    throw error;
  }
}

/**
 * Sends a chat query
 * POST /api/chat
 */
export async function sendChatQuery(query: string, limit: number = 5): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/chat`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ question: query, topK: limit }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthTokens();
        throw new ApiError(401, 'Session expired. Please login again.');
      }
      throw new ApiError(response.status, 'Chat query failed');
    }

    return response.json();
  } catch (error) {
    logError('sendChatQuery', error, IS_DEVELOPMENT);
    throw error;
  }
}

/**
 * Searches documents
 * POST /api/search
 */
export async function searchDocuments(
  query: string,
  topK: number = 8,
  minSimilarity: number = 0.2
): Promise<SearchResponse> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/search`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ query, topK, minSimilarity }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthTokens();
        throw new ApiError(401, 'Session expired. Please login again.');
      }
      throw new ApiError(response.status, 'Search failed');
    }

    return response.json();
  } catch (error) {
    logError('searchDocuments', error, IS_DEVELOPMENT);
    throw error;
  }
}

/**
 * Get upload limit status
 * GET /api/upload/status
 */
export async function getUploadStatus(): Promise<{
  success: boolean;
  uploads: {
    remaining: number;
    total: number;
    used: number;
    resetDate: string;
  };
}> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/upload/status`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthTokens();
        throw new ApiError(401, 'Session expired. Please login again.');
      }
      throw new ApiError(response.status, 'Failed to fetch upload status');
    }

    return response.json();
  } catch (error) {
    logError('getUploadStatus', error, IS_DEVELOPMENT);
    throw error;
  }
}

