/**
 * Authentication Store
 * 
 * Handles user authentication state and token management.
 * Separated from global store for better performance and maintainability.
 * 
 * @module AuthStore
 */

import { StorageService, type User } from '@/services/StorageService';
import { create } from 'zustand';

// ==================== TYPES ====================

export interface AuthState {
    // State
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    setAuth: (user: User | null, token: string | null) => Promise<void>;
    clearAuth: () => Promise<void>;
    loadAuthFromStorage: () => Promise<void>;
    updateUser: (updates: Partial<User>) => Promise<void>;
}

// ==================== STORE IMPLEMENTATION ====================

export const useAuthStore = create<AuthState>((set, get) => ({
    // ==================== INITIAL STATE ====================
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    // ==================== ACTIONS ====================

    /**
     * Set authentication state and persist to storage
     */
    setAuth: async (user, token) => {
        try {
            set({ isLoading: true, error: null });

            // Update state immediately (optimistic)
            set({
                user,
                token,
                isAuthenticated: !!(user && token),
            });

            // Persist to secure storage
            if (token) {
                await StorageService.setAuthToken(token);
            } else {
                await StorageService.clearAuthToken();
            }

            if (user) {
                await StorageService.setUserData(user);
            } else {
                await StorageService.clearUserData();
            }

            set({ isLoading: false });
            console.log('✅ [AuthStore] Auth updated');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to set auth';
            set({ isLoading: false, error: errorMessage });
            console.error('❌ [AuthStore] Failed to set auth:', error);
            throw error;
        }
    },

    /**
     * Clear authentication state and storage
     */
    clearAuth: async () => {
        try {
            set({ isLoading: true, error: null });

            // Clear state
            set({
                user: null,
                token: null,
                isAuthenticated: false,
            });

            // Clear storage
            await StorageService.clearAuthData();

            set({ isLoading: false });
            console.log('✅ [AuthStore] Auth cleared');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to clear auth';
            set({ isLoading: false, error: errorMessage });
            console.error('❌ [AuthStore] Failed to clear auth:', error);
            throw error;
        }
    },

    /**
     * Load authentication state from storage on app start
     */
    loadAuthFromStorage: async () => {
        try {
            set({ isLoading: true, error: null });

            const [token, userData] = await Promise.all([
                StorageService.getAuthToken(),
                StorageService.getUserData(),
            ]);

            if (token && userData) {
                set({
                    user: userData,
                    token,
                    isAuthenticated: true,
                });
                console.log('✅ [AuthStore] Auth loaded from storage');
            } else {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                });
                console.log('ℹ️ [AuthStore] No auth found in storage');
            }

            set({ isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load auth';
            set({
                isLoading: false,
                error: errorMessage,
                user: null,
                token: null,
                isAuthenticated: false,
            });
            console.error('❌ [AuthStore] Failed to load auth from storage:', error);
        }
    },

    /**
     * Update user data (without changing token)
     */
    updateUser: async (updates) => {
        try {
            const { user } = get();
            if (!user) {
                throw new Error('No user to update');
            }

            const updatedUser = { ...user, ...updates };
            set({ user: updatedUser });

            await StorageService.setUserData(updatedUser);

            console.log('✅ [AuthStore] User updated');
        } catch (error) {
            console.error('❌ [AuthStore] Failed to update user:', error);
            throw error;
        }
    },
}));
