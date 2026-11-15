import { useState, useEffect, useCallback } from 'react';

type AsyncFn<T> = (...args: any[]) => Promise<T>;

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(fn: AsyncFn<T>, ...args: any[]) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fn(...args);
      setState({ data, loading: false, error: null });
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Erro desconhecido';
      setState({ data: null, loading: false, error: message });
    }
  }, [fn, ...args]);

  useEffect(() => {
    execute();
  }, [execute]);

  return { ...state, refetch: execute };
}

