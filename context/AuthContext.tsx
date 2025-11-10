import type { User } from '@/services/StorageService';
import { StorageService } from '@/services/StorageService';
import Constants from 'expo-constants';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUserState] = useState<User | null>(null);
    const [token, setTokenState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastTokenVerification, setLastTokenVerification] = useState<number>(0);

    // Cache token verification for 24 hours
    const TOKEN_VERIFICATION_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

    // Load stored auth data on mount
    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            setIsLoading(true);
            const [storedToken, storedUser] = await Promise.all([
                StorageService.getAuthToken(),
                StorageService.getUserData()
            ]);

            if (storedToken && storedUser) {
                console.log('📦 Found stored auth data');

                // ✅ OPTIMIZATION: Check if we verified recently
                const now = Date.now();
                const needsVerification = (now - lastTokenVerification) > TOKEN_VERIFICATION_CACHE_MS;

                if (!needsVerification) {
                    console.log('✅ Using cached token verification (verified within 24h)');
                    setTokenState(storedToken);
                    setUserState(storedUser);
                    setIsLoading(false);
                    return;
                }

                // Verify token only if cache expired
                console.log('🔄 Token verification cache expired, verifying...');
                const isValid = await verifyToken(storedToken);

                if (isValid) {
                    setTokenState(storedToken);
                    setUserState(storedUser);
                    setLastTokenVerification(now);
                    console.log('✅ Session restored and verified');
                } else {
                    console.log('❌ Stored token invalid, clearing');
                    await clearStoredAuth();
                }
            } else {
                console.log('ℹ️ No stored auth data found');
            }
        } catch (error) {
            console.error('Failed to load stored auth:', error);
            await clearStoredAuth();
        } finally {
            setIsLoading(false);
        }
    };

    const verifyToken = async (tokenToVerify: string): Promise<boolean> => {
        try {
            const env = process.env.NODE_ENV
            console.log('Environment at Auth context:', env);
            const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';
            console.log("apiUrl at Auth context", apiUrl)
            if (!apiUrl && env === 'production') {
                return false
            }



            const response = await fetch(`${apiUrl}/api/auth/session`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenToVerify}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.isAuthenticated === true;
            }
            return false;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    };

    const setUser = async (newUser: User | null) => {
        setUserState(newUser);
        if (newUser) {
            await StorageService.setUserData(newUser);
        } else {
            await StorageService.clearUserData();
        }
    };

    const setToken = async (newToken: string | null) => {
        setTokenState(newToken);
        if (newToken) {
            await StorageService.setAuthToken(newToken);
        } else {
            await StorageService.clearAuthToken();
        }
    };

    const clearStoredAuth = async () => {
        await StorageService.clearAuthData();
        setUserState(null);
        setTokenState(null);
    };

    const login = async (email: string, password: string) => {
        try {
            const env = process.env.NODE_ENV
            console.log('Environment at Auth context:', env);
            const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';
            console.log("apiUrl at Auth context", apiUrl)
            if (!apiUrl && env === 'production') {
                return { success: false, error: 'API URL not configured' };
            }

            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.user && data.token) {
                await setToken(data.token);
                await setUser(data.user);
                console.log('✅ Login successful');
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error: any) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error occurred' };
        }
    };

    const register = async (name: string, email: string, password: string) => {
        try {
            const env = process.env.NODE_ENV
            console.log('Environment at Auth context:', env);
            const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';
            console.log("apiUrl at Auth context", apiUrl)
            if (!apiUrl && env === 'production') {
                return { success: false, error: 'API URL not configured' };
            }


            const response = await fetch(`${apiUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok && data.user && data.token) {
                await setToken(data.token);
                await setUser(data.user);
                console.log('✅ Registration successful');
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            return { success: false, error: 'Network error occurred' };
        }
    };

    const logout = async () => {
        try {
            const env = process.env.NODE_ENV
            console.log('Environment at Auth context:', env);
            const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';
            console.log("apiUrl at Auth context", apiUrl)

            if (token && apiUrl) {
                // Call logout endpoint
                await fetch(`${apiUrl}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Clear local storage regardless of API call success
            await clearStoredAuth();
            console.log('✅ Logged out');
        }
    };

    const contextValue = {
        user,
        token,
        isLoading,
        setUser,
        setToken,
        login,
        register,
        logout
    };

    console.log('AuthContext value:', { hasUser: !!user, hasToken: !!token, isLoading });

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}