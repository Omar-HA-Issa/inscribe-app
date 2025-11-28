/**
 * Custom hook for managing async operations
 * SOLID Principle: Reusability - common async pattern encapsulated
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { logError } from '@/shared/lib/errorHandler';

/**
 * State for async operation
 */
export interface AsyncState<T, E = Error> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: T | null;
  error: E | null;
}

/**
 * Custom hook for managing async operations with loading and error states
 */
export function useAsync<T, E = Error>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true,
  onSuccess?: (data: T) => void,
  onError?: (error: E) => void,
): AsyncState<T, E> & { execute: () => Promise<void> } {
  const [state, setState] = useState<AsyncState<T, E>>({
    status: 'idle',
    data: null,
    error: null,
  });

  // Track if component is mounted
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    setState({ status: 'loading', data: null, error: null });

    try {
      const response = await asyncFunction();

      if (isMountedRef.current) {
        setState({ status: 'success', data: response, error: null });
        onSuccess?.(response);
      }
    } catch (error) {
      const typedError = error as E;
      if (isMountedRef.current) {
        setState({ status: 'error', data: null, error: typedError });
        onError?.(typedError);
        logError('useAsync', error);
      }
    }
  }, [asyncFunction, onSuccess, onError]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]);

  return { ...state, execute };
}

/**
 * Hook for managing paginated async data
 */
export interface PaginatedAsyncState<T> extends AsyncState<T[]> {
  page: number;
  pageSize: number;
  totalPages: number;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
}

export function usePaginatedAsync<T>(
  asyncFunction: (page: number, pageSize: number) => Promise<{ data: T[]; totalPages: number }>,
  pageSize: number = 10,
): PaginatedAsyncState<T> {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [state, setState] = useState<AsyncState<T[]>>({
    status: 'idle',
    data: [],
    error: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadPage = useCallback(
    async (pageNum: number) => {
      if (pageNum < 1 || (totalPages > 0 && pageNum > totalPages)) {
        return;
      }

      setState(prev => ({ ...prev, status: 'loading' }));

      try {
        const result = await asyncFunction(pageNum, pageSize);

        if (isMountedRef.current) {
          setState({ status: 'success', data: result.data, error: null });
          setTotalPages(result.totalPages);
          setPage(pageNum);
        }
      } catch (error) {
        if (isMountedRef.current) {
          setState({ status: 'error', data: [], error: error as Error });
          logError('usePaginatedAsync', error);
        }
      }
    },
    [asyncFunction, pageSize, totalPages],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadPage(page);
  }, []);

  const nextPage = useCallback(async () => {
    if (page < totalPages) {
      await loadPage(page + 1);
    }
  }, [page, totalPages, loadPage]);

  const previousPage = useCallback(async () => {
    if (page > 1) {
      await loadPage(page - 1);
    }
  }, [page, loadPage]);

  const goToPage = useCallback(
    async (newPage: number) => {
      await loadPage(newPage);
    },
    [loadPage],
  );

  return {
    ...state,
    page,
    pageSize,
    totalPages,
    nextPage,
    previousPage,
    goToPage,
  };
}
