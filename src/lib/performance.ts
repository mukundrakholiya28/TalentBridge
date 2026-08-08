/**
 * Performance utilities for caching, optimistic updates, and fast data access
 */

// ==================== LOCAL STORAGE CACHE ====================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

/**
 * Get data from localStorage cache
 */
export function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > entry.expiresIn) {
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Set data in localStorage cache
 */
export function setCachedData<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000): void {
  if (typeof window === 'undefined') return;
  
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresIn
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
}

/**
 * Clear cached data
 */
export function clearCache(key?: string): void {
  if (typeof window === 'undefined') return;
  
  if (key) {
    localStorage.removeItem(key);
  } else {
    // Clear all cache entries
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith('cache_')) {
        localStorage.removeItem(k);
      }
    });
  }
}

// ==================== OPTIMISTIC UPDATES ====================

/**
 * Perform optimistic update with rollback on error
 */
export async function optimisticUpdate<T, R>(
  options: {
    key: string;
    updateFn: (current: T) => T;
    apiFn: () => Promise<R>;
    onSuccess?: (result: R) => void;
    onError?: (error: Error) => void;
  }
): Promise<R | null> {
  const { key, updateFn, apiFn, onSuccess, onError } = options;
  
  // Get current cached data
  const current = getCachedData<T>(key);
  if (!current) {
    try {
      const result = await apiFn();
      onSuccess?.(result);
      return result;
    } catch (error) {
      onError?.(error as Error);
      return null;
    }
  }
  
  // Store original for rollback
  const original = structuredClone(current);
  
  // Apply optimistic update immediately
  const updated = updateFn(current);
  setCachedData(key, updated);
  
  try {
    // Perform API call in background
    const result = await apiFn();
    onSuccess?.(result);
    return result;
  } catch (error) {
    // Rollback on error
    setCachedData(key, original);
    onError?.(error as Error);
    return null;
  }
}

// ==================== FETCH WITH CACHE ====================

export interface FetchOptions extends RequestInit {
  cacheKey?: string;
  cacheTime?: number; // milliseconds
  useCache?: boolean;
}

/**
 * Fetch with automatic caching and stale-while-revalidate
 */
export async function fetchWithCache<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    cacheKey = `cache_${url}`,
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    useCache = true,
    ...fetchOptions
  } = options;
  
  // Try to get cached data first
  if (useCache) {
    const cached = getCachedData<T>(cacheKey);
    if (cached) {
      // Return cached data immediately
      // But revalidate in background
      fetch(url, fetchOptions)
        .then(res => res.json())
        .then(fresh => setCachedData(cacheKey, fresh, cacheTime))
        .catch(() => {}); // Silent fail for background update
      
      return cached;
    }
  }
  
  // No cache, fetch fresh data
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data: T = await response.json();
  
  // Cache the result
  if (useCache) {
    setCachedData(cacheKey, data, cacheTime);
  }
  
  return data;
}

// ==================== POLLING WITH EXPONENTIAL BACKOFF ====================

export interface PollingOptions {
  interval: number; // milliseconds
  maxInterval?: number; // max interval for exponential backoff
  onData: (data: any) => void;
  onError?: (error: Error) => void;
  shouldContinue?: () => boolean;
}

let pollingTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Start polling with exponential backoff on errors
 */
export function startPolling(
  key: string,
  fetchFn: () => Promise<any>,
  options: PollingOptions
): () => void {
  const {
    interval,
    maxInterval = interval * 10,
    onData,
    onError,
    shouldContinue = () => true
  } = options;
  
  let currentInterval = interval;
  let consecutiveErrors = 0;
  
  const poll = async () => {
    if (!shouldContinue()) {
      stopPolling(key);
      return;
    }
    
    try {
      const data = await fetchFn();
      onData(data);
      
      // Reset on success
      consecutiveErrors = 0;
      currentInterval = interval;
    } catch (error) {
      consecutiveErrors++;
      onError?.(error as Error);
      
      // Exponential backoff
      currentInterval = Math.min(
        currentInterval * Math.pow(2, consecutiveErrors),
        maxInterval
      );
    }
    
    // Schedule next poll
    const timer = setTimeout(poll, currentInterval);
    pollingTimers.set(key, timer);
  };
  
  // Start first poll
  poll();
  
  // Return cleanup function
  return () => stopPolling(key);
}

/**
 * Stop polling
 */
export function stopPolling(key: string): void {
  const timer = pollingTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    pollingTimers.delete(key);
  }
}

/**
 * Stop all polling
 */
export function stopAllPolling(): void {
  pollingTimers.forEach(timer => clearTimeout(timer));
  pollingTimers.clear();
}

// ==================== DEBOUNCE & THROTTLE ====================

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return function(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ==================== BATCH REQUESTS ====================

interface BatchRequest {
  url: string;
  options?: RequestInit;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

let batchQueue: BatchRequest[] = [];
let batchTimer: NodeJS.Timeout | null = null;

/**
 * Batch multiple requests into single call
 */
export function batchFetch<T>(url: string, options?: RequestInit): Promise<T> {
  return new Promise((resolve, reject) => {
    batchQueue.push({ url, options, resolve, reject });
    
    // Schedule batch processing
    if (batchTimer) clearTimeout(batchTimer);
    batchTimer = setTimeout(processBatch, 50); // 50ms batching window
  });
}

async function processBatch() {
  if (batchQueue.length === 0) return;
  
  const requests = [...batchQueue];
  batchQueue = [];
  
  // Process all requests in parallel
  await Promise.allSettled(
    requests.map(async ({ url, options, resolve, reject }) => {
      try {
        const response = await fetch(url, options);
        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    })
  );
}

// ==================== PRELOAD ====================

/**
 * Preload data before it's needed
 */
export function preloadData<T>(
  url: string,
  cacheKey?: string,
  cacheTime?: number
): Promise<T> {
  return fetchWithCache<T>(url, { cacheKey, cacheTime });
}

/**
 * Preload image
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}
