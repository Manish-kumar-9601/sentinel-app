// utils/enhancedDataSync.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import React from 'react';

// ==================== CACHE KEYS ====================
export const CACHE_KEYS = {
    USER_INFO: 'user_info_cache_v2',
    EMERGENCY_CONTACTS: 'emergency_contacts_v2',
    LOCATION: 'last_known_location',
    SYNC_QUEUE: 'offline_sync_queue',
    LAST_SYNC: {
        USER_INFO: 'user_info_last_sync',
        CONTACTS: 'contacts_last_sync',
    }
};

// ==================== CACHE EXPIRY ====================
export const CACHE_EXPIRY = {
    USER_INFO: 5 * 60 * 1000, // 5 minutes
    CONTACTS: 30 * 60 * 1000, // 30 minutes
    LOCATION: 15 * 60 * 1000, // 15 minutes
    OFFLINE_FALLBACK: 24 * 60 * 60 * 1000 // 24 hours
};

// ==================== INTERFACES ====================
interface CachedData<T> {
    data: T;
    timestamp: string;
    version: string;
}

interface QueuedRequest {
    id: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    timestamp: number;
    retries: number;
}

interface SyncStatus {
    isOnline: boolean;
    isSyncing: boolean;
    lastSync: Date | null;
    pendingCount: number;
    errors: string[];
}

// ==================== CACHE MANAGER ====================
export class CacheManager {
    private static DATA_VERSION = '1.0';

    /**
     * Save data to cache with timestamp and version
     */
    static async set<T>(key: string, data: T): Promise<boolean> {
        try {
            const cached: CachedData<T> = {
                data,
                timestamp: new Date().toISOString(),
                version: this.DATA_VERSION
            };

            await AsyncStorage.setItem(key, JSON.stringify(cached));
            console.log(`✅ Cached data for key: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to cache data for ${key}:`, error);
            return false;
        }
    }

    /**
     * Get data from cache if valid
     */
    static async get<T>(key: string, maxAge?: number): Promise<T | null> {
        try {
            const stored = await AsyncStorage.getItem(key);
            if (!stored) {
                console.log(`ℹ️ No cached data for key: ${key}`);
                return null;
            }

            const cached: CachedData<T> = JSON.parse(stored);

            // Check version
            if (cached.version !== this.DATA_VERSION) {
                console.warn(`⚠️ Cache version mismatch for ${key}, invalidating`);
                await this.remove(key);
                return null;
            }

            // Check age if maxAge specified
            if (maxAge) {
                const age = Date.now() - new Date(cached.timestamp).getTime();
                if (age > maxAge) {
                    console.log(`⏰ Cache expired for ${key} (age: ${Math.round(age / 1000)}s)`);
                    return null;
                }
            }

            console.log(`✅ Retrieved cached data for ${key}`);
            return cached.data;
        } catch (error) {
            console.error(`❌ Failed to get cached data for ${key}:`, error);
            return null;
        }
    }

    /**
     * Remove data from cache
     */
    static async remove(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
            console.log(`🗑️ Removed cache for key: ${key}`);
        } catch (error) {
            console.error(`❌ Failed to remove cache for ${key}:`, error);
        }
    }

    /**
     * Clear all cache
     */
    static async clearAll(): Promise<void> {
        try {
            const keys: string[] = [];
            const collectKeys = (obj: any) => {
                for (const value of Object.values(obj)) {
                    if (typeof value === 'string') {
                        keys.push(value);
                    } else if (typeof value === 'object' && value !== null) {
                        collectKeys(value);
                    }
                }
            };
            collectKeys(CACHE_KEYS);
            await AsyncStorage.multiRemove(keys);
            console.log('🗑️ Cleared all cache');
        } catch (error) {
            console.error('❌ Failed to clear cache:', error);
        }
    }

    /**
     * Get cache info for debugging
     */
    static async getInfo(): Promise<Record<string, any>> {
        const info: Record<string, any> = {};

        for (const [name, key] of Object.entries(CACHE_KEYS)) {
            if (typeof key === 'string') {
                const data = await AsyncStorage.getItem(key);
                info[name] = {
                    exists: !!data,
                    size: data ? data.length : 0,
                    sizeKB: data ? Math.round(data.length / 1024) : 0
                };
            }
        }

        return info;
    }
}

// ==================== OFFLINE QUEUE MANAGER ====================
export class OfflineQueueManager {
    private static instance: OfflineQueueManager;
    private queue: QueuedRequest[] = [];
    private processing = false;

    private constructor() {
        this.loadQueue();
        this.setupNetworkListener();
    }

    static getInstance(): OfflineQueueManager {
        if (!this.instance) {
            this.instance = new OfflineQueueManager();
        }
        return this.instance;
    }

    /**
     * Load queue from storage
     */
    private async loadQueue(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem(CACHE_KEYS.SYNC_QUEUE);
            if (stored) {
                this.queue = JSON.parse(stored);
                console.log(`📥 Loaded ${this.queue.length} queued requests`);
            }
        } catch (error) {
            console.error('❌ Failed to load queue:', error);
        }
    }

    /**
     * Save queue to storage
     */
    private async saveQueue(): Promise<void> {
        try {
            await AsyncStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(this.queue));
        } catch (error) {
            console.error('❌ Failed to save queue:', error);
        }
    }

    /**
     * Setup network listener to process queue when online
     */
    private setupNetworkListener(): void {
        NetInfo.addEventListener(state => {
            console.log('📡 Network status changed:', state.isConnected ? 'ONLINE' : 'OFFLINE');

            if (state.isConnected && this.queue.length > 0 && !this.processing) {
                console.log('🔄 Network restored, processing queue...');
                this.processQueue();
            }
        });
    }

    /**
     * Add request to queue
     */
    async add(url: string, options: RequestInit): Promise<void> {
        const request: QueuedRequest = {
            id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url,
            method: options.method || 'GET',
            headers: (options.headers as Record<string, string>) || {},
            body: options.body as string,
            timestamp: Date.now(),
            retries: 0
        };

        this.queue.push(request);
        await this.saveQueue();

        console.log(`➕ Added request to queue: ${request.method} ${url}`);
        console.log(`📊 Queue size: ${this.queue.length}`);
    }

    /**
     * Process all queued requests
     */
    async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;
        console.log(`🔄 Processing ${this.queue.length} queued requests...`);

        const processed: string[] = [];
        const failed: QueuedRequest[] = [];

        for (const request of this.queue) {
            try {
                console.log(`⏳ Processing: ${request.method} ${request.url}`);

                const response = await fetch(request.url, {
                    method: request.method,
                    headers: request.headers,
                    body: request.body
                });

                if (response.ok) {
                    console.log(`✅ Request succeeded: ${request.id}`);
                    processed.push(request.id);
                } else {
                    console.warn(`⚠️ Request failed with status ${response.status}: ${request.id}`);
                    request.retries++;

                    if (request.retries < 3) {
                        failed.push(request);
                    } else {
                        console.error(`❌ Request exhausted retries: ${request.id}`);
                    }
                }
            } catch (error) {
                console.error(`❌ Request error: ${request.id}`, error);
                request.retries++;

                if (request.retries < 3) {
                    failed.push(request);
                }
            }
        }

        // Update queue (remove processed, keep failed)
        this.queue = failed;
        await this.saveQueue();

        console.log(`✅ Processed ${processed.length} requests`);
        console.log(`⚠️ ${failed.length} requests remain in queue`);

        this.processing = false;
    }

    /**
     * Get queue status
     */
    getStatus(): { count: number; processing: boolean } {
        return {
            count: this.queue.length,
            processing: this.processing
        };
    }

    /**
     * Clear queue
     */
    async clear(): Promise<void> {
        this.queue = [];
        await this.saveQueue();
        console.log('🗑️ Cleared sync queue');
    }
}

// ==================== NETWORK STATUS MANAGER ====================
export class NetworkStatusManager {
    private static instance: NetworkStatusManager;
    private isOnline = true;
    private listeners: Set<(isOnline: boolean) => void> = new Set();

    private constructor() {
        this.setupListener();
    }

    static getInstance(): NetworkStatusManager {
        if (!this.instance) {
            this.instance = new NetworkStatusManager();
        }
        return this.instance;
    }

    private setupListener(): void {
        NetInfo.addEventListener(state => {
            const wasOnline = this.isOnline;
            this.isOnline = state.isConnected ?? false;

            if (wasOnline !== this.isOnline) {
                console.log(`📡 Network status: ${this.isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
                this.notifyListeners();
            }
        });

        // Get initial state
        NetInfo.fetch().then(state => {
            this.isOnline = state.isConnected ?? false;
            console.log(`📡 Initial network status: ${this.isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
        });
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.isOnline));
    }

    /**
     * Subscribe to network status changes
     */
    subscribe(listener: (isOnline: boolean) => void): () => void {
        this.listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Get current network status
     */
    getStatus(): boolean {
        return this.isOnline;
    }

    /**
     * Wait for network to be online
     */
    async waitForOnline(timeout = 30000): Promise<boolean> {
        if (this.isOnline) return true;

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                unsubscribe();
                resolve(false);
            }, timeout);

            const unsubscribe = this.subscribe((isOnline) => {
                if (isOnline) {
                    clearTimeout(timeoutId);
                    unsubscribe();
                    resolve(true);
                }
            });
        });
    }
}

// ==================== SYNC STATUS HOOK ====================
export function useSyncStatus() {
    const [status, setStatus] = React.useState<SyncStatus>({
        isOnline: true,
        isSyncing: false,
        lastSync: null,
        pendingCount: 0,
        errors: []
    });

    React.useEffect(() => {
        const networkManager = NetworkStatusManager.getInstance();
        const queueManager = OfflineQueueManager.getInstance();

        // Update network status
        const unsubscribe = networkManager.subscribe((isOnline) => {
            setStatus(prev => ({ ...prev, isOnline }));
        });

        // Update queue status periodically
        const interval = setInterval(() => {
            const queueStatus = queueManager.getStatus();
            setStatus(prev => ({
                ...prev,
                isSyncing: queueStatus.processing,
                pendingCount: queueStatus.count
            }));
        }, 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    return status;
}

// ==================== EXPORTS ====================
export const syncService = {
    cache: CacheManager,
    queue: OfflineQueueManager.getInstance(),
    network: NetworkStatusManager.getInstance()
};