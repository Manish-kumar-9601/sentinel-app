import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys
export const CACHE_KEYS = {
    USER_INFO: 'user_info_cache',
    EMERGENCY_CONTACTS: 'emergency_contacts',
    CONTACTS_CACHE: 'emergency_contacts_cache',
    LAST_SYNC: 'contacts_last_sync',
    USER_LAST_SYNC: 'user_info_last_sync'
};

// Cache expiry times
export const CACHE_EXPIRY = {
    USER_INFO: 24* 60 * 1000, // 5 minutes
    CONTACTS: 64 * 60 * 1000, // 30 minutes
    OFFLINE_FALLBACK: 36 * 60 * 60 * 1000 // 24 hours for offline fallback
};

export interface CacheMetadata {
    timestamp: string;
    version: string;
}

export interface CachedUserData {
    userInfo: any;
    medicalInfo: any;
    emergencyContacts: any[];
    lastUpdated: string;
    cacheTimestamp: string;
}

export interface CachedContacts {
    contacts: any[];
    lastUpdated: string;
    cacheTimestamp: string;
}

/**
 * Check if cached data is still valid
 */
export const isCacheValid = (cacheTimestamp: string, expiryMs: number): boolean => {
    try {
        const now = new Date().getTime();
        const cacheTime = new Date(cacheTimestamp).getTime();
        return (now - cacheTime) < expiryMs;
    } catch (error) {
        console.error('Error checking cache validity:', error);
        return false;
    }
};

/**
 * Save user data to cache
 */
export const saveUserDataToCache = async (data: any): Promise<boolean> => {
    try {
        const cacheData: CachedUserData = {
            ...data,
            cacheTimestamp: new Date().toISOString()
        };

        await AsyncStorage.setItem(CACHE_KEYS.USER_INFO, JSON.stringify(cacheData));

        // Also update the legacy contacts cache for backward compatibility
        if (data.emergencyContacts) {
            await AsyncStorage.setItem(CACHE_KEYS.EMERGENCY_CONTACTS, JSON.stringify(data.emergencyContacts));
        }

        console.log('User data saved to cache successfully');
        return true;
    } catch (error) {
        console.error('Failed to save user data to cache:', error);
        return false;
    }
};

/**
 * Load user data from cache
 */
export const loadUserDataFromCache = async (): Promise<CachedUserData | null> => {
    try {
        const cachedData = await AsyncStorage.getItem(CACHE_KEYS.USER_INFO);
        if (cachedData) {
            const parsed: CachedUserData = JSON.parse(cachedData);
            console.log('Loaded user data from cache:', parsed.cacheTimestamp);
            return parsed;
        }
    } catch (error) {
        console.error('Failed to load user data from cache:', error);
    }
    return null;
};

/**
 * Save contacts to cache
 */
export const saveContactsToCache = async (contacts: any[]): Promise<boolean> => {
    try {
        const cacheData: CachedContacts = {
            contacts,
            lastUpdated: new Date().toISOString(),
            cacheTimestamp: new Date().toISOString()
        };

        await AsyncStorage.setItem(CACHE_KEYS.CONTACTS_CACHE, JSON.stringify(cacheData));

        // Also save to legacy storage
        await AsyncStorage.setItem(CACHE_KEYS.EMERGENCY_CONTACTS, JSON.stringify(contacts));

        console.log('Contacts saved to cache successfully');
        return true;
    } catch (error) {
        console.error('Failed to save contacts to cache:', error);
        return false;
    }
};

/**
 * Load contacts from cache
 */
export const loadContactsFromCache = async (): Promise<CachedContacts | null> => {
    try {
        // Try new cache format first
        const cachedData = await AsyncStorage.getItem(CACHE_KEYS.CONTACTS_CACHE);
        if (cachedData) {
            const parsed: CachedContacts = JSON.parse(cachedData);
            console.log('Loaded contacts from new cache format');
            return parsed;
        }

        // Fallback to legacy format
        const legacyData = await AsyncStorage.getItem(CACHE_KEYS.EMERGENCY_CONTACTS);
        if (legacyData) {
            const contacts = JSON.parse(legacyData);
            console.log('Loaded contacts from legacy cache format');
            return {
                contacts,
                lastUpdated: new Date().toISOString(),
                cacheTimestamp: new Date(Date.now() - CACHE_EXPIRY.CONTACTS).toISOString() // Mark as expired
            };
        }
    } catch (error) {
        console.error('Failed to load contacts from cache:', error);
    }
    return null;
};

/**
 * Update sync timestamp
 */
export const updateSyncTimestamp = async (key: string): Promise<void> => {
    try {
        const timestamp = new Date().toISOString();
        await AsyncStorage.setItem(key, timestamp);
    } catch (error) {
        console.error('Failed to update sync timestamp:', error);
    }
};

/**
 * Get sync timestamp
 */
export const getSyncTimestamp = async (key: string): Promise<Date | null> => {
    try {
        const timestamp = await AsyncStorage.getItem(key);
        return timestamp ? new Date(timestamp) : null;
    } catch (error) {
        console.error('Failed to get sync timestamp:', error);
        return null;
    }
};

/**
 * Check if sync is needed based on interval
 */
export const isSyncNeeded = async (key: string, intervalMs: number): Promise<boolean> => {
    try {
        const lastSync = await getSyncTimestamp(key);
        if (!lastSync) {
            return true; // Never synced before
        }

        const timeSinceSync = Date.now() - lastSync.getTime();
        return timeSinceSync > intervalMs;
    } catch (error) {
        console.error('Error checking sync need:', error);
        return true; // Default to sync if error
    }
};

/**
 * Clear all cached data
 */
export const clearAllCache = async (): Promise<boolean> => {
    try {
        await Promise.all([
            AsyncStorage.removeItem(CACHE_KEYS.USER_INFO),
            AsyncStorage.removeItem(CACHE_KEYS.EMERGENCY_CONTACTS),
            AsyncStorage.removeItem(CACHE_KEYS.CONTACTS_CACHE),
            AsyncStorage.removeItem(CACHE_KEYS.LAST_SYNC),
            AsyncStorage.removeItem(CACHE_KEYS.USER_LAST_SYNC)
        ]);

        console.log('All cache cleared successfully');
        return true;
    } catch (error) {
        console.error('Failed to clear cache:', error);
        return false;
    }
};

/**
 * Get cache size for debugging
 */
export const getCacheInfo = async (): Promise<{ [key: string]: any }> => {
    try {
        const info: { [key: string]: any } = {};

        for (const [name, key] of Object.entries(CACHE_KEYS)) {
            const data = await AsyncStorage.getItem(key);
            if (data) {
                info[name] = {
                    size: data.length,
                    hasData: true,
                    preview: data.substring(0, 100) + '...'
                };
            } else {
                info[name] = { hasData: false };
            }
        }

        return info;
    } catch (error) {
        console.error('Failed to get cache info:', error);
        return {};
    }
};

/**
 * Merge contacts avoiding duplicates
 */
export const mergeContacts = (localContacts: any[], serverContacts: any[]): any[] => {
    const merged = [...serverContacts]; // Start with server contacts as source of truth

    // Add local contacts that don't exist on server
    localContacts.forEach(localContact => {
        const existsOnServer = serverContacts.some(
            serverContact => serverContact.id === localContact.id ||
                serverContact.phone === localContact.phone
        );

        if (!existsOnServer && localContact.name && localContact.phone) {
            merged.push({
                ...localContact,
                synced: false // Mark as needing sync
            });
        }
    });

    return merged;
};

/**
 * Generate unique ID for new items
 */
export const generateUniqueId = (prefix: string = 'item'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};