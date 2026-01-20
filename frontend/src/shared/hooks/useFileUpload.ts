/**
 * Custom hook for file upload operations
 * SOLID Principle: Separation of Concerns - API logic separated from component logic
 */

import { useCallback, useRef, useState } from 'react';
import { API_CONFIG, STORAGE_KEYS } from '@/shared/constants/config';
import { ApiError, handleApiError, logError } from '@/shared/lib/errorHandler';
import { extractErrorMessage } from '@/shared/lib/errorHandler';
import { fetchWithRetry } from '@/shared/lib/requestUtils';

/**
 * Upload progress state
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload state
 */
export interface FileUploadState {
  isLoading: boolean;
  error: string | null;
  progress: UploadProgress | null;
  success: boolean;
}

/**
 * Hook for managing file uploads
 */
export function useFileUpload() {
  const [state, setState] = useState<FileUploadState>({
    isLoading: false,
    error: null,
    progress: null,
    success: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Uploads a file to the server
   */
  const uploadFile = useCallback(async (file: File) => {
    setState({ isLoading: true, error: null, progress: null, success: false });
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const loaded = event.loaded;
          const total = event.total;
          const percentage = Math.round((loaded / total) * 100);

          setState(prev => ({
            ...prev,
            progress: { loaded, total, percentage },
          }));
        }
      });

      // Handle completion
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              setState({
                isLoading: false,
                error: null,
                progress: null,
                success: true,
              });
              resolve();
            } catch (error) {
              reject(new Error('Failed to parse server response'));
            }
          } else {
            let errorMessage = 'Upload failed';

            // Try to parse error response from backend
            try {
              const errorData = JSON.parse(xhr.responseText);

              // Handle different error response formats
              if (errorData.message) {
                errorMessage = errorData.message;
              } else if (errorData.error) {
                errorMessage = errorData.error;
              } else if (errorData.userMessage) {
                errorMessage = errorData.userMessage;
              }

              // Handle specific error codes
              if (xhr.status === 409) {
                errorMessage = errorData.message || 'This document already exists in your library.';
              } else if (xhr.status === 401) {
                errorMessage = 'Not authenticated. Please login again.';
              } else if (xhr.status === 400) {
                errorMessage = errorData.message || 'Invalid file. Please check the file type and size.';
              }
            } catch {
              // If JSON parsing fails, use status-based default
              if (xhr.status === 401) {
                errorMessage = 'Not authenticated. Please login again.';
              } else if (xhr.status === 409) {
                errorMessage = 'This document already exists in your library.';
              } else if (xhr.status === 400) {
                errorMessage = 'Invalid file. Please check the file type and size.';
              } else {
                errorMessage = `Upload failed with status ${xhr.status}`;
              }
            }

            reject(new ApiError(xhr.status, errorMessage));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        // Set headers
        xhr.open('POST', `${API_CONFIG.BASE_URL}/api/upload`);
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        // Send with abort signal support
        const signal = abortControllerRef.current?.signal;
        if (signal) {
          signal.addEventListener('abort', () => xhr.abort());
        }

        xhr.send(formData);
      });
    } catch (error) {
      const errorResponse = handleApiError(error);
      setState({
        isLoading: false,
        error: errorResponse.userMessage,
        progress: null,
        success: false,
      });
      logError('useFileUpload', error);
    }
  }, []);

  /**
   * Cancels ongoing upload
   */
  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: 'Upload cancelled',
    }));
  }, []);

  /**
   * Resets upload state
   */
  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      progress: null,
      success: false,
    });
  }, []);

  return { ...state, uploadFile, cancelUpload, resetState };
}

/**
 * Hook for deleting documents
 */
export function useDocumentDelete() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteDocument = useCallback(async (documentId: string) => {
    setIsDeleting(true);
    setError(null);

    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        throw new ApiError(401, 'Not authenticated. Please login again.');
      }

      const response = await fetchWithRetry(
        `${API_CONFIG.BASE_URL}/api/documents/${documentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      setError(errorMessage);
      logError('useDocumentDelete', error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return { deleteDocument, isDeleting, error, resetError };
}
