// hooks/useUserInfo.ts
import { useState, useCallback, useRef, useEffect } from 'react';

interface UserInfo {
    name: string;
    email: string;
    phone?: string;
}

interface MedicalInfo {
    bloodGroup: string;
    allergies: string;
    medications: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
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

const API_BASE = '/api/userInfo';
const CACHE_KEY = 'user_info_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useUserInfo = () => {
    const [data, setData] = useState<UserInfoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    
    const cacheRef = useRef<{ data: UserInfoData; timestamp: number } | null>(null);
    const refreshTimeoutRef = useRef<NodeJS.Timeout>();
    const isMountedRef = useRef(true);

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

    // Fetch from API
    const fetchUserInfo = useCallback(async (forceRefresh = false): Promise<UserInfoData | null> => {
        try {
            // Check cache first unless force refresh
            if (!forceRefresh) {
                const cached = loadFromCache();
                if (cached) {
                    setData(cached);
                    setError(null);
                    return cached;
                }
            }

            setLoading(true);
            console.log('🔄 Fetching user info from API...');

            const response = await fetch(`${API_BASE}/get-user-info+api`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || 
                    errorData.message || 
                    `Failed to fetch user info (${response.status})`
                );
            }

            const responseData = await response.json();
            
            // Validate response structure
            if (!responseData.userInfo || !responseData.medicalInfo) {
                throw new Error('Invalid response structure from server');
            }

            const fetchedData: UserInfoData = {
                userInfo: responseData.userInfo,
                medicalInfo: responseData.medicalInfo,
                emergencyContacts: responseData.emergencyContacts || [],
                lastUpdated: responseData.lastUpdated || new Date().toISOString(),
            };

            if (isMountedRef.current) {
                saveToCache(fetchedData);
                setData(fetchedData);
                setLastSync(new Date());
                setError(null);
                console.log('✅ User info fetched successfully');
                return fetchedData;
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to fetch user information';
            console.error('❌ Fetch error:', errorMessage);
            
            if (isMountedRef.current) {
                setError(errorMessage);
                setData(null);
            }
            return null;
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [loadFromCache, saveToCache]);

    // Save user info
    const saveUserInfo = useCallback(async (payload: SavePayload): Promise<SaveResult> => {
        try {
            console.log('💾 Saving user info...');
            
            // Validate payload
            if (!payload.userInfo || !payload.medicalInfo) {
                throw new Error('Invalid payload: missing required fields');
            }

            const response = await fetch(`${API_BASE}/post-user-info+api`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
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
            
            if (isMountedRef.current) {
                setError(errorMessage);
            }

            return {
                success: false,
                error: errorMessage,
            };
        }
    }, []);

    // Main refresh function
    const refresh = useCallback(async (forceRefresh = false) => {
        if (!isMountedRef.current) return;

        // If not force refresh, use debouncing
        if (!forceRefresh) {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }

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

    // Initial load on mount
    useEffect(() => {
        fetchUserInfo(false);
    }, [fetchUserInfo]);

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