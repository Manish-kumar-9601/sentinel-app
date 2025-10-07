import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface FetchOptions extends RequestInit {
    retries?: number;
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
    endpoint: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { retries = MAX_RETRIES, ...fetchOptions } = options;

    if (!API_URL) {
        throw new Error('API URL not configured');
    }

    const url = `${API_URL}${endpoint}`;

    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(url, {
                ...fetchOptions,
                headers: {
                    'Content-Type': 'application/json',
                    ...fetchOptions.headers,
                },
            });

            // Don't retry on client errors (4xx)
            if (response.status >= 400 && response.status < 500) {
                return response;
            }

            // Retry on server errors (5xx)
            if (response.status >= 500 && i < retries) {
                console.log(`Retry attempt ${i + 1} for ${endpoint}`);
                await delay(RETRY_DELAY * (i + 1)); // Exponential backoff
                continue;
            }

            return response;
        } catch (error) {
            if (i === retries) {
                throw error;
            }
            console.log(`Network error, retry attempt ${i + 1}`);
            await delay(RETRY_DELAY * (i + 1));
        }
    }

    throw new Error('Max retries exceeded');
}