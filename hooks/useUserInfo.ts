import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

interface UserInfo {
    name: string;
    email: string;
    phone: string;
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
    relationship: string;
    createdAt: string;
}

interface UserData {
    userInfo: UserInfo;
    medicalInfo: MedicalInfo;
    emergencyContacts: EmergencyContact[];
    lastUpdated: string;
}

export function useUserInfo() {
    const { token, user } = useAuth();
    const [data, setData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const fetchUserInfo = useCallback(async (showLoading = true) => {
        if (!user) {
            setLoading(false);
            setError('Not authenticated');
            return;
        }

        try {
            if (showLoading) setLoading(true);
            setError(null);

            console.log('🔄 Fetching user info...');

            // Get token from SecureStore
            const authToken = await SecureStore.getItemAsync(TOKEN_KEY);
            
            if (!authToken) {
                throw new Error('No authentication token found');
            }

            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl) {
                throw new Error('API URL not configured');
            }

            console.log('📤 Making request to:', `${apiUrl}/api/user-info`);
            console.log('🔑 Using auth token:', authToken.substring(0, 20) + '...');

            const response = await fetch(`${apiUrl}/api/user-info`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText };
                }
                
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const userData = await response.json();
            console.log('✅ User info loaded successfully');
            
            setData(userData);
            setLastSync(new Date());

        } catch (err: any) {
            console.error('❌ Failed to fetch user info:', err);
            setError(err.message || 'Failed to load user info');
        } finally {
            setLoading(false);
        }
    }, [user]);

    const saveUserInfo = async (updateData: Partial<UserData>) => {
        try {
            setLoading(true);
            setError(null);

            console.log('💾 Saving user info...');

            const authToken = await SecureStore.getItemAsync(TOKEN_KEY);
            
            if (!authToken) {
                throw new Error('No authentication token found');
            }

            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl) {
                throw new Error('API URL not configured');
            }

            const response = await fetch(`${apiUrl}/api/user-info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to save user info');
            }

            const result = await response.json();
            console.log('✅ User info saved successfully');

            // Refresh data after save
            await fetchUserInfo(false);

            return { success: true };
        } catch (err: any) {
            console.error('❌ Failed to save user info:', err);
            setError(err.message || 'Failed to save user info');
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const clearCache = () => {
        setData(null);
        setLastSync(null);
    };

    // Initial load
    useEffect(() => {
        if (user) {
            fetchUserInfo();
        } else {
            setLoading(false);
        }
    }, [user, fetchUserInfo]);

    return {
        data,
        loading,
        error,
        lastSync,
        refresh: fetchUserInfo,
        save: saveUserInfo,
        clearCache,
    };
}