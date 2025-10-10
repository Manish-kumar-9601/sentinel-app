import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
const TOKEN_KEY = 'auth_token';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface FetchOptions extends RequestInit {
    retries?: number;
    requiresAuth?: boolean;
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAuthToken(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
        console.error('Failed to get auth token:', error);
        return null;
    }
}

export async function authenticatedFetch(
    endpoint: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { retries = MAX_RETRIES, requiresAuth = true, ...fetchOptions } = options;

    if (!API_URL) {
        throw new Error('API URL not configured');
    }

    const url = `${API_URL}${endpoint}`;

    // Get auth token if required
    let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
    };

    if (requiresAuth) {
        const token = await getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('📤 Request with auth token to:', endpoint);
        } else {
            console.warn('⚠️ No auth token found for authenticated request');
            throw new Error('Authentication required but no token found');
        }
    }

    for (let i = 0; i <= retries; i++) {
        try {
            console.log(`🌐 Fetching: ${endpoint} (attempt ${i + 1})`);
            
            const response = await fetch(url, {
                ...fetchOptions,
                headers,
            });

            console.log(`📥 Response status: ${response.status} for ${endpoint}`);

            // Don't retry on client errors (4xx)
            if (response.status >= 400 && response.status < 500) {
                return response;
            }

            // Retry on server errors (5xx)
            if (response.status >= 500 && i < retries) {
                console.log(`⚠️ Server error, retry attempt ${i + 1} for ${endpoint}`);
                await delay(RETRY_DELAY * (i + 1));
                continue;
            }

            return response;
        } catch (error) {
            console.error(`❌ Network error (attempt ${i + 1}):`, error);
            if (i === retries) {
                throw error;
            }
            console.log(`🔄 Retrying after network error...`);
            await delay(RETRY_DELAY * (i + 1));
        }
    }

    throw new Error('Max retries exceeded');
}

// Convenience methods
export const api = {
    get: async (endpoint: string, options?: FetchOptions) => {
        return authenticatedFetch(endpoint, { ...options, method: 'GET' });
    },
    
    post: async (endpoint: string, data?: any, options?: FetchOptions) => {
        return authenticatedFetch(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    },
    
    put: async (endpoint: string, data?: any, options?: FetchOptions) => {
        return authenticatedFetch(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    },
    
    delete: async (endpoint: string, options?: FetchOptions) => {
        return authenticatedFetch(endpoint, { ...options, method: 'DELETE' });
    },
};

// Export for backward compatibility
export { authenticatedFetch as fetchWithRetry };