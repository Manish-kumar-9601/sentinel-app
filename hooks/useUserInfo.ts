// hooks/useUserInfo.ts - UPDATED VERSION
import { useAuth } from '@/context/AuthContext';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CacheManager, OfflineQueueManager, NetworkStatusManager, CACHE_KEYS, CACHE_EXPIRY } from '@/utils/enhancedDataSync';

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
    offline?: boolean;
}

export const useUserInfo = () => {
    const { token, user: authUser } = useAuth();
    const [data, setData] = useState<UserInfoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isOnline, setIsOnline] = useState(true);

    const isMountedRef = useRef(true);
    const fetchInProgressRef = useRef(false);

    // Setup network listener
    useEffect(() => {
        const networkManager = NetworkStatusManager.getInstance();

        // Set initial status
        setIsOnline(networkManager.getStatus());

        // Subscribe to changes
        const unsubscribe = networkManager.subscribe((online) => {
            setIsOnline(online);

            // Auto-refresh when coming back online
            if (online && data) {
                console.log('🔄 Back online, refreshing data...');
                fetchUserInfo(true);
            }
        });

        return () => {
            isMountedRef.current = false;
            unsubscribe();
        };
    }, [data]);

    /**
     * Load from persistent cache
     */
    const loadFromPersistentCache = useCallback(async (): Promise<UserInfoData | null> => {
        try {
            // Try to get from persistent cache
            const cached = await CacheManager.get<UserInfoData>(
                CACHE_KEYS.USER_INFO,
                CACHE_EXPIRY.USER_INFO
            );

            if (cached) {
                console.log('✅ Loaded user info from persistent cache');
                return cached;
            }

            // If cache expired but we're offline, try to get stale data
            if (!isOnline) {
                const stale = await CacheManager.get<UserInfoData>(
                    CACHE_KEYS.USER_INFO,
                    CACHE_EXPIRY.OFFLINE_FALLBACK
                );

                if (stale) {
                    console.log('⚠️ Using stale cache (offline mode)');
                    return stale;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Failed to load from cache:', error);
            return null;
        }
    }, [isOnline]);

    /**
     * Save to persistent cache
     */
    const saveToPersistentCache = useCallback(async (newData: UserInfoData): Promise<void> => {
        try {
            await CacheManager.set(CACHE_KEYS.USER_INFO, newData);
            console.log('💾 Saved user info to persistent cache');
        } catch (error) {
            console.error('❌ Failed to save to cache:', error);
        }
    }, []);

    /**
     * Fetch user info from API
     */
    const fetchUserInfo = useCallback(async (forceRefresh = false): Promise<UserInfoData | null> => {
        if (fetchInProgressRef.current && !forceRefresh) {
            console.log('⏳ Fetch in progress, skipping...');
            return null;
        }

        if (!token) {
            const errorMsg = 'Authentication required';
            console.error('❌ No token');
            if (isMountedRef.current) {
                setError(errorMsg);
                setLoading(false);
            }
            return null;
        }

        if (!authUser) {
            const errorMsg = 'User session not found';
            console.error('❌ No auth user');
            if (isMountedRef.current) {
                setError(errorMsg);
                setLoading(false);
            }
            return null;
        }

        try {
            // Try cache first (unless force refresh)
            if (!forceRefresh) {
                const cached = await loadFromPersistentCache();
                if (cached && isMountedRef.current) {
                    setData(cached);
                    setError(null);
                    setLoading(false);
                    return cached;
                }
            }

            // If offline, use any available cache
            if (!isOnline) {
                console.log('📴 Offline mode - using cached data');
                const cached = await loadFromPersistentCache();

                if (cached && isMountedRef.current) {
                    setData(cached);
                    setError('Offline - showing cached data');
                    setLoading(false);
                    return cached;
                } else {
                    throw new Error('No cached data available in offline mode');
                }
            }

            fetchInProgressRef.current = true;
            if (isMountedRef.current) {
                setLoading(true);
                setError(null);
            }

            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl) {
                throw new Error('API URL not configured');
            }

            const url = `${apiUrl}/api/user-info`;

            console.log('🔄 Fetching user info from API...');
            console.log('🌐 URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: `HTTP ${response.status}` };
                }

                if (response.status === 401) {
                    throw new Error('Session expired. Please log in again.');
                } else if (response.status === 404) {
                    throw new Error('User data not found');
                } else {
                    throw new Error(errorData.error || `Failed to fetch (${response.status})`);
                }
            }

            const responseData = await response.json();

            if (!responseData.userInfo || !responseData.medicalInfo) {
                throw new Error('Invalid response structure');
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
                // Save to persistent cache
                await saveToPersistentCache(fetchedData);

                setData(fetchedData);
                setLastSync(new Date());
                setError(null);
                console.log('✅ User info loaded and cached');
            }

            return fetchedData;

        } catch (err: any) {
            const errorMessage = err.message || 'Failed to fetch user information';
            console.error('❌ Fetch error:', errorMessage);

            if (isMountedRef.current) {
                setError(errorMessage);

                // Try to use cached data as fallback
                if (!data) {
                    const cached = await loadFromPersistentCache();
                    if (cached) {
                        setData(cached);
                        setError(errorMessage + ' (using cached data)');
                    }
                }
            }
            return null;
        } finally {
            fetchInProgressRef.current = false;
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [token, authUser, isOnline, loadFromPersistentCache, saveToPersistentCache, data]);

    /**
     * Save user info
     */
    const saveUserInfo = useCallback(async (payload: SavePayload): Promise<SaveResult> => {
        if (!token) {
            return {
                success: false,
                error: 'Authentication required',
            };
        }

        try {
            console.log('💾 Saving user info...');

            if (!payload.userInfo || !payload.medicalInfo) {
                throw new Error('Invalid payload');
            }

            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl) {
                throw new Error('API URL not configured');
            }

            const url = `${apiUrl}/api/user-info`;

            // If offline, queue the request
            if (!isOnline) {
                console.log('📴 Offline - queueing save request');

                const queueManager = OfflineQueueManager.getInstance();
                await queueManager.add(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload)
                });

                // Update local cache optimistically
                const optimisticData: UserInfoData = {
                    userInfo: payload.userInfo,
                    medicalInfo: payload.medicalInfo,
                    emergencyContacts: payload.emergencyContacts,
                    lastUpdated: payload.lastUpdated
                };

                await saveToPersistentCache(optimisticData);

                if (isMountedRef.current) {
                    setData(optimisticData);
                    setError(null);
                }

                return {
                    success: true,
                    message: 'Saved locally. Will sync when online.',
                    offline: true,
                    lastUpdated: payload.lastUpdated
                };
            }

            // Online - save directly
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            console.log('📡 Save response:', response.status);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: `HTTP ${response.status}` };
                }

                throw new Error(errorData.error || `Failed to save (${response.status})`);
            }

            const responseData = await response.json();

            if (isMountedRef.current) {
                // Clear cache to force refresh
                await CacheManager.remove(CACHE_KEYS.USER_INFO);
                setError(null);
                console.log('✅ Saved successfully');
            }

            return {
                success: true,
                message: responseData.message || 'Saved successfully',
                lastUpdated: responseData.lastUpdated || new Date().toISOString(),
                offline: false
            };
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to save';
            console.error('❌ Save error:', errorMessage);

            if (isMountedRef.current) {
                setError(errorMessage);
            }

            return {
                success: false,
                error: errorMessage,
            };
        }
    }, [token, isOnline, saveToPersistentCache]);

    const refresh = useCallback(async (forceRefresh = false) => {
        if (!isMountedRef.current) return;
        await fetchUserInfo(forceRefresh);
    }, [fetchUserInfo]);

    const save = useCallback(async (payload: SavePayload): Promise<SaveResult> => {
        const validationErrors: string[] = [];

        if (!payload.userInfo?.name?.trim()) {
            validationErrors.push('Name is required');
        }

        if (!payload.userInfo?.email?.trim()) {
            validationErrors.push('Email is required');
        }

        if (Array.isArray(payload.emergencyContacts)) {
            payload.emergencyContacts.forEach((contact, index) => {
                if (!contact.name?.trim()) {
                    validationErrors.push(`Contact ${index + 1}: Name required`);
                }
                if (!contact.phone?.trim()) {
                    validationErrors.push(`Contact ${index + 1}: Phone required`);
                }
            });
        }

        if (validationErrors.length > 0) {
            return {
                success: false,
                error: validationErrors.join(', '),
            };
        }

        const result = await saveUserInfo(payload);

        if (result.success && isMountedRef.current && !result.offline) {
            // Refresh from server to ensure sync
            await fetchUserInfo(true);
        }

        return result;
    }, [saveUserInfo, fetchUserInfo]);

    // Initial load
    useEffect(() => {
        if (token && authUser) {
            console.log('🚀 Initial fetch');
            fetchUserInfo(false);
        } else {
            console.log('⚠️ No token/user');
            setData(null);
            setError(token ? 'User session not found' : 'Authentication required');
            setLoading(false);
        }
    }, [token, authUser]);

    return {
        data,
        loading,
        error,
        lastSync,
        isOnline,
        refresh,
        save,
        fetchUserInfo,
    };
};

export default useUserInfo;