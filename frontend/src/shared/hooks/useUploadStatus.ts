import { useCallback } from 'react';
import { useAsync } from '@/shared/hooks/useAsync';
import { getUploadStatus } from '@/shared/lib/apiClient';

export interface UploadStatus {
  remaining: number;
  total: number;
  used: number;
  resetDate: string;
}

/**
 * Hook for fetching upload limit status
 */
export function useUploadStatus(autoFetch = true) {
  const fetchStatus = useCallback(() => getUploadStatus(), []);

  const {
    status,
    data,
    error,
    execute
  } = useAsync(fetchStatus, autoFetch);

  const uploadStatus: UploadStatus | null = data?.uploads ?? null;
  const isLoading = status === 'loading';
  const isError = status === 'error';

  return {
    uploadStatus,
    isLoading,
    isError,
    error,
    refetch: execute,
  };
}
