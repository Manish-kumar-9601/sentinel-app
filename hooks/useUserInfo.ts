// hooks/useUserInfo.ts - IMPROVED VERSION
import { useAuth } from '@/context/AuthContext';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    CacheManager,
    NetworkManager,
    OfflineQueueManager,
    SYNC_CONFIG
} from '@/utils/syncManager';

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

interface SavePayload extends UserInfoData { }

interface SaveResult {
    success: boolean;
    error?: string;
    message?: string;
    offline?: boolean;
}

export const useUserInfo = () => {
    const { token, user: authUser } = useAuth();

    // State
    const [data, setData] = useState<UserInfoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasLocalChanges, setHasLocalChanges] = useState(false);

    // Refs
    const isMountedRef = useRef(true);
    const fetchInProgressRef = useRef(false);
    const autoSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const originalDataRef = useRef<UserInfoData | null>(null);

    // Initialize network listener
    useEffect(() => {
        const unsubscribe = NetworkManager.getInstance().subscribe(online => {
            console.log(`📡 Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
            setIsOnline(online);

            // Auto-sync when coming online with changes
            if (online && hasLocalChanges) {
                console.log('🔄 Came online with local changes, syncing...');
                syncToServer();
            }
        });

        return () => {
            isMountedRef.current = false;
            unsubscribe();
            if (autoSyncTimeoutRef.current) {
                clearTimeout(autoSyncTimeoutRef.current);
            }
        };
    }, [hasLocalChanges]);

    /**
     * Load from cache with fallback strategy
     */
    const loadFromCache = useCallback(async (): Promise<UserInfoData | null> => {
        try {
            // Try fresh cache first
            const cached = await CacheManager.get<UserInfoData>(
                SYNC_CONFIG.KEYS.USER_INFO,
                SYNC_CONFIG.EXPIRY.USER_INFO
            );

            if (cached) {
                console.log('✅ Loaded from fresh cache');
                setHasLocalChanges(!cached.metadata.synced);
                return cached.data;
            }

            // If offline, try stale cache
            if (!isOnline) {
                const stale = await CacheManager.get<UserInfoData>(
                    SYNC_CONFIG.KEYS.USER_INFO,
                    SYNC_CONFIG.EXPIRY.OFFLINE_FALLBACK
                );

                if (stale) {
                    console.log('⚠️ Using stale cache (offline mode)');
                    setHasLocalChanges(!stale.metadata.synced);
                    return stale.data;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Cache load failed:', error);
            return null;
        }
    }, [isOnline]);

    /**
     * Save to cache
     */
    const saveToCache = useCallback(async (
        newData: UserInfoData,
        synced: boolean = false
    ): Promise<void> => {
        try {
            await CacheManager.set(SYNC_CONFIG.KEYS.USER_INFO, newData, synced);
            setHasLocalChanges(!synced);
            console.log(`💾 Saved to cache (synced: ${synced})`);
        } catch (error) {
            console.error('❌ Cache save failed:', error);
        }
    }, []);

    /**
     * Fetch from API with retry logic
     */
    const fetchFromAPI = useCallback(async (): Promise<UserInfoData | null> => {
        if (!token || !authUser) {
            throw new Error('Authentication required');
        }

        const apiUrl = Constants.expoConfig?.extra?.apiUrl;
        if (!apiUrl) {
            throw new Error('API URL not configured');
        }

        let lastError: Error | null = null;

        // Retry logic
        for (let attempt = 1; attempt <= SYNC_CONFIG.MAX_RETRIES; attempt++) {
            try {
                console.log(`🌐 Fetching from API (attempt ${attempt})...`);

                const response = await fetch(`${apiUrl}/api/user-info`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Session expired. Please log in again.');
                    }
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}`);
                }

                const responseData = await response.json();

                const fetchedData: UserInfoData = {
                    userInfo: {
                        name: responseData.userInfo?.name || '',
                        email: responseData.userInfo?.email || '',
                        phone: responseData.userInfo?.phone || '',
                    },
                    medicalInfo: {
                        bloodGroup: responseData.medicalInfo?.bloodGroup || '',
                        allergies: responseData.medicalInfo?.allergies || '',
                        medications: responseData.medicalInfo?.medications || '',
                    },
                    emergencyContacts: Array.isArray(responseData.emergencyContacts)
                        ? responseData.emergencyContacts
                        : [],
                    lastUpdated: responseData.lastUpdated || new Date().toISOString(),
                };

                console.log('✅ Fetched from API successfully');
                return fetchedData;

            } catch (error: any) {
                lastError = error;
                console.error(`❌ Fetch attempt ${attempt} failed:`, error.message);

                // Don't retry on auth errors
                if (error.message.includes('Session expired')) {
                    throw error;
                }

                // Wait before retry
                if (attempt < SYNC_CONFIG.MAX_RETRIES) {
                    await new Promise(resolve =>
                        setTimeout(resolve, SYNC_CONFIG.RETRY_DELAY * attempt)
                    );
                }
            }
        }

        throw lastError || new Error('Failed to fetch after retries');
    }, [token, authUser]);

    /**
     * Main fetch function with cache-first strategy
     */
    const fetchUserInfo = useCallback(async (forceRefresh = false): Promise<void> => {
        if (fetchInProgressRef.current && !forceRefresh) {
            console.log('⏳ Fetch already in progress');
            return;
        }

        if (!token || !authUser) {
            setError('Authentication required');
            setLoading(false);
            return;
        }

        fetchInProgressRef.current = true;
        setLoading(true);
        setError(null);

        try {
            // Cache-first strategy (unless force refresh)
            if (!forceRefresh) {
                const cached = await loadFromCache();
                if (cached) {
                    setData(cached);
                    originalDataRef.current = cached;
                    setLoading(false);

                    // Background refresh if online
                    if (isOnline) {
                        fetchFromAPI()
                            .then(async freshData => {
                                if (isMountedRef.current && freshData) {
                                    await saveToCache(freshData, true);
                                    setData(freshData);
                                    originalDataRef.current = freshData;
                                    setLastSync(new Date());
                                }
                            })
                            .catch(err => console.warn('Background refresh failed:', err));
                    }

                    return;
                }
            }

            // If offline, must use cache
            if (!isOnline) {
                const cached = await loadFromCache();
                if (cached) {
                    setData(cached);
                    originalDataRef.current = cached;
                    setError('Offline - showing cached data');
                } else {
                    throw new Error('No cached data available offline');
                }
                return;
            }

            // Fetch from API
            const fetchedData = await fetchFromAPI();

            if (fetchedData && isMountedRef.current) {
                await saveToCache(fetchedData, true);
                setData(fetchedData);
                originalDataRef.current = fetchedData;
                setLastSync(new Date());
                setError(null);
            }

        } catch (err: any) {
            const errorMessage = err.message || 'Failed to load user information';
            console.error('❌ Fetch error:', errorMessage);

            if (isMountedRef.current) {
                setError(errorMessage);

                // Fallback to cache
                if (!data) {
                    const cached = await loadFromCache();
                    if (cached) {
                        setData(cached);
                        originalDataRef.current = cached;
                        setError(errorMessage + ' (using cached data)');
                    }
                }
            }
        } finally {
            fetchInProgressRef.current = false;
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [token, authUser, isOnline, loadFromCache, saveToCache, fetchFromAPI]);

    /**
     * Sync local changes to server
     */
    const syncToServer = useCallback(async (): Promise<boolean> => {
        if (!hasLocalChanges || !isOnline || !data || isSyncing) {
            console.log('⏭️ Skipping sync:', { hasLocalChanges, isOnline, hasData: !!data, isSyncing });
            return false;
        }

        setIsSyncing(true);

        try {
            console.log('🔄 Syncing local changes to server...');

            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl || !token) {
                throw new Error('Cannot sync: missing config or token');
            }

            const response = await fetch(`${apiUrl}/api/user-info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Sync failed: HTTP ${response.status}`);
            }

            // Mark as synced in cache
            await saveToCache(data, true);
            originalDataRef.current = data;
            setLastSync(new Date());
            console.log('✅ Synced to server successfully');
            return true;

        } catch (error: any) {
            console.error('❌ Sync to server failed:', error.message);
            return false;
        } finally {
            setIsSyncing(false);
        }
    }, [hasLocalChanges, isOnline, data, token, saveToCache, isSyncing]);

    /**
     * Save with optimistic update and offline queue
     */
    const save = useCallback(async (payload: SavePayload): Promise<SaveResult> => {
        if (!token) {
            return { success: false, error: 'Authentication required' };
        }

        // Validation
        const errors: string[] = [];
        if (!payload.userInfo?.name?.trim()) errors.push('Name is required');
        if (!payload.userInfo?.email?.trim()) errors.push('Email is required');

        payload.emergencyContacts?.forEach((contact, i) => {
            if (!contact.name?.trim()) errors.push(`Contact ${i + 1}: Name required`);
            if (!contact.phone?.trim()) errors.push(`Contact ${i + 1}: Phone required`);
        });

        if (errors.length > 0) {
            return { success: false, error: errors.join(', ') };
        }

        try {
            // Store original data for rollback
            const rollbackData = data;

            // Optimistic update
            const updatedData: UserInfoData = {
                ...payload,
                lastUpdated: new Date().toISOString(),
            };

            setData(updatedData);
            await saveToCache(updatedData, false);

            // If offline, queue for later
            if (!isOnline) {
                console.log('📴 Offline: queuing save operation');

                await OfflineQueueManager.getInstance().add({
                    type: 'UPDATE',
                    entity: 'USER_INFO',
                    data: payload,
                    token,
                });

                return {
                    success: true,
                    message: 'Saved locally. Will sync when online.',
                    offline: true,
                };
            }

            // Online: save to server
            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl) {
                throw new Error('API URL not configured');
            }

            console.log('💾 Saving to server...');

            const response = await fetch(`${apiUrl}/api/user-info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.details || `Save failed: HTTP ${response.status}`);
            }

            // Success: mark as synced
            await saveToCache(updatedData, true);
            originalDataRef.current = updatedData;
            setLastSync(new Date());

            console.log('✅ Saved successfully');
            return {
                success: true,
                message: 'Saved successfully',
                offline: false,
            };

        } catch (error: any) {
            console.error('❌ Save error:', error.message);

            // Revert optimistic update
            if (originalDataRef.current && isMountedRef.current) {
                console.log('⏮️ Reverting to original data');
                setData(originalDataRef.current);
                await saveToCache(originalDataRef.current, false);
            }

            return {
                success: false,
                error: error.message || 'Failed to save',
            };
        }
    }, [token, isOnline, data, saveToCache]);

    /**
     * Refresh function
     */
    const refresh = useCallback(async (forceRefresh = false) => {
        if (!isMountedRef.current) return;
        await fetchUserInfo(forceRefresh);
    }, [fetchUserInfo]);

    // Initial load
    useEffect(() => {
        if (token && authUser) {
            console.log('🚀 Initial fetch');
            fetchUserInfo(false);

            // Setup auto-sync check
            autoSyncTimeoutRef.current = setInterval(() => {
                if (hasLocalChanges && isOnline && !isSyncing) {
                    console.log('⏰ Auto-sync check...');
                    syncToServer();
                }
            }, 60000); // Check every minute
        } else {
            setData(null);
            setError('Authentication required');
            setLoading(false);
        }

        return () => {
            if (autoSyncTimeoutRef.current) {
                clearInterval(autoSyncTimeoutRef.current);
            }
        };
    }, [token, authUser]);

    return {
        data,
        loading,
        error,
        lastSync,
        isOnline,
        isSyncing,
        hasLocalChanges,
        refresh,
        save,
        syncToServer,
    };
};

export default useUserInfo;

// Export types for reuse
export type { UserInfo, MedicalInfo, EmergencyContact, UserInfoData, SavePayload, SaveResult };