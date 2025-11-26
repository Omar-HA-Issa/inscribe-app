/**
 * Authentication and API Client
 * SOLID Principles: Single Responsibility - Auth logic and API calls separated by concern
 */

import { API_CONFIG, STORAGE_KEYS, isDevelopment } from '@/shared/constants/config';
import { ApiError, extractErrorMessage, logError } from '@/shared/lib/errorHandler';

// =====================
// Token Management
// =====================

/**
 * Retrieves auth token from storage with error handling
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.accessToken);
  } catch {
    logError('getAuthToken', 'Failed to retrieve token from storage', isDevelopment);
    return null;
  }
}

/**
 * Sets both access and refresh tokens in storage
 */
export function setAuthTokens(accessToken: string, refreshToken: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  } catch (error) {
    logError('setAuthTokens', 'Failed to store tokens', isDevelopment);
    throw new Error('Failed to save authentication tokens');
  }
}

/**
 * Clears all authentication tokens from storage
 */
export function clearAuthTokens(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  } catch (error) {
    logError('clearAuthTokens', 'Failed to clear tokens', isDevelopment);
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

// =====================
// Authentication APIs
// =====================

/**
 * Registers a new user
 * POST /api/signup
 */
export async function signUp(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/signup`, {
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
    logError('signUp', error, isDevelopment);
    throw error;
  }
}

/**
 * Signs in an existing user
 * POST /api/login
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/login`, {
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
    logError('signIn', error, isDevelopment);
    throw error;
  }
}

/**
 * Signs out the current user
 * POST /api/logout
 */
export async function signOut(): Promise<void> {
  try {
    await fetch(`${API_CONFIG.baseUrl}/api/logout`, {
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
    const response = await fetch(`${API_CONFIG.baseUrl}/api/me`, {
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
    logError('getCurrentUser', error, isDevelopment);
    throw error;
  }
}

/**
 * Requests a password reset email
 * POST /api/forgot-password
 */
export async function resetPasswordRequest(email: string): Promise<PasswordResetResponse> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    let data: any;
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
    logError('resetPasswordRequest', error, isDevelopment);
    throw error;
  }
}

/**
 * Resets password with a token
 * POST /api/reset-password
 */
export async function resetPassword(accessToken: string, newPassword: string): Promise<PasswordResetResponse> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password: newPassword }),
    });

    let data: any;
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
    logError('resetPassword', error, isDevelopment);
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
    const response = await fetch(`${API_CONFIG.baseUrl}/api/documents`, {
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
    logError('fetchUserDocuments', error, isDevelopment);
    throw error;
  }
}

/**
 * Uploads a document
 * POST /api/upload
 */
export async function uploadDocument(file: File): Promise<any> {
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

    const response = await fetch(`${API_CONFIG.baseUrl}/api/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    let errorPayload: any = null;
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
    logError('uploadDocument', error, isDevelopment);
    throw error;
  }
}

/**
 * Sends a chat query
 * POST /api/chat
 */
export async function sendChatQuery(query: string, limit: number = 5): Promise<any> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/chat`, {
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
    logError('sendChatQuery', error, isDevelopment);
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
): Promise<any> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/search`, {
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
    logError('searchDocuments', error, isDevelopment);
    throw error;
  }
}

// =====================
// Generic API Client (deprecated - use api.ts instead)
// =====================
// NOTE: This is kept for backward compatibility. New code should import from api.ts

interface RequestOptions extends RequestInit {
  body?: any;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getAuthToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new ApiError(response.status, `Request failed with status ${response.status}`);
        }
        return {} as T;
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new ApiError(401, 'Session expired. Please login again.');
        }
        throw new ApiError(response.status, data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      logError('ApiClient.request', error, isDevelopment);
      throw error;
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_CONFIG.baseUrl);