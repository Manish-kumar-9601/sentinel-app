// hooks/useUserInfo.ts
import { useAuth } from '@/context/AuthContext';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

interface UserInfo {
    name: string;
    email: string;
    phone?: string;
}

interface MedicalInfo {
    bloodGroup: string;
    allergies: string;
    medications: string;
}

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relationship?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface UserInfoData {
    userInfo: UserInfo;
    medicalInfo: MedicalInfo;
    emergencyContacts: EmergencyContact[];
    lastUpdated: string;
}

interface SavePayload {
    userInfo: UserInfo;
    medicalInfo: MedicalInfo;
    emergencyContacts: EmergencyContact[];
    lastUpdated: string;
}

interface SaveResult {
    success: boolean;
    error?: string;
    message?: string;
    lastUpdated?: string;
}

// Get the API base URL based on platform and configuration
const getApiBaseUrl = () => {
    // Always check if running locally first (for both web and development)
    if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        console.log('🌍 Window origin:', origin);

        // If running locally, always use local server
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('10.193.8.138')) {
            console.log('🏠 Using local development API server');
            return `${origin}/api`;
        }
    }

    // Get API URL from expo config
    const configApiUrl = Constants.expoConfig?.extra?.apiUrl;

    if (Platform.OS === 'web') {
        // For production web, use configured API URL
        if (configApiUrl) {
            console.log('☁️ Using configured API URL for web:', configApiUrl);
            return `${configApiUrl}/api`;
        }

        console.log('⚠️ Falling back to relative path');
        return '/api';
    }

    // For mobile, use configured API URL or relative path
    if (configApiUrl) {
        console.log('📱 Using configured API URL for mobile:', configApiUrl);
        return `${configApiUrl}/api`;
    }

    console.log('📱 Mobile platform, using relative path');
    return '/api';
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useUserInfo = () => {
    const { token, user: authUser } = useAuth();
    const [data, setData] = useState<UserInfoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const cacheRef = useRef<{ data: UserInfoData; timestamp: number } | null>(null);
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isMountedRef = useRef(true);
    const fetchInProgressRef = useRef(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, []);

    // Load from cache if valid
    const loadFromCache = useCallback(() => {
        if (cacheRef.current) {
            const age = Date.now() - cacheRef.current.timestamp;
            if (age < CACHE_DURATION) {
                console.log('✅ Loading user info from cache');
                return cacheRef.current.data;
            } else {
                console.log('⏰ Cache expired');
            }
        }
        return null;
    }, []);

    // Save to cache
    const saveToCache = useCallback((newData: UserInfoData) => {
        cacheRef.current = {
            data: newData,
            timestamp: Date.now(),
        };
        console.log('💾 Cached user info');
    }, []);

    // Fetch from API with authentication
    const fetchUserInfo = useCallback(async (forceRefresh = false): Promise<UserInfoData | null> => {
        // Prevent multiple simultaneous fetches
        if (fetchInProgressRef.current && !forceRefresh) {
            console.log('⏳ Fetch already in progress, skipping...');
            return null;
        }

        // Check if token exists
        if (!token) {
            const errorMsg = 'Authentication required. Please log in.';
            console.error('❌ No token available');
            if (isMountedRef.current) {
                setError(errorMsg);
                setLoading(false);
            }
            return null;
        }

        // Check if auth user exists
        if (!authUser) {
            const errorMsg = 'User session not found';
            console.error('❌ No auth user available');
            if (isMountedRef.current) {
                setError(errorMsg);
                setLoading(false);
            }
            return null;
        }

        try {
            // Check cache first unless force refresh
            if (!forceRefresh) {
                const cached = loadFromCache();
                if (cached && isMountedRef.current) {
                    setData(cached);
                    setError(null);
                    setLoading(false);
                    return cached;
                }
            }

            fetchInProgressRef.current = true;
            if (isMountedRef.current) {
                setLoading(true);
                setError(null);
            }

            const apiBase = getApiBaseUrl();
            const url = `${apiBase}/user-info+api`;

            console.log('🔄 Fetching user info from API with auth token...');
            console.log('🌐 API URL:', url);
            console.log('🔑 Token length:', token.length);
            console.log('👤 Auth user:', authUser.email);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }

                console.error('❌ API Error Response:', errorData);

                // Handle specific error codes
                if (response.status === 401) {
                    throw new Error('Session expired. Please log in again.');
                } else if (response.status === 404) {
                    throw new Error('User data not found');
                } else {
                    throw new Error(
                        errorData.error ||
                        errorData.message ||
                        `Failed to fetch user info (${response.status})`
                    );
                }
            }

            const responseData = await response.json();
            console.log('📦 Response data received:', {
                hasUserInfo: !!responseData.userInfo,
                hasMedicalInfo: !!responseData.medicalInfo,
                contactsCount: responseData.emergencyContacts?.length || 0
            });

            // Validate response structure
            if (!responseData.userInfo || !responseData.medicalInfo) {
                throw new Error('Invalid response structure from server');
            }

            const fetchedData: UserInfoData = {
                userInfo: {
                    name: responseData.userInfo.name || '',
                    email: responseData.userInfo.email || '',
                    phone: responseData.userInfo.phone || '',
                },
                medicalInfo: {
                    bloodGroup: responseData.medicalInfo.bloodGroup || '',
                    allergies: responseData.medicalInfo.allergies || '',
                    medications: responseData.medicalInfo.medications || '',
                },
                emergencyContacts: Array.isArray(responseData.emergencyContacts)
                    ? responseData.emergencyContacts
                    : [],
                lastUpdated: responseData.lastUpdated || new Date().toISOString(),
            };

            if (isMountedRef.current) {
                saveToCache(fetchedData);
                setData(fetchedData);
                setLastSync(new Date());
                setError(null);
                console.log('✅ User info fetched and set successfully');
            }

            return fetchedData;

        } catch (err: any) {
            const errorMessage = err.message || 'Failed to fetch user information';
            console.error('❌ Fetch error:', errorMessage);
            console.error('❌ Error details:', err);

            if (isMountedRef.current) {
                setError(errorMessage);
                // Don't clear data on error to preserve cached data
                if (!data) {
                    setData(null);
                }
            }
            return null;
        } finally {
            fetchInProgressRef.current = false;
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [token, authUser, loadFromCache, saveToCache, data]);

    // Save user info with authentication
    const saveUserInfo = useCallback(async (payload: SavePayload): Promise<SaveResult> => {
        // Check if token exists
        if (!token) {
            const errorMsg = 'Authentication required. Please log in.';
            console.error('❌ No token available for save');
            return {
                success: false,
                error: errorMsg,
            };
        }

        try {
            console.log('💾 Saving user info with auth token...');
            console.log('📦 Payload:', {
                hasUserInfo: !!payload.userInfo,
                hasMedicalInfo: !!payload.medicalInfo,
                contactsCount: payload.emergencyContacts?.length || 0
            });

            // Validate payload
            if (!payload.userInfo || !payload.medicalInfo) {
                throw new Error('Invalid payload: missing required fields');
            }

            const apiBase = getApiBaseUrl();
            const url = `${apiBase}/user-info+api`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            console.log('📡 Save response status:', response.status);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }

                console.error('❌ Save Error Response:', errorData);
                throw new Error(
                    errorData.error ||
                    errorData.message ||
                    `Failed to save user info (${response.status})`
                );
            }

            const responseData = await response.json();

            if (isMountedRef.current) {
                // Invalidate cache after successful save
                cacheRef.current = null;
                setError(null);
                console.log('✅ User info saved successfully');
            }

            return {
                success: true,
                message: responseData.message || 'Saved successfully',
                lastUpdated: responseData.lastUpdated || new Date().toISOString(),
            };
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to save user information';
            console.error('❌ Save error:', errorMessage);
            console.error('❌ Error details:', err);

            if (isMountedRef.current) {
                setError(errorMessage);
            }

            return {
                success: false,
                error: errorMessage,
            };
        }
    }, [token]);

    // Main refresh function
    const refresh = useCallback(async (forceRefresh = false) => {
        if (!isMountedRef.current) return;

        // Clear any pending refresh
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = undefined;
        }

        // If not force refresh, use debouncing
        if (!forceRefresh) {
            refreshTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                    fetchUserInfo(false);
                }
            }, 500);
        } else {
            // Force refresh immediately
            await fetchUserInfo(true);
        }
    }, [fetchUserInfo]);

    // Save function that combines validation and API call
    const save = useCallback(async (payload: SavePayload): Promise<SaveResult> => {
        // Validate required fields
        const validationErrors: string[] = [];

        if (!payload.userInfo?.name?.trim()) {
            validationErrors.push('Name is required');
        }

        if (!payload.userInfo?.email?.trim()) {
            validationErrors.push('Email is required');
        }

        // Validate emergency contacts
        if (Array.isArray(payload.emergencyContacts)) {
            payload.emergencyContacts.forEach((contact, index) => {
                if (!contact.name?.trim()) {
                    validationErrors.push(`Contact ${index + 1}: Name is required`);
                }
                if (!contact.phone?.trim()) {
                    validationErrors.push(`Contact ${index + 1}: Phone is required`);
                }
            });
        }

        if (validationErrors.length > 0) {
            return {
                success: false,
                error: validationErrors.join(', '),
            };
        }

        // Call save API
        const result = await saveUserInfo(payload);

        // If successful, refresh the data
        if (result.success && isMountedRef.current) {
            // Invalidate cache to force fresh fetch
            cacheRef.current = null;
            await fetchUserInfo(true);
        }

        return result;
    }, [saveUserInfo, fetchUserInfo]);

    // Initial load on mount or when token changes
    useEffect(() => {
        if (token && authUser) {
            console.log('🚀 Initial fetch triggered by token/user change');
            fetchUserInfo(false);
        } else {
            console.log('⚠️ No token or user, clearing data');
            // Clear data if no token
            setData(null);
            setError(token ? 'User session not found' : 'Authentication required. Please log in.');
            setLoading(false);
        }
    }, [token, authUser]); // Don't include fetchUserInfo to avoid loops

    return {
        data,
        loading,
        error,
        lastSync,
        refresh,
        save,
        fetchUserInfo,
    };
};

export default useUserInfo;