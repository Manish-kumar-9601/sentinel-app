// hooks/useUserInfo.ts
import { useAuth } from '@/context/AuthContext';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';

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

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useUserInfo = () => {
    const { token, user: authUser } = useAuth();
    const [data, setData] = useState<UserInfoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const cacheRef = useRef<{ data: UserInfoData; timestamp: number } | null>(null);
    const isMountedRef = useRef(true);
    const fetchInProgressRef = useRef(false);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const loadFromCache = useCallback(() => {
        if (cacheRef.current) {
            const age = Date.now() - cacheRef.current.timestamp;
            if (age < CACHE_DURATION) {
                console.log('✅ Loading from cache');
                return cacheRef.current.data;
            }
        }
        return null;
    }, []);

    const saveToCache = useCallback((newData: UserInfoData) => {
        cacheRef.current = {
            data: newData,
            timestamp: Date.now(),
        };
    }, []);

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

            // FIXED: Use the same pattern as auth endpoints
            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl) {
                throw new Error('API URL not configured');
            }

            // Use the same URL pattern as your auth endpoints
            const url = `${apiUrl}/api/user-info`;

            console.log('🔄 Fetching user info...');
            console.log('🌐 API URL:', apiUrl);
            console.log('🌐 Full URL:', url);
            console.log('🔑 Token exists:', !!token);
            console.log('👤 User:', authUser.email);

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
                    const text = await response.text();
                    console.error('❌ Response text:', text);
                    errorData = { error: `HTTP ${response.status}: ${text}` };
                }

                console.error('❌ Error response:', errorData);

                if (response.status === 401) {
                    throw new Error('Session expired. Please log in again.');
                } else if (response.status === 404) {
                    throw new Error('User data not found');
                } else {
                    throw new Error(
                        errorData.error ||
                        errorData.message ||
                        `Failed to fetch (${response.status})`
                    );
                }
            }

            const responseData = await response.json();
            console.log('📦 Data received:', {
                hasUserInfo: !!responseData.userInfo,
                hasMedicalInfo: !!responseData.medicalInfo,
                contactsCount: responseData.emergencyContacts?.length || 0
            });

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
                saveToCache(fetchedData);
                setData(fetchedData);
                setLastSync(new Date());
                setError(null);
                console.log('✅ User info loaded successfully');
            }

            return fetchedData;

        } catch (err: any) {
            const errorMessage = err.message || 'Failed to fetch user information';
            console.error('❌ Fetch error:', errorMessage);
            console.error('❌ Error details:', err);

            if (isMountedRef.current) {
                setError(errorMessage);
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

            // FIXED: Use the same pattern as auth endpoints
            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl) {
                throw new Error('API URL not configured');
            }

            const url = `${apiUrl}/api/user-info`;

            console.log('🌐 Save URL:', url);

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
                    const text = await response.text();
                    console.error('❌ Save response text:', text);
                    errorData = { error: `HTTP ${response.status}: ${text}` };
                }

                console.error('❌ Save error response:', errorData);
                throw new Error(
                    errorData.error ||
                    errorData.message ||
                    `Failed to save (${response.status})`
                );
            }

            const responseData = await response.json();

            if (isMountedRef.current) {
                cacheRef.current = null;
                setError(null);
                console.log('✅ Saved successfully');
            }

            return {
                success: true,
                message: responseData.message || 'Saved successfully',
                lastUpdated: responseData.lastUpdated || new Date().toISOString(),
            };
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to save';
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

        if (result.success && isMountedRef.current) {
            cacheRef.current = null;
            await fetchUserInfo(true);
        }

        return result;
    }, [saveUserInfo, fetchUserInfo]);

    useEffect(() => {
        if (token && authUser) {
            console.log('🚀 Initial fetch triggered');
            console.log('👤 User:', authUser.email);
            console.log('🔑 Has token:', !!token);
            fetchUserInfo(false);
        } else {
            console.log('⚠️ No token or user');
            console.log('   Token:', !!token);
            console.log('   User:', !!authUser);
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
        refresh,
        save,
        fetchUserInfo,
    };
};

export default useUserInfo;