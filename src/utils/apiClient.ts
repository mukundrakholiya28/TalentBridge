/**
 * Centralized API client with built-in local-storage caching,
 * stale-while-revalidate, and request deduplication.
 */

import { getAuthToken } from './authStorage';

const getApiBaseUrl = () => {
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) {
        return process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// ─── In-flight deduplication ────────────────────────────────────────────────
const inFlight = new Map<string, Promise<any>>();

// ─── Local-storage cache helpers ────────────────────────────────────────────
const CACHE_PREFIX = 'apicache_';

interface CacheEntry<T> {
    data: T;
    ts: number;
    ttl: number;
}

function readCache<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() - entry.ts > entry.ttl) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return entry.data;
    } catch { return null; }
}

function writeCache<T>(key: string, data: T, ttl: number): void {
    if (typeof window === 'undefined') return;
    try {
        const entry: CacheEntry<T> = { data, ts: Date.now(), ttl };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch { /* storage full – silent */ }
}

export function invalidateCache(pattern?: string): void {
    if (typeof window === 'undefined') return;
    Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_PREFIX) && (!pattern || k.includes(pattern)))
        .forEach(k => localStorage.removeItem(k));
}

// ─── Response parsing ────────────────────────────────────────────────────────
const parseResponse = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    const text = await response.text().catch(() => '');
    return {
        success: false,
        error: text || `Request failed with status ${response.status}`,
        status: response.status,
    };
};

// ─── Core request ────────────────────────────────────────────────────────────
const request = async (
    endpoint: string,
    init: RequestInit,
    requiresAuth: boolean
) => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
    };

    if (requiresAuth) {
        const token = getAuthToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...init,
            headers,
        });
        return await parseResponse(response);
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || 'Network request failed',
            status: 0,
        };
    }
};

// ─── Public API client ────────────────────────────────────────────────────────
export const apiClient = {
    /**
     * GET with stale-while-revalidate caching.
     * ttl: milliseconds to keep the cache (default 60 s).
     * Returns cached data immediately, then revalidates in background.
     */
    get: async (endpoint: string, requiresAuth = true, ttl = 60_000) => {
        const cacheKey = endpoint;

        // 1 – Return cache hit immediately
        const cached = readCache(cacheKey);
        if (cached !== null) {
            // Background revalidation (fire-and-forget)
            request(endpoint, { method: 'GET' }, requiresAuth)
                .then(fresh => writeCache(cacheKey, fresh, ttl))
                .catch(() => {});
            return cached;
        }

        // 2 – Deduplicate identical in-flight GETs
        if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

        const promise = request(endpoint, { method: 'GET' }, requiresAuth)
            .then(data => {
                writeCache(cacheKey, data, ttl);
                inFlight.delete(cacheKey);
                return data;
            })
            .catch(err => {
                inFlight.delete(cacheKey);
                throw err;
            });

        inFlight.set(cacheKey, promise);
        return promise;
    },

    post: async (endpoint: string, body: any, requiresAuth = true) => {
        const data = await request(
            endpoint,
            { method: 'POST', body: JSON.stringify(body) },
            requiresAuth
        );
        // Bust related GET caches on mutation
        const base = endpoint.split('/')[1]; // e.g. 'jobs', 'applications'
        if (base) invalidateCache(base);
        return data;
    },

    put: async (endpoint: string, body: any, requiresAuth = true) => {
        const data = await request(
            endpoint,
            { method: 'PUT', body: JSON.stringify(body) },
            requiresAuth
        );
        const base = endpoint.split('/')[1];
        if (base) invalidateCache(base);
        return data;
    },

    delete: async (endpoint: string, requiresAuth = true) => {
        const data = await request(
            endpoint,
            { method: 'DELETE' },
            requiresAuth
        );
        const base = endpoint.split('/')[1];
        if (base) invalidateCache(base);
        return data;
    },
};
