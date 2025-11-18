import { useState, useCallback } from 'react';
import { getUserFriendlyError } from '@/lib/error-logger';

/**
 * Custom hook for error handling in components
 *
 * Usage:
 * const { error, setError, clearError, handleError } = useErrorHandler();
 *
 * // In async function:
 * try {
 *   await someOperation();
 * } catch (err) {
 *   handleError(err);
 * }
 *
 * // In component:
 * {error && <ErrorMessage message={error} onClose={clearError} />}
 */
export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: Error | unknown) => {
    const message = getUserFriendlyError(err);
    setError(message);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Error Handler]', err);
    }

    // Log to server
    if (err instanceof Error) {
      fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        }),
      }).catch(console.error);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    setError,
    clearError,
    handleError,
  };
}

/**
 * Custom hook for async operations with loading and error states
 *
 * Usage:
 * const { loading, error, execute } = useAsyncOperation();
 *
 * const handleSubmit = async () => {
 *   const result = await execute(async () => {
 *     const response = await fetch('/api/batches', { method: 'POST', ... });
 *     return await response.json();
 *   });
 *
 *   if (result) {
 *     // Success handling
 *   }
 * };
 */
export function useAsyncOperation<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
      throwOnError?: boolean;
    }
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();

      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorMessage = getUserFriendlyError(err);
      setError(errorMessage);

      if (options?.onError && err instanceof Error) {
        options.onError(err);
      }

      // Log error
      if (err instanceof Error) {
        fetch('/api/logs/error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
          }),
        }).catch(console.error);
      }

      if (options?.throwOnError) {
        throw err;
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    clearError,
  };
}

/**
 * Custom hook for data fetching with error handling and retries
 *
 * Usage:
 * const { data, loading, error, refetch } = useFetch<Batch[]>('/api/batches');
 */
export function useFetch<T>(
  url: string,
  options?: {
    skip?: boolean;
    retries?: number;
    onError?: (error: Error) => void;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const maxRetries = options?.retries || 1;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();

        if (json.success) {
          setData(json.data);
          setLoading(false);
          return json.data;
        } else {
          throw new Error(json.error || 'Request failed');
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < maxRetries - 1) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    if (lastError) {
      const errorMessage = getUserFriendlyError(lastError);
      setError(errorMessage);

      if (options?.onError) {
        options.onError(lastError);
      }

      // Log error
      fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: lastError.message,
          stack: lastError.stack,
          timestamp: new Date().toISOString(),
        }),
      }).catch(console.error);
    }

    setLoading(false);
    return null;
  }, [url, options?.retries, options?.onError]);

  // Auto-fetch on mount unless skipped
  useState(() => {
    if (!options?.skip) {
      fetchData();
    }
  });

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
