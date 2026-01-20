/**
 * API Client with comprehensive error handling and timeout support
 * SOLID Principles:
 * - Single Responsibility: Handles all HTTP requests
 * - Dependency Inversion: Uses injected configuration
 */

import { API_CONFIG, STORAGE_KEYS, IS_DEVELOPMENT } from '@/shared/constants/config';
import { ApiError, logError } from '@/shared/lib/errorHandler';
import { fetchWithRetry, logRequestResponse, createTimeoutSignal } from '@/shared/lib/requestUtils';

interface RequestOptions extends RequestInit {
  body?: BodyInit | null;
  timeout?: number;
  retry?: boolean;
}

/**
 * Enhanced API Client with retry logic and proper error handling
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic request method with full error handling and retry logic
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout ?? API_CONFIG.TIMEOUT;
    const shouldRetry = options.retry !== false;

    // Get token from localStorage
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const startTime = performance.now();

    try {
      // Use fetchWithRetry for automatic retry logic on 5xx errors
      const data = await (shouldRetry
        ? fetchWithRetry<T>(url, { ...config, timeout })
        : this.fetchWithTimeout<T>(url, config, timeout));

      const duration = performance.now() - startTime;
      logRequestResponse(config.method || 'GET', endpoint, config.body, data, duration);

      return data;
    } catch (error) {
      const duration = performance.now() - startTime;
      logError(`API ${config.method || 'GET'} ${endpoint}`, error, IS_DEVELOPMENT);

      // Handle and re-throw with context
      if (error instanceof ApiError) {
        throw error;
      }

      throw error;
    }
  }

  /**
   * Fetch with timeout (fallback for when retry is disabled)
   */
  private async fetchWithTimeout<T>(
    url: string,
    config: RequestInit,
    timeout: number,
  ): Promise<T> {
    const signal = createTimeoutSignal(timeout);
    const response = await fetch(url, { ...config, signal });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(response.status, `Request failed with status ${response.status}`);
      }
      return '' as T;
    }

    const data = await response.json();

    if (!response.ok) {
      // Check for auth errors
      if (response.status === 401) {
        throw new ApiError(response.status, 'Session expired. Please login again.');
      }
      throw new ApiError(response.status, data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const api = new ApiClient(API_CONFIG.BASE_URL);
export { API_CONFIG };