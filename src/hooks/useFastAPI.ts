import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithCache, getCachedData, setCachedData, startPolling, stopPolling } from '@/lib/performance';

interface UseFastAPIOptions {
  cacheTime?: number;
  useCache?: boolean;
  pollInterval?: number; // Enable polling if set
  enabled?: boolean; // Disable fetching if false
}

interface UseFastAPIResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void; // Optimistic update
}

/**
 * Fast API hook with caching, polling, and optimistic updates
 */
export function useFastAPI<T>(
  url: string | null,
  options: UseFastAPIOptions = {}
): UseFastAPIResult<T> {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes
    useCache = true,
    pollInterval,
    enabled = true
  } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  
  const cacheKey = url ? `cache_${url}` : null;
  
  // Fetch function
  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;
    
    // Check cache first
    if (useCache && cacheKey) {
      const cached = getCachedData<T>(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        
        // Background revalidation
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          const fresh = await response.json();
          
          if (mountedRef.current) {
            setData(fresh);
            setCachedData(cacheKey, fresh, cacheTime);
          }
        } catch {}
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const result = await fetchWithCache<T>(url, {
        cacheKey: cacheKey || undefined,
        cacheTime,
        useCache,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err as Error);
        setLoading(false);
      }
    }
  }, [url, cacheKey, cacheTime, useCache, enabled]);
  
  // Optimistic update
  const mutate = useCallback((newData: T) => {
    setData(newData);
    if (cacheKey) {
      setCachedData(cacheKey, newData, cacheTime);
    }
  }, [cacheKey, cacheTime]);
  
  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Polling
  useEffect(() => {
    if (!url || !pollInterval || !enabled) return;
    
    const pollingKey = `poll_${url}`;
    const cleanup = startPolling(
      pollingKey,
      async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return response.json();
      },
      {
        interval: pollInterval,
        onData: (freshData) => {
          if (mountedRef.current) {
            setData(freshData);
            if (cacheKey) {
              setCachedData(cacheKey, freshData, cacheTime);
            }
          }
        },
        onError: (err) => {
          if (mountedRef.current) {
            setError(err);
          }
        }
      }
    );
    
    return cleanup;
  }, [url, pollInterval, cacheKey, cacheTime, enabled]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (url) {
        stopPolling(`poll_${url}`);
      }
    };
  }, [url]);
  
  return {
    data,
    loading,
    error,
    refetch: fetchData,
    mutate
  };
}
