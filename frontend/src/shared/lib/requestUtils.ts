/**
 * HTTP request utilities with retry logic and timeout handling
 * SOLID Principle: Single Responsibility - request handling isolated
 */

import { API_CONFIG, IS_DEVELOPMENT } from '@/shared/constants/config';
import { ApiError, logError } from '@/shared/lib/errorHandler';

/**
 * Retry options configuration
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Creates an abort signal with timeout
 */
export function createTimeoutSignal(timeoutMs: number = API_CONFIG.TIMEOUT): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Clean up timeout on completion
  if (typeof controller.signal.addEventListener === 'function') {
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));
  }

  return controller.signal;
}

/**
 * Calculates exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelay: number = API_CONFIG.RETRY_DELAY,
  maxDelay: number = 30000,
  multiplier: number = 2,
): number {
  const delay = Math.min(initialDelay * Math.pow(multiplier, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return Math.floor(delay + jitter);
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(statusCode?: number): boolean {
  if (!statusCode) return true; // Network errors are retryable
  // Retry on server errors, not on client errors or auth errors
  return statusCode >= 500 || statusCode === 408 || statusCode === 429;
}

/**
 * Executes a fetch request with automatic retry logic
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  retryOptions: RetryOptions = {},
): Promise<T> {
  const maxAttempts = retryOptions.maxAttempts ?? API_CONFIG.RETRY_ATTEMPTS;
  const initialDelay = retryOptions.initialDelay ?? API_CONFIG.RETRY_DELAY;
  const timeout = options.timeout ?? API_CONFIG.TIMEOUT;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const signal = createTimeoutSignal(timeout);
      const response = await fetch(url, { ...options, signal });

      if (!response.ok) {
        const statusCode = response.status;
        let errorMessage = `Request failed with status ${statusCode}`;

        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const data = await response.json();
            // Handle both old and new error response formats
            errorMessage = data.message || data.error?.message || data.error || errorMessage;
          }
        } catch {
          // Ignore JSON parse errors
        }

        // Check if we should retry
        if (!isRetryableError(statusCode) || attempt === maxAttempts - 1) {
          throw new ApiError(statusCode, errorMessage);
        }

        // Retry with backoff
        const delay = calculateBackoffDelay(attempt, initialDelay);
        logError(`API Request (attempt ${attempt + 1})`, `Retrying after ${delay}ms`, IS_DEVELOPMENT);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return {} as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (!(error instanceof ApiError) && attempt < maxAttempts - 1) {
        const delay = calculateBackoffDelay(attempt, initialDelay);
        logError(`API Request (attempt ${attempt + 1})`, `Retrying after ${delay}ms`, IS_DEVELOPMENT);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Request failed');
}

/**
 * Request/Response logging interceptor (development only)
 */
export function logRequestResponse(
  method: string,
  url: string,
  request?: unknown,
  response?: unknown,
  duration?: number,
): void {
  if (!IS_DEVELOPMENT) return;

  const style = 'color: #0066cc; font-weight: bold';
  console.log(
    `%c[HTTP ${method}] ${url}${duration ? ` (${duration}ms)` : ''}`,
    style,
  );

  if (request) {
    console.log('[Request]', request);
  }
  if (response) {
    console.log('[Response]', response);
  }
}

