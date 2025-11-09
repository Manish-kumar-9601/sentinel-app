/**
 * Unified Storage Service
 * Centralized interface for AsyncStorage and SecureStore operations
 */

import { CACHE_EXPIRY, STORAGE_KEYS, StorageKey } from '@/constants/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ==================== INTERFACES ====================

interface CachedData<T> {
    data: T;
    timestamp: number;
    expiresAt?: number;
}

interface StorageStats {
    totalKeys: number;
    estimatedSize: number;
    oldestItem: { key: string; timestamp: number } | null;
    newestItem: { key: string; timestamp: number } | null;
}

// ==================== MAIN STORAGE SERVICE ====================

export class StorageService {
    private static readonly LOG_PREFIX = '[StorageService]';

    // ==================== SECURE STORAGE METHODS ====================

    /**
     * Store sensitive data in SecureStore (encrypted)
     */
    static async setSecure(key: string, value: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(key, value);
            console.log(`${this.LOG_PREFIX} ✅ Secure stored: ${key}`);
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Secure store failed:`, error);
            throw error;
        }
    }

    /**
     * Retrieve sensitive data from SecureStore
     */
    static async getSecure(key: string): Promise<string | null> {
        try {
            const value = await SecureStore.getItemAsync(key);
            console.log(`${this.LOG_PREFIX} 📖 Secure retrieved: ${key}`);
            return value;
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Secure get failed:`, error);
            return null;
        }
    }

    /**
     * Delete sensitive data from SecureStore
     */
    static async deleteSecure(key: string): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(key);
            console.log(`${this.LOG_PREFIX} 🗑️ Secure deleted: ${key}`);
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Secure delete failed:`, error);
            throw error;
        }
    }

    // ==================== REGULAR STORAGE METHODS ====================

    /**
     * Store data in AsyncStorage (JSON serialized)
     */
    static async set<T>(key: StorageKey | string, value: T): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            await AsyncStorage.setItem(key, serialized);
            console.log(`${this.LOG_PREFIX} ✅ Stored: ${key}`);
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Store failed for ${key}:`, error);
            throw error;
        }
    }

    /**
     * Retrieve data from AsyncStorage
     */
    static async get<T>(key: StorageKey | string): Promise<T | null> {
        try {
            const serialized = await AsyncStorage.getItem(key);
            if (serialized === null) {
                return null;
            }
            const parsed = JSON.parse(serialized) as T;
            console.log(`${this.LOG_PREFIX} 📖 Retrieved: ${key}`);
            return parsed;
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Get failed for ${key}:`, error);
            return null;
        }
    }

    /**
     * Delete data from AsyncStorage
     */
    static async delete(key: StorageKey | string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
            console.log(`${this.LOG_PREFIX} 🗑️ Deleted: ${key}`);
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Delete failed for ${key}:`, error);
            throw error;
        }
    }

    // ==================== BATCH OPERATIONS ====================

    /**
     * Store multiple items at once (more efficient)
     */
    static async setMultiple(items: Array<[StorageKey | string, any]>): Promise<void> {
        try {
            const serialized = items.map(([key, value]) => [key, JSON.stringify(value)]);
            await AsyncStorage.multiSet(serialized as [string, string][]);
            console.log(`${this.LOG_PREFIX} ✅ Stored ${items.length} items`);
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Multi-set failed:`, error);
            throw error;
        }
    }

    /**
     * Retrieve multiple items at once
     */
    static async getMultiple<T = any>(keys: (StorageKey | string)[]): Promise<Record<string, T>> {
        try {
            const results = await AsyncStorage.multiGet(keys);
            const parsed: Record<string, T> = {};

            for (const [key, value] of results) {
                if (value !== null) {
                    parsed[key] = JSON.parse(value);
                }
            }

            console.log(`${this.LOG_PREFIX} 📖 Retrieved ${Object.keys(parsed).length}/${keys.length} items`);
            return parsed;
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Multi-get failed:`, error);
            return {};
        }
    }

    /**
     * Delete multiple items at once
     */
    static async deleteMultiple(keys: (StorageKey | string)[]): Promise<void> {
        try {
            await AsyncStorage.multiRemove(keys);
            console.log(`${this.LOG_PREFIX} 🗑️ Deleted ${keys.length} items`);
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Multi-delete failed:`, error);
            throw error;
        }
    }

    // ==================== CACHE WITH EXPIRY ====================

    /**
     * Store data with automatic expiry
     */
    static async setWithExpiry<T>(
        key: StorageKey | string,
        value: T,
        expiryMs?: number
    ): Promise<void> {
        try {
            const cached: CachedData<T> = {
                data: value,
                timestamp: Date.now(),
                expiresAt: expiryMs ? Date.now() + expiryMs : undefined,
            };
            await this.set(key, cached);
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Set with expiry failed:`, error);
            throw error;
        }
    }

    /**
     * Retrieve data, checking expiry
     */
    static async getWithExpiry<T>(key: StorageKey | string): Promise<T | null> {
        try {
            const cached = await this.get<CachedData<T>>(key);

            if (!cached) {
                return null;
            }

            // Check if expired
            if (cached.expiresAt && Date.now() > cached.expiresAt) {
                console.log(`${this.LOG_PREFIX} ⏰ Expired: ${key}`);
                await this.delete(key);
                return null;
            }

            return cached.data;
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Get with expiry failed:`, error);
            return null;
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Check if key exists
     */
    static async has(key: StorageKey | string): Promise<boolean> {
        try {
            const value = await AsyncStorage.getItem(key);
            return value !== null;
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Has check failed:`, error);
            return false;
        }
    }

    /**
     * Get all storage keys
     */
    static async getAllKeys(): Promise<readonly string[]> {
        try {
            return await AsyncStorage.getAllKeys();
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Get all keys failed:`, error);
            return [];
        }
    }

    /**
     * Clear all storage (use with caution!)
     */
    static async clearAll(): Promise<void> {
        try {
            await AsyncStorage.clear();
            console.log(`${this.LOG_PREFIX} 🗑️ Cleared all storage`);
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Clear all failed:`, error);
            throw error;
        }
    }

    /**
     * Get storage statistics
     */
    static async getStats(): Promise<StorageStats> {
        try {
            const keys = await this.getAllKeys();
            let oldestItem: StorageStats['oldestItem'] = null;
            let newestItem: StorageStats['newestItem'] = null;
            let estimatedSize = 0;

            for (const key of keys) {
                const value = await AsyncStorage.getItem(key);
                if (value) {
                    estimatedSize += value.length;

                    try {
                        const parsed = JSON.parse(value);
                        if (parsed.timestamp) {
                            if (!oldestItem || parsed.timestamp < oldestItem.timestamp) {
                                oldestItem = { key, timestamp: parsed.timestamp };
                            }
                            if (!newestItem || parsed.timestamp > newestItem.timestamp) {
                                newestItem = { key, timestamp: parsed.timestamp };
                            }
                        }
                    } catch {
                        // Not a cached item
                    }
                }
            }

            return {
                totalKeys: keys.length,
                estimatedSize,
                oldestItem,
                newestItem,
            };
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Get stats failed:`, error);
            return {
                totalKeys: 0,
                estimatedSize: 0,
                oldestItem: null,
                newestItem: null,
            };
        }
    }

    /**
     * Clear expired cache entries
     */
    static async clearExpiredCache(): Promise<number> {
        try {
            const keys = await this.getAllKeys();
            let clearedCount = 0;

            for (const key of keys) {
                const value = await AsyncStorage.getItem(key);
                if (value) {
                    try {
                        const parsed = JSON.parse(value);
                        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
                            await this.delete(key);
                            clearedCount++;
                        }
                    } catch {
                        // Not a cached item
                    }
                }
            }

            console.log(`${this.LOG_PREFIX} 🧹 Cleared ${clearedCount} expired items`);
            return clearedCount;
        } catch (error) {
            console.error(`${this.LOG_PREFIX} ❌ Clear expired cache failed:`, error);
            return 0;
        }
    }

    // ==================== CONVENIENCE METHODS ====================

    /**
     * Store emergency contacts
     */
    static async setEmergencyContacts(contacts: any[]): Promise<void> {
        await this.setWithExpiry(STORAGE_KEYS.EMERGENCY_CONTACTS, contacts, CACHE_EXPIRY.CONTACTS);
    }

    /**
     * Get emergency contacts
     */
    static async getEmergencyContacts(): Promise<any[] | null> {
        return await this.getWithExpiry(STORAGE_KEYS.EMERGENCY_CONTACTS);
    }

    /**
     * Store user info
     */
    static async setUserInfo(userInfo: any): Promise<void> {
        await this.setWithExpiry(STORAGE_KEYS.USER_INFO, userInfo, CACHE_EXPIRY.USER_INFO);
    }

    /**
     * Get user info
     */
    static async getUserInfo(): Promise<any | null> {
        return await this.getWithExpiry(STORAGE_KEYS.USER_INFO);
    }

    /**
     * Store location history
     */
    static async setLocationHistory(history: any[]): Promise<void> {
        await this.set(STORAGE_KEYS.LOCATION_HISTORY, history);
    }

    /**
     * Get location history
     */
    static async getLocationHistory(): Promise<any[] | null> {
        return await this.get(STORAGE_KEYS.LOCATION_HISTORY);
    }

    /**
     * Store evidence
     */
    static async setEvidence(evidence: any[]): Promise<void> {
        await this.set(STORAGE_KEYS.EVIDENCE, evidence);
    }

    /**
     * Get evidence
     */
    static async getEvidence(): Promise<any[] | null> {
        return await this.get(STORAGE_KEYS.EVIDENCE);
    }
}

export default StorageService;
