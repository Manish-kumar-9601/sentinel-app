/**
 * Centralized Storage Service
 * 
 * Single source of truth for all app storage operations.
 * This service provides type-safe, centralized access to AsyncStorage and SecureStore.
 * 
 * Usage:
 *   import { StorageService, STORAGE_KEYS } from '@/services/StorageService';
 *   
 *   // Get auth token
 *   const token = await StorageService.getAuthToken();
 *   
 *   // Set emergency contacts
 *   await StorageService.setEmergencyContacts(contacts);
 * 
 * @module StorageService
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

// ==================== STORAGE KEYS ====================
/**
 * All storage keys used in the application.
 * NEVER use magic strings - always import from STORAGE_KEYS.
 */
export const STORAGE_KEYS = {
    // Authentication (SecureStore - Encrypted)
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',

    // User Preferences (AsyncStorage)
    GUEST_USER: 'guest_user',
    LANGUAGE: 'user_language',
    THEME_MODE: '@theme_mode',
    API_KEY: '@api_key',

    // Emergency Contacts (AsyncStorage)
    EMERGENCY_CONTACTS: 'emergency_contacts',
    EMERGENCY_CONTACTS_BACKUP: 'emergency_contacts_backup', // Backup key
    EMERGENCY_CONTACTS_TIMESTAMP: 'emergency_contacts_timestamp', // Last save time

    // Fake Call Settings (AsyncStorage)
    FAKE_CALLER_NAME: 'fake_caller_name',
    FAKE_CALLER_NUMBER: 'fake_caller_number',
    FAKE_CALL_RINGTONE: 'fake_call_ringtone_uri',

    // Sync Manager (AsyncStorage) - Already centralized in syncManager.ts
    SYNC: {
        USER_INFO: 'sync_user_info_v3',
        CONTACTS: 'sync_contacts_v3',
        LOCATION: 'sync_location_v3',
        MEDICAL_INFO: 'sync_medical_info_v3',
        QUEUE: 'sync_queue_v3',
        LAST_SYNC: 'sync_last_sync_v3',
        STATE: 'sync_state_v3',
    },

    // Legacy Keys (For Migration Only)
    LEGACY: {
        USER_INFO_CACHE: 'user_info_cache',
    },
} as const;

// ==================== TYPE DEFINITIONS ====================

export interface User {
    id: string;
    name: string;
    email: string;
}

export interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
}

export interface FakeCallerSettings {
    name: string;
    number: string;
    ringtoneUri?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type LanguageCode = 'en' | 'hi' | 'gu' | 'mr' | 'kn' | 'raj';

// ==================== STORAGE SERVICE ====================

class StorageServiceClass {
    // ==================== AUTHENTICATION (SecureStore) ====================

    /**
     * Get the authentication token from secure storage
     * @returns The auth token or null if not found
     */
    async getAuthToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        } catch (error) {
            console.error('❌ [StorageService] Failed to get auth token:', error);
            return null;
        }
    }

    /**
     * Store the authentication token securely
     * @param token - The JWT token to store
     */
    async setAuthToken(token: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
            console.log('✅ [StorageService] Auth token stored');
        } catch (error) {
            console.error('❌ [StorageService] Failed to set auth token:', error);
            throw error;
        }
    }

    /**
     * Clear the authentication token from secure storage
     */
    async clearAuthToken(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
            console.log('✅ [StorageService] Auth token cleared');
        } catch (error) {
            console.error('❌ [StorageService] Failed to clear auth token:', error);
            throw error;
        }
    }

    /**
     * Get user data from secure storage
     * @returns User object or null if not found
     */
    async getUserData(): Promise<User | null> {
        try {
            const data = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
            if (!data) return null;
            return JSON.parse(data) as User;
        } catch (error) {
            console.error('❌ [StorageService] Failed to get user data:', error);
            return null;
        }
    }

    /**
     * Store user data securely
     * @param user - The user object to store
     */
    async setUserData(user: User): Promise<void> {
        try {
            await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
            console.log('✅ [StorageService] User data stored');
        } catch (error) {
            console.error('❌ [StorageService] Failed to set user data:', error);
            throw error;
        }
    }

    /**
     * Clear user data from secure storage
     */
    async clearUserData(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
            console.log('✅ [StorageService] User data cleared');
        } catch (error) {
            console.error('❌ [StorageService] Failed to clear user data:', error);
            throw error;
        }
    }

    /**
     * Clear all authentication data (token + user data)
     */
    async clearAuthData(): Promise<void> {
        await Promise.all([
            this.clearAuthToken(),
            this.clearUserData(),
        ]);
    }

    // ==================== USER PREFERENCES (AsyncStorage) ====================

    /**
     * Check if user is in guest mode
     * @returns true if guest mode is enabled
     */
    async getGuestMode(): Promise<boolean> {
        try {
            const value = await AsyncStorage.getItem(STORAGE_KEYS.GUEST_USER);
            return value === 'true';
        } catch (error) {
            console.error('❌ [StorageService] Failed to get guest mode:', error);
            return false;
        }
    }

    /**
     * Set guest mode
     * @param isGuest - Whether guest mode should be enabled
     */
    async setGuestMode(isGuest: boolean): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.GUEST_USER, isGuest ? 'true' : 'false');
            console.log(`✅ [StorageService] Guest mode set to: ${isGuest}`);
        } catch (error) {
            console.error('❌ [StorageService] Failed to set guest mode:', error);
            throw error;
        }
    }

    /**
     * Get the user's language preference
     * @returns Language code or null if not set
     */
    async getLanguage(): Promise<LanguageCode | null> {
        try {
            const value = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
            return value as LanguageCode | null;
        } catch (error) {
            console.error('❌ [StorageService] Failed to get language:', error);
            return null;
        }
    }

    /**
     * Set the user's language preference
     * @param lang - The language code to set
     */
    async setLanguage(lang: LanguageCode): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
            console.log(`✅ [StorageService] Language set to: ${lang}`);
        } catch (error) {
            console.error('❌ [StorageService] Failed to set language:', error);
            throw error;
        }
    }

    /**
     * Get the user's theme preference
     * @returns Theme mode ('light', 'dark', or 'system')
     */
    async getThemeMode(): Promise<ThemeMode> {
        try {
            const value = await AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE);
            if (!value) return 'system'; // Default
            return value as ThemeMode;
        } catch (error) {
            console.error('❌ [StorageService] Failed to get theme mode:', error);
            return 'system';
        }
    }

    /**
     * Set the user's theme preference
     * @param mode - The theme mode to set
     */
    async setThemeMode(mode: ThemeMode): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
            console.log(`✅ [StorageService] Theme mode set to: ${mode}`);
        } catch (error) {
            console.error('❌ [StorageService] Failed to set theme mode:', error);
            throw error;
        }
    }

    /**
     * Get the stored API key
     * @returns API key or null if not set
     */
    async getApiKey(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);
        } catch (error) {
            console.error('❌ [StorageService] Failed to get API key:', error);
            return null;
        }
    }

    /**
     * Store an API key
     * @param key - The API key to store
     */
    async setApiKey(key: string): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, key);
            console.log('✅ [StorageService] API key stored');
        } catch (error) {
            console.error('❌ [StorageService] Failed to set API key:', error);
            throw error;
        }
    }

    /**
     * Clear the stored API key
     */
    async clearApiKey(): Promise<void> {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.API_KEY);
            console.log('✅ [StorageService] API key cleared');
        } catch (error) {
            console.error('❌ [StorageService] Failed to clear API key:', error);
            throw error;
        }
    }

    // ==================== EMERGENCY CONTACTS ====================

    /**
     * Get all emergency contacts
     * @returns Array of emergency contacts
     */
    async getEmergencyContacts(): Promise<EmergencyContact[]> {
        try {
            console.log('🔍 [StorageService] Reading emergency contacts from AsyncStorage...');
            console.log('🔑 [StorageService] Using key:', STORAGE_KEYS.EMERGENCY_CONTACTS);

            // Try primary storage first
            let data = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
            console.log('📦 [StorageService] Primary storage raw data:', data);

            // If primary is empty, try backup storage
            if (!data) {
                console.log('⚠️ [StorageService] Primary storage empty, trying backup...');
                data = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS_BACKUP);
                console.log('📦 [StorageService] Backup storage raw data:', data);

                // If backup has data, restore it to primary
                if (data) {
                    console.log('🔄 [StorageService] Restoring from backup to primary storage...');
                    await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACTS, data);
                }
            }

            // If both AsyncStorage sources are empty, try file system
            if (!data) {
                console.log('⚠️ [StorageService] AsyncStorage empty, trying file system backup...');
                try {
                    const fileUri = `${FileSystem.documentDirectory}emergency_contacts.json`;
                    const fileInfo = await FileSystem.getInfoAsync(fileUri);

                    if (fileInfo.exists) {
                        data = await FileSystem.readAsStringAsync(fileUri);
                        console.log('📁 [StorageService] Recovered from file system:', data);

                        // Restore to AsyncStorage
                        if (data) {
                            await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACTS, data);
                            await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACTS_BACKUP, data);
                            console.log('🔄 [StorageService] Restored to AsyncStorage from file');
                        }
                    }
                } catch (fileError) {
                    console.warn('⚠️ [StorageService] File system recovery failed:', fileError);
                }
            }

            if (!data) {
                console.log('⚠️ [StorageService] No data found in any storage - returning empty array');
                return [];
            }

            const parsed = JSON.parse(data) as EmergencyContact[];
            console.log('✅ [StorageService] Successfully parsed', parsed.length, 'contacts');

            // Log timestamp of last save if available
            const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS_TIMESTAMP);
            if (timestamp) {
                console.log('🕐 [StorageService] Last saved:', new Date(timestamp).toLocaleString());
            }

            return parsed;
        } catch (error) {
            console.error('❌ [StorageService] Failed to get emergency contacts:', error);

            // Try backup as last resort
            try {
                const backup = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS_BACKUP);
                if (backup) {
                    console.log('🆘 [StorageService] Using backup after error');
                    return JSON.parse(backup) as EmergencyContact[];
                }
            } catch (backupError) {
                console.error('❌ [StorageService] Backup also failed:', backupError);
            }

            return [];
        }
    }

    /**
     * Store emergency contacts
     * @param contacts - Array of emergency contacts to store
     */
    async setEmergencyContacts(contacts: EmergencyContact[]): Promise<void> {
        try {
            console.log('💾 [StorageService] Storing emergency contacts to AsyncStorage...');
            console.log('🔑 [StorageService] Using key:', STORAGE_KEYS.EMERGENCY_CONTACTS);
            console.log('📋 [StorageService] Data to store:', JSON.stringify(contacts, null, 2));

            const stringified = JSON.stringify(contacts);
            const timestamp = new Date().toISOString();

            // Write to primary storage
            await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACTS, stringified);
            console.log('✅ [StorageService] Written to primary storage');

            // Write to backup storage (redundancy)
            await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACTS_BACKUP, stringified);
            console.log('✅ [StorageService] Written to backup storage');

            // Save timestamp
            await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACTS_TIMESTAMP, timestamp);
            console.log('🕐 [StorageService] Timestamp saved:', timestamp);

            // Also save to file system as additional backup
            try {
                const fileUri = `${FileSystem.documentDirectory}emergency_contacts.json`;
                await FileSystem.writeAsStringAsync(fileUri, stringified);
                console.log('📁 [StorageService] Also saved to file:', fileUri);
            } catch (fileError) {
                console.warn('⚠️ [StorageService] File backup failed (non-critical):', fileError);
            }

            // Verify both writes were successful
            const primaryVerify = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
            const backupVerify = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS_BACKUP);

            if (!primaryVerify && !backupVerify) {
                throw new Error('Both primary and backup storage writes failed!');
            }

            if (!primaryVerify) {
                console.warn('⚠️ [StorageService] Primary storage verification failed, but backup succeeded');
            }

            if (!backupVerify) {
                console.warn('⚠️ [StorageService] Backup storage verification failed, but primary succeeded');
            }

            console.log('✅ [StorageService] Stored and verified', contacts.length, 'emergency contacts');
            console.log('🔍 [StorageService] Primary:', primaryVerify ? `${primaryVerify.length} chars` : 'null');
            console.log('🔍 [StorageService] Backup:', backupVerify ? `${backupVerify.length} chars` : 'null');
        } catch (error) {
            console.error('❌ [StorageService] Failed to set emergency contacts:', error);
            throw error;
        }
    }

    /**
     * Clear all emergency contacts
     */
    async clearEmergencyContacts(): Promise<void> {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
            console.log('✅ [StorageService] Emergency contacts cleared');
        } catch (error) {
            console.error('❌ [StorageService] Failed to clear emergency contacts:', error);
            throw error;
        }
    }

    // ==================== FAKE CALL SETTINGS ====================

    /**
     * Get fake caller settings
     * @returns Fake caller settings object
     */
    async getFakeCallerSettings(): Promise<FakeCallerSettings> {
        try {
            const [name, number, ringtoneUri] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.FAKE_CALLER_NAME),
                AsyncStorage.getItem(STORAGE_KEYS.FAKE_CALLER_NUMBER),
                AsyncStorage.getItem(STORAGE_KEYS.FAKE_CALL_RINGTONE),
            ]);

            return {
                name: name || 'Mom',
                number: number || '+1234567890',
                ringtoneUri: ringtoneUri || undefined,
            };
        } catch (error) {
            console.error('❌ [StorageService] Failed to get fake caller settings:', error);
            return {
                name: 'Mom',
                number: '+1234567890',
            };
        }
    }

    /**
     * Update fake caller settings (partial update)
     * @param settings - Partial settings to update
     */
    async setFakeCallerSettings(settings: Partial<FakeCallerSettings>): Promise<void> {
        try {
            const promises: Promise<void>[] = [];

            if (settings.name !== undefined) {
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.FAKE_CALLER_NAME, settings.name));
            }
            if (settings.number !== undefined) {
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.FAKE_CALLER_NUMBER, settings.number));
            }
            if (settings.ringtoneUri !== undefined) {
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.FAKE_CALL_RINGTONE, settings.ringtoneUri));
            }

            await Promise.all(promises);
            console.log('✅ [StorageService] Fake caller settings updated');
        } catch (error) {
            console.error('❌ [StorageService] Failed to set fake caller settings:', error);
            throw error;
        }
    }

    /**
     * Get fake caller name
     * @returns Fake caller name
     */
    async getFakeCallerName(): Promise<string> {
        try {
            const name = await AsyncStorage.getItem(STORAGE_KEYS.FAKE_CALLER_NAME);
            return name || 'Mom';
        } catch (error) {
            console.error('❌ [StorageService] Failed to get fake caller name:', error);
            return 'Mom';
        }
    }

    /**
     * Get fake caller number
     * @returns Fake caller phone number
     */
    async getFakeCallerNumber(): Promise<string> {
        try {
            const number = await AsyncStorage.getItem(STORAGE_KEYS.FAKE_CALLER_NUMBER);
            return number || '+1234567890';
        } catch (error) {
            console.error('❌ [StorageService] Failed to get fake caller number:', error);
            return '+1234567890';
        }
    }

    /**
     * Get fake call ringtone URI
     * @returns Ringtone URI or null
     */
    async getFakeCallRingtone(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.FAKE_CALL_RINGTONE);
        } catch (error) {
            console.error('❌ [StorageService] Failed to get fake call ringtone:', error);
            return null;
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Clear all app data (CAUTION: This will log the user out and reset all preferences)
     */
    async clearAllData(): Promise<void> {
        try {
            console.log('⚠️ [StorageService] Clearing ALL app data...');

            // Clear AsyncStorage
            await AsyncStorage.clear();

            // Clear SecureStore
            await this.clearAuthData();

            console.log('✅ [StorageService] All data cleared');
        } catch (error) {
            console.error('❌ [StorageService] Failed to clear all data:', error);
            throw error;
        }
    }

    /**
     * Migrate old storage keys to new format (if needed)
     * This should be run once on app startup after update
     */
    async migrateOldKeys(): Promise<void> {
        try {
            console.log('🔄 [StorageService] Checking for legacy keys...');

            // Check for old user_info_cache key
            const oldUserInfo = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY.USER_INFO_CACHE);
            if (oldUserInfo) {
                console.log('🔄 [StorageService] Found legacy user_info_cache, migrating...');
                // Migration logic would go here if needed
                // For now, just remove the old key
                await AsyncStorage.removeItem(STORAGE_KEYS.LEGACY.USER_INFO_CACHE);
                console.log('✅ [StorageService] Legacy key migrated');
            }

            console.log('✅ [StorageService] Migration check complete');
        } catch (error) {
            console.error('❌ [StorageService] Migration failed:', error);
            // Don't throw - migration failures shouldn't crash the app
        }
    }

    /**
     * Get all stored keys (for debugging)
     * @returns Array of all AsyncStorage keys
     */
    async getAllKeys(): Promise<readonly string[]> {
        try {
            return await AsyncStorage.getAllKeys();
        } catch (error) {
            console.error('❌ [StorageService] Failed to get all keys:', error);
            return [];
        }
    }

    /**
     * Get storage info (for debugging)
     * @returns Object with storage statistics
     */
    async getStorageInfo(): Promise<{ keys: readonly string[]; count: number }> {
        try {
            const keys = await this.getAllKeys();
            return {
                keys,
                count: keys.length,
            };
        } catch (error) {
            console.error('❌ [StorageService] Failed to get storage info:', error);
            return { keys: [], count: 0 };
        }
    }
}

// ==================== SINGLETON EXPORT ====================

/**
 * Singleton instance of StorageService
 * Use this throughout the app for all storage operations
 */
export const StorageService = new StorageServiceClass();

/**
 * Default export for convenience
 */
export default StorageService;
