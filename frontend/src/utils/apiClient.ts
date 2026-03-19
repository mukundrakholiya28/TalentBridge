/**
 * Centralized API client for the Frontend to communicate with the Node.js / Express Backend.
 */

import { getAuthToken } from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

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

const request = async (endpoint: string, init: RequestInit, requiresAuth: boolean) => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
    };

    if (requiresAuth) {
        const token = getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
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

export const apiClient = {
    get: async (endpoint: string, requiresAuth = true) => {
        return request(endpoint, {
            method: 'GET',
        }, requiresAuth);
    },

    post: async (endpoint: string, body: any, requiresAuth = true) => {
        return request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        }, requiresAuth);
    },

    put: async (endpoint: string, body: any, requiresAuth = true) => {
        return request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        }, requiresAuth);
    },

    delete: async (endpoint: string, requiresAuth = true) => {
        return request(endpoint, {
            method: 'DELETE',
        }, requiresAuth);
    }
};
