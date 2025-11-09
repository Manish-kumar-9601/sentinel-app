/**
 * User Context
 * Global state management for user information
 */

import { STORAGE_KEYS } from '@/constants/storage';
import { StorageService } from '@/services/storage';
import NetInfo from '@react-native-community/netinfo';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

// ==================== INTERFACES ====================

export interface UserInfo {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    emergencyMessage?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserContextType {
    userInfo: UserInfo | null;
    loading: boolean;
    error: string | null;
    refreshUserInfo: () => Promise<void>;
    updateUserInfo: (info: Partial<UserInfo>) => Promise<void>;
    clearUserInfo: () => Promise<void>;
    clearError: () => void;
}

// ==================== CONTEXT ====================

const UserContext = createContext<UserContextType | undefined>(undefined);

// ==================== PROVIDER ====================

interface UserProviderProps {
    children: ReactNode;
    userId?: string;
}

export function UserProvider({ children, userId }: UserProviderProps) {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Load user info on mount
    useEffect(() => {
        loadUserInfo();
    }, [userId]);

    /**
     * Load user info from storage/API
     */
    const loadUserInfo = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // First try local storage (instant)
            const cachedUserInfo = await StorageService.getUserInfo();
            if (cachedUserInfo) {
                setUserInfo(cachedUserInfo);
                console.log('👤 Loaded user info from cache');
            }

            // Then try API if online and userId available
            const netState = await NetInfo.fetch();
            if (netState.isConnected && userId) {
                try {
                    const env = process.env.NODE_ENV;
                    const apiUrl = env === 'production' ? process.env.EXPO_PUBLIC_API_URL : '';

                    if (apiUrl) {
                        const response = await fetch(`${apiUrl}/api/user-info`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        });

                        if (response.ok) {
                            const data = await response.json();
                            if (data.userInfo) {
                                setUserInfo(data.userInfo);
                                await StorageService.setUserInfo(data.userInfo);
                                console.log('👤 Loaded user info from API');
                            }
                        }
                    }
                } catch (apiError) {
                    console.error('API fetch failed, using cache:', apiError);
                }
            }
        } catch (err) {
            console.error('Failed to load user info:', err);
            setError('Failed to load user information');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    /**
     * Refresh user info from API
     */
    const refreshUserInfo = useCallback(async () => {
        await loadUserInfo();
    }, [loadUserInfo]);

    /**
     * Update user info
     */
    const updateUserInfo = useCallback(
        async (updates: Partial<UserInfo>): Promise<void> => {
            try {
                setError(null);

                if (!userInfo) {
                    throw new Error('No user info to update');
                }

                // Update local state immediately (optimistic update)
                const updatedUserInfo: UserInfo = {
                    ...userInfo,
                    ...updates,
                    updatedAt: new Date(),
                };
                setUserInfo(updatedUserInfo);
                await StorageService.setUserInfo(updatedUserInfo);

                // Try to sync to API
                const netState = await NetInfo.fetch();
                if (netState.isConnected && userId) {
                    try {
                        const env = process.env.NODE_ENV;
                        const apiUrl = env === 'production' ? process.env.EXPO_PUBLIC_API_URL : '';

                        if (apiUrl) {
                            const response = await fetch(`${apiUrl}/api/user-info`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(updates),
                            });

                            if (!response.ok) {
                                console.error('API update failed');
                            } else {
                                console.log('✅ User info updated in API');
                            }
                        }
                    } catch (apiError) {
                        console.error('API update failed, queued for sync:', apiError);
                        // TODO: Add to sync queue
                    }
                }
            } catch (err) {
                console.error('Failed to update user info:', err);
                setError('Failed to update user information');
                throw err;
            }
        },
        [userInfo, userId]
    );

    /**
     * Clear user info (logout)
     */
    const clearUserInfo = useCallback(async () => {
        try {
            setUserInfo(null);
            await StorageService.delete(STORAGE_KEYS.USER_INFO);
            console.log('🗑️ User info cleared');
        } catch (err) {
            console.error('Failed to clear user info:', err);
            throw err;
        }
    }, []);

    /**
     * Clear error message
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: UserContextType = {
        userInfo,
        loading,
        error,
        refreshUserInfo,
        updateUserInfo,
        clearUserInfo,
        clearError,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// ==================== HOOK ====================

export function useUser(): UserContextType {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within UserProvider');
    }
    return context;
}

export default UserContext;
