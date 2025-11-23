// utils/syncManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// ==================== CONFIGURATION ====================
export const SYNC_CONFIG = {
    KEYS: {
        USER_INFO: 'sync_user_info_v3',
        CONTACTS: 'sync_contacts_v3',
        LOCATION: 'sync_location_v3',
        MEDICAL_INFO: 'sync_medical_info_v3',
        QUEUE: 'sync_queue_v3',
        LAST_SYNC: 'sync_last_sync_v3',
        SYNC_STATE: 'sync_state_v3',
    },
    EXPIRY: {
        USER_INFO: 10 * 60 * 1000, // 10 minutes
        CONTACTS: 5 * 60 * 1000, // 5 minutes
        LOCATION: 15 * 60 * 1000, // 15 minutes
        MEDICAL_INFO: 30 * 60 * 1000, // 30 minutes
        OFFLINE_FALLBACK: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    BATCH_DELAY: 1000,
};

// ==================== INTERFACES ====================
interface SyncMetadata {
    timestamp: number;
    version: string;
    hash: string;
    serverTimestamp?: string;
    synced: boolean;
    deviceId?: string; // ✅ NEW: Track which device made the change
    userId?: string; // ✅ NEW: Track which user made the change
}

// ✅ NEW: Conflict detection and resolution interfaces
interface ConflictInfo<T> {
    local: {
        data: T;
        timestamp: number;
        deviceId?: string;
    };
    server: {
        data: T;
        timestamp: number;
        deviceId?: string;
    };
    conflictType: 'TIMESTAMP' | 'HASH_MISMATCH' | 'VERSION_MISMATCH';
    resolution: 'LOCAL_WINS' | 'SERVER_WINS' | 'MERGE' | 'MANUAL';
}

interface MergeStrategy {
    strategy: 'last-write-wins' | 'manual' | 'field-level-merge';
    customMerger?: <T>(local: T, server: T) => T;
}

interface CachedData<T> {
    data: T;
    metadata: SyncMetadata;
}

interface QueuedOperation {
    id: string;
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: 'USER_INFO' | 'CONTACTS' | 'MEDICAL_INFO' | 'LOCATION';
    data: any;
    timestamp: number; // Added timestamp field
    retries: number;
    token: string;
}

interface SyncState {
    isOnline: boolean;
    isSyncing: boolean;
    lastSync: {
        userInfo?: number;
        contacts?: number;
        medicalInfo?: number;
        location?: number;
    };
    pendingOperations: number;
    errors: string[];
}

// ==================== UTILITIES ====================
class SyncUtilities {
    static generateHash(data: any): string {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    static async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static isExpired(timestamp: number, expiryMs: number): boolean {
        return Date.now() - timestamp > expiryMs;
    }

    // ✅ ENHANCED: Sophisticated conflict resolution with timestamp-based merging
    static detectConflict<T>(
        local: { data: T; metadata: SyncMetadata },
        server: { data: T; timestamp: number; deviceId?: string }
    ): ConflictInfo<T> | null {
        const localHash = this.generateHash(local.data);
        const serverHash = this.generateHash(server.data);

        // No conflict if hashes match
        if (localHash === serverHash) {
            return null;
        }

        // Determine conflict type
        let conflictType: ConflictInfo<T>['conflictType'] = 'HASH_MISMATCH';
        if (Math.abs(local.metadata.timestamp - server.timestamp) > 1000) {
            conflictType = 'TIMESTAMP';
        }

        // Determine resolution strategy
        let resolution: ConflictInfo<T>['resolution'] = 'SERVER_WINS';
        if (server.timestamp > local.metadata.timestamp) {
            resolution = 'SERVER_WINS';
        } else if (server.timestamp < local.metadata.timestamp) {
            resolution = 'LOCAL_WINS';
        } else {
            // Same timestamp, different data - rare but possible
            resolution = 'MERGE';
        }

        const conflict: ConflictInfo<T> = {
            local: {
                data: local.data,
                timestamp: local.metadata.timestamp,
                deviceId: local.metadata.deviceId,
            },
            server: {
                data: server.data,
                timestamp: server.timestamp,
                deviceId: server.deviceId,
            },
            conflictType,
            resolution,
        };

        // Log conflict to Sentry
        Sentry.captureMessage('Sync conflict detected', {
            level: 'warning',
            extra: {
                conflictType,
                resolution,
                localTimestamp: local.metadata.timestamp,
                serverTimestamp: server.timestamp,
                localDeviceId: local.metadata.deviceId,
                serverDeviceId: server.deviceId,
                timeDifferenceMs: server.timestamp - local.metadata.timestamp,
            },
        });

        console.warn('⚠️ Sync conflict detected:', {
            type: conflictType,
            resolution,
            timeDiff: server.timestamp - local.metadata.timestamp,
        });

        return conflict;
    }

    // ✅ ENHANCED: Intelligent data merging based on conflict resolution
    static resolveConflict<T>(
        conflict: ConflictInfo<T>,
        strategy: MergeStrategy = { strategy: 'last-write-wins' }
    ): T {
        switch (strategy.strategy) {
            case 'last-write-wins':
                return conflict.resolution === 'LOCAL_WINS'
                    ? conflict.local.data
                    : conflict.server.data;

            case 'field-level-merge':
                // Field-level merge for objects
                if (typeof conflict.local.data === 'object' && typeof conflict.server.data === 'object') {
                    return this.fieldLevelMerge(
                        conflict.local.data as any,
                        conflict.server.data as any,
                        conflict.local.timestamp,
                        conflict.server.timestamp
                    ) as T;
                }
                // Fallback to last-write-wins for primitives
                return conflict.resolution === 'LOCAL_WINS'
                    ? conflict.local.data
                    : conflict.server.data;

            case 'manual':
                if (strategy.customMerger) {
                    return strategy.customMerger(conflict.local.data, conflict.server.data);
                }
                // Fallback to last-write-wins
                return conflict.resolution === 'LOCAL_WINS'
                    ? conflict.local.data
                    : conflict.server.data;

            default:
                return conflict.server.data;
        }
    }

    // ✅ NEW: Field-level merge for nested objects
    private static fieldLevelMerge<T extends Record<string, any>>(
        local: T,
        server: T,
        localTimestamp: number,
        serverTimestamp: number
    ): T {
        const merged: any = { ...server }; // Start with server data as base

        // Iterate through local fields
        Object.keys(local).forEach(key => {
            const localValue = local[key];
            const serverValue = server[key];

            // If field doesn't exist in server, use local
            if (!(key in server)) {
                merged[key] = localValue;
                return;
            }

            // If values are different, use the one from the latest timestamp
            if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
                // For nested objects, recurse
                if (
                    typeof localValue === 'object' &&
                    localValue !== null &&
                    typeof serverValue === 'object' &&
                    serverValue !== null &&
                    !Array.isArray(localValue) &&
                    !Array.isArray(serverValue)
                ) {
                    merged[key] = this.fieldLevelMerge(
                        localValue,
                        serverValue,
                        localTimestamp,
                        serverTimestamp
                    );
                } else {
                    // Use timestamp to decide
                    merged[key] = localTimestamp > serverTimestamp ? localValue : serverValue;
                }
            }
        });

        return merged as T;
    }

    // ✅ DEPRECATED: Old simple merge method (kept for backwards compatibility)
    static mergeData<T>(local: T, server: T, serverWins: boolean = true): T {
        console.warn('⚠️ Using deprecated mergeData - use resolveConflict instead');
        if (serverWins) return server;
        return { ...server, ...local };
    }
}

// ==================== CACHE MANAGER ====================
export class CacheManager {
    private static readonly VERSION = '3.0';
    private static deviceId: string | null = null;

    // ✅ NEW: Get or generate device ID
    private static async getDeviceId(): Promise<string> {
        if (this.deviceId) return this.deviceId;

        try {
            let stored = await AsyncStorage.getItem('device_id');
            if (!stored) {
                stored = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
                await AsyncStorage.setItem('device_id', stored);
            }
            this.deviceId = stored;
            return stored;
        } catch (error) {
            console.error('Failed to get device ID:', error);
            return 'unknown_device';
        }
    }

    static async set<T>(key: string, data: T, synced: boolean = false, userId?: string): Promise<boolean> {
        try {
            const deviceId = await this.getDeviceId();
            const cached: CachedData<T> = {
                data,
                metadata: {
                    timestamp: Date.now(),
                    version: this.VERSION,
                    hash: SyncUtilities.generateHash(data),
                    synced,
                    deviceId, // ✅ NEW: Track device
                    userId, // ✅ NEW: Track user
                },
            };

            await AsyncStorage.setItem(key, JSON.stringify(cached));
            console.log(`💾 Cached: ${key} (synced: ${synced}, device: ${deviceId.slice(0, 12)}...)`);
            return true;
        } catch (error) {
            console.error(`❌ Cache save failed for ${key}:`, error);
            Sentry.captureException(error, {
                extra: { operation: 'cache_set', key },
            });
            return false;
        }
    }

    static async get<T>(key: string, maxAge?: number): Promise<{ data: T; metadata: SyncMetadata } | null> {
        try {
            const stored = await AsyncStorage.getItem(key);
            if (!stored) return null;

            const cached: CachedData<T> = JSON.parse(stored);

            // Version check
            if (cached.metadata.version !== this.VERSION) {
                console.warn(`⚠️ Version mismatch for ${key}, clearing cache`);
                await this.remove(key);
                return null;
            }

            // Age check
            if (maxAge && SyncUtilities.isExpired(cached.metadata.timestamp, maxAge)) {
                console.log(`⏰ Cache expired for ${key}`);
                return null;
            }

            return cached;
        } catch (error) {
            console.error(`❌ Cache read failed for ${key}:`, error);
            return null;
        }
    }

    static async remove(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
            console.log(`🗑️ Removed cache: ${key}`);
        } catch (error) {
            console.error(`❌ Cache removal failed for ${key}:`, error);
        }
    }

    static async clearAll(): Promise<void> {
        try {
            const keys = Object.values(SYNC_CONFIG.KEYS);
            await AsyncStorage.multiRemove(keys);
            console.log('🗑️ All cache cleared');
        } catch (error) {
            console.error('❌ Cache clear failed:', error);
        }
    }

    // ✅ NEW: Merge server data with local cache, handling conflicts
    static async mergeWithServer<T>(
        key: string,
        serverData: T,
        serverTimestamp: number,
        serverDeviceId?: string,
        strategy: MergeStrategy = { strategy: 'last-write-wins' }
    ): Promise<{ data: T; hadConflict: boolean }> {
        try {
            const localCache = await this.get<T>(key);

            if (!localCache) {
                // No local data, use server data
                await this.set(key, serverData, true);
                return { data: serverData, hadConflict: false };
            }

            // Detect conflict
            const conflict = SyncUtilities.detectConflict(localCache, {
                data: serverData,
                timestamp: serverTimestamp,
                deviceId: serverDeviceId,
            });

            if (!conflict) {
                // No conflict, data is identical
                await this.set(key, serverData, true, localCache.metadata.userId);
                return { data: serverData, hadConflict: false };
            }

            // Resolve conflict
            const resolvedData = SyncUtilities.resolveConflict(conflict, strategy);

            // Save resolved data
            await this.set(key, resolvedData, true, localCache.metadata.userId);

            console.log(`✅ Conflict resolved for ${key}:`, {
                strategy: strategy.strategy,
                resolution: conflict.resolution,
                winner: conflict.resolution === 'LOCAL_WINS' ? 'local' : 'server',
            });

            return { data: resolvedData, hadConflict: true };
        } catch (error) {
            console.error(`❌ Merge failed for ${key}:`, error);
            Sentry.captureException(error, {
                extra: { operation: 'merge_with_server', key },
            });
            // On error, prefer server data
            await this.set(key, serverData, true);
            return { data: serverData, hadConflict: false };
        }
    }
}

// ==================== NETWORK MANAGER ====================
export class NetworkManager {
    private static instance: NetworkManager;
    private isOnline = true;
    private listeners = new Set<(status: boolean) => void>();

    private constructor() {
        this.initialize();
    }

    static getInstance(): NetworkManager {
        if (!this.instance) {
            this.instance = new NetworkManager();
        }
        return this.instance;
    }

    private initialize(): void {
        NetInfo.addEventListener(state => {
            const wasOnline = this.isOnline;
            this.isOnline = state.isConnected ?? false;

            if (wasOnline !== this.isOnline) {
                console.log(`📡 Network: ${this.isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
                this.notifyListeners();
            }
        });

        NetInfo.fetch().then(state => {
            this.isOnline = state.isConnected ?? false;
            console.log(`📡 Initial network: ${this.isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
        });
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.isOnline));
    }

    subscribe(listener: (status: boolean) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getStatus(): boolean {
        return this.isOnline;
    }

    async waitForOnline(timeout = 30000): Promise<boolean> {
        if (this.isOnline) return true;

        return new Promise(resolve => {
            const timeoutId = setTimeout(() => {
                unsubscribe();
                resolve(false);
            }, timeout);

            const unsubscribe = this.subscribe(isOnline => {
                if (isOnline) {
                    clearTimeout(timeoutId);
                    unsubscribe();
                    resolve(true);
                }
            });
        });
    }
}

// ==================== OFFLINE QUEUE MANAGER ====================
export class OfflineQueueManager {
    private static instance: OfflineQueueManager;
    private queue: QueuedOperation[] = [];
    private processing = false;

    private constructor() {
        this.loadQueue();
        this.setupAutoProcess();
    }

    static getInstance(): OfflineQueueManager {
        if (!this.instance) {
            this.instance = new OfflineQueueManager();
        }
        return this.instance;
    }

    private async loadQueue(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem(SYNC_CONFIG.KEYS.QUEUE);
            if (stored) {
                this.queue = JSON.parse(stored);
                console.log(`📥 Loaded ${this.queue.length} queued operations`);
            }
        } catch (error) {
            console.error('❌ Queue load failed:', error);
        }
    }

    private async saveQueue(): Promise<void> {
        try {
            await AsyncStorage.setItem(SYNC_CONFIG.KEYS.QUEUE, JSON.stringify(this.queue));
        } catch (error) {
            console.error('❌ Queue save failed:', error);
        }
    }

    private setupAutoProcess(): void {
        NetworkManager.getInstance().subscribe(async isOnline => {
            if (isOnline && this.queue.length > 0 && !this.processing) {
                console.log('🔄 Network restored, processing queue...');
                await SyncUtilities.delay(2000); // Wait 2s for stability
                await this.processQueue();
            }
        });
    }

    async add(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>): Promise<void> {
        const op: QueuedOperation = {
            ...operation,
            id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            timestamp: Date.now(),
            retries: 0,
        };

        this.queue.push(op);
        await this.saveQueue();

        console.log(`➕ Queued: ${op.type} ${op.entity}`);
        console.log(`📊 Queue size: ${this.queue.length}`);
    }

    async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        console.log(`🔄 Processing ${this.queue.length} operations...`);

        const processed: string[] = [];
        const failed: QueuedOperation[] = [];

        for (const op of this.queue) {
            try {
                console.log(`⏳ Processing: ${op.type} ${op.entity} (${op.id})`);

                const success = await this.executeOperation(op);

                if (success) {
                    console.log(`✅ Operation succeeded: ${op.id}`);
                    processed.push(op.id);
                } else {
                    op.retries++;
                    if (op.retries < SYNC_CONFIG.MAX_RETRIES) {
                        failed.push(op);
                    } else {
                        console.error(`❌ Operation exhausted retries: ${op.id}`);
                    }
                }
            } catch (error) {
                console.error(`❌ Operation error: ${op.id}`, error);
                op.retries++;
                if (op.retries < SYNC_CONFIG.MAX_RETRIES) {
                    failed.push(op);
                }
            }

            await SyncUtilities.delay(SYNC_CONFIG.RETRY_DELAY);
        }

        this.queue = failed;
        await this.saveQueue();

        console.log(`✅ Processed ${processed.length} operations`);
        console.log(`⚠️ ${failed.length} operations remain in queue`);

        this.processing = false;
    }

    private async executeOperation(op: QueuedOperation): Promise<boolean> {
        const env = process.env.NODE_ENV
        console.log('Environment at Auth context:', env);
        const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';
        console.log("apiUrl at Auth context", apiUrl)
        if (!apiUrl && env === 'production') {
            return false
        }


        try {
            const response = await fetch(`${apiUrl}/api/user-info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${op.token}`,
                },
                body: JSON.stringify(op.data),
            });

            return response.ok;
        } catch (error) {
            console.error('Operation execution failed:', error);
            return false;
        }
    }

    getStatus(): { count: number; processing: boolean } {
        return {
            count: this.queue.length,
            processing: this.processing,
        };
    }

    async clear(): Promise<void> {
        this.queue = [];
        await this.saveQueue();
        console.log('🗑️ Queue cleared');
    }

    // ==================== LOCATION QUEUE MANAGER ====================
    static async getQueue(key: string) {
        const stored = await AsyncStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    }

    static async add(item: any) {
        const queue = await this.getQueue('LOCATION_UPDATE');
        queue.push(item);
        await AsyncStorage.setItem('LOCATION_UPDATE', JSON.stringify(queue));
    }

    static async clearQueue(key: string) {
        await AsyncStorage.removeItem(key);
    }

    static async remove(timestamp: number) {
        const queue = await this.getQueue('LOCATION_UPDATE');
        const updatedQueue = queue.filter((item: QueuedOperation) => item.timestamp !== timestamp);
        await AsyncStorage.setItem('LOCATION_UPDATE', JSON.stringify(updatedQueue));
    }
}

// ==================== SYNC MANAGER ====================
export class SyncManager {
    private static instance: SyncManager;
    private state: SyncState = {
        isOnline: true,
        isSyncing: false,
        lastSync: {},
        pendingOperations: 0,
        errors: [],
    };
    private listeners = new Set<(state: SyncState) => void>();

    private constructor() {
        this.initialize();
    }

    static getInstance(): SyncManager {
        if (!this.instance) {
            this.instance = new SyncManager();
        }
        return this.instance;
    }

    private async initialize(): Promise<void> {
        // Load saved state
        try {
            const saved = await AsyncStorage.getItem(SYNC_CONFIG.KEYS.SYNC_STATE);
            if (saved) {
                this.state = { ...this.state, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load sync state:', error);
        }

        // Setup network listener
        NetworkManager.getInstance().subscribe(isOnline => {
            this.updateState({ isOnline });
        });
    }

    private async saveState(): Promise<void> {
        try {
            await AsyncStorage.setItem(SYNC_CONFIG.KEYS.SYNC_STATE, JSON.stringify(this.state));
        } catch (error) {
            console.error('Failed to save sync state:', error);
        }
    }

    private updateState(updates: Partial<SyncState>): void {
        this.state = { ...this.state, ...updates };
        this.saveState();
        this.notifyListeners();
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.state));
    }

    subscribe(listener: (state: SyncState) => void): () => void {
        this.listeners.add(listener);
        listener(this.state); // Immediate callback with current state
        return () => this.listeners.delete(listener);
    }

    getState(): SyncState {
        return { ...this.state };
    }

    async syncAll(token: string): Promise<boolean> {
        if (this.state.isSyncing) {
            console.log('⏳ Sync already in progress');
            return false;
        }

        this.updateState({ isSyncing: true, errors: [] });

        try {
            console.log('🔄 Starting full sync...');

            // Process offline queue first
            await OfflineQueueManager.getInstance().processQueue();

            // Sync each entity
            const results = await Promise.allSettled([
                this.syncUserInfo(token),
                this.syncContacts(token),
                this.syncMedicalInfo(token),
            ]);

            const errors: string[] = [];
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    errors.push(result.reason?.message || 'Unknown error');
                }
            });

            this.updateState({
                isSyncing: false,
                errors,
                lastSync: {
                    ...this.state.lastSync,
                    userInfo: Date.now(),
                    contacts: Date.now(),
                    medicalInfo: Date.now(),
                },
            });

            console.log('✅ Full sync completed');
            return errors.length === 0;
        } catch (error: any) {
            console.error('❌ Sync failed:', error);
            this.updateState({
                isSyncing: false,
                errors: [error.message || 'Sync failed'],
            });
            return false;
        }
    }

    private async syncUserInfo(token: string): Promise<void> {
        console.log('🔄 Syncing user info...');

        try {
            const env = process.env.NODE_ENV;
            const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';

            if (!apiUrl && env === 'production') {
                throw new Error('API URL not configured');
            }

            // Fetch from server
            const response = await fetch(`${apiUrl}/api/user-info`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const serverData = await response.json();
            const serverTimestamp = new Date(serverData.updated_at || serverData.timestamp || Date.now()).getTime();

            // ✅ Use conflict resolution
            const { data: resolvedData, hadConflict } = await CacheManager.mergeWithServer(
                SYNC_CONFIG.KEYS.USER_INFO,
                serverData,
                serverTimestamp,
                serverData.device_id,
                { strategy: 'field-level-merge' } // Use field-level merge for user info
            );

            if (hadConflict) {
                console.log('⚠️ User info conflict resolved');
                // If local data won, push to server
                if (resolvedData !== serverData) {
                    await this.pushUserInfoToServer(token, resolvedData);
                }
            }

            console.log('✅ User info synced successfully');
        } catch (error: any) {
            console.error('❌ User info sync failed:', error);
            Sentry.captureException(error, {
                extra: { operation: 'sync_user_info' },
            });
            throw error;
        }
    }

    private async syncContacts(token: string): Promise<void> {
        console.log('🔄 Syncing contacts...');

        try {
            const env = process.env.NODE_ENV;
            const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';

            if (!apiUrl && env === 'production') {
                throw new Error('API URL not configured');
            }

            const response = await fetch(`${apiUrl}/api/contacts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const serverData = await response.json();
            const serverTimestamp = new Date(serverData.updated_at || Date.now()).getTime();

            // ✅ Use last-write-wins for contacts (array data)
            const { data: resolvedData, hadConflict } = await CacheManager.mergeWithServer(
                SYNC_CONFIG.KEYS.CONTACTS,
                serverData,
                serverTimestamp,
                serverData.device_id,
                { strategy: 'last-write-wins' }
            );

            if (hadConflict) {
                console.log('⚠️ Contacts conflict resolved');
                if (resolvedData !== serverData) {
                    await this.pushContactsToServer(token, resolvedData);
                }
            }

            console.log('✅ Contacts synced successfully');
        } catch (error: any) {
            console.error('❌ Contacts sync failed:', error);
            Sentry.captureException(error, {
                extra: { operation: 'sync_contacts' },
            });
            throw error;
        }
    }

    private async syncMedicalInfo(token: string): Promise<void> {
        console.log('🔄 Syncing medical info...');

        try {
            const env = process.env.NODE_ENV;
            const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';

            if (!apiUrl && env === 'production') {
                throw new Error('API URL not configured');
            }

            const response = await fetch(`${apiUrl}/api/medical-info`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const serverData = await response.json();
            const serverTimestamp = new Date(serverData.updated_at || Date.now()).getTime();

            // ✅ Use field-level merge for medical info (critical data)
            const { data: resolvedData, hadConflict } = await CacheManager.mergeWithServer(
                SYNC_CONFIG.KEYS.MEDICAL_INFO,
                serverData,
                serverTimestamp,
                serverData.device_id,
                { strategy: 'field-level-merge' }
            );

            if (hadConflict) {
                console.log('⚠️ Medical info conflict resolved');
                if (resolvedData !== serverData) {
                    await this.pushMedicalInfoToServer(token, resolvedData);
                }
            }

            console.log('✅ Medical info synced successfully');
        } catch (error: any) {
            console.error('❌ Medical info sync failed:', error);
            Sentry.captureException(error, {
                extra: { operation: 'sync_medical_info' },
            });
            throw error;
        }
    }

    // ✅ NEW: Helper methods to push resolved data back to server
    private async pushUserInfoToServer(token: string, data: any): Promise<void> {
        const env = process.env.NODE_ENV;
        const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';

        if (!apiUrl && env === 'production') return;

        try {
            await fetch(`${apiUrl}/api/user-info`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            console.log('✅ Pushed resolved user info to server');
        } catch (error) {
            console.error('Failed to push user info to server:', error);
        }
    }

    private async pushContactsToServer(token: string, data: any): Promise<void> {
        const env = process.env.NODE_ENV;
        const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';

        if (!apiUrl && env === 'production') return;

        try {
            await fetch(`${apiUrl}/api/contacts`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            console.log('✅ Pushed resolved contacts to server');
        } catch (error) {
            console.error('Failed to push contacts to server:', error);
        }
    }

    private async pushMedicalInfoToServer(token: string, data: any): Promise<void> {
        const env = process.env.NODE_ENV;
        const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';

        if (!apiUrl && env === 'production') return;

        try {
            await fetch(`${apiUrl}/api/medical-info`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            console.log('✅ Pushed resolved medical info to server');
        } catch (error) {
            console.error('Failed to push medical info to server:', error);
        }
    }
}

// ==================== EXPORTS ====================
export const syncService = {
    cache: CacheManager,
    network: NetworkManager.getInstance(),
    queue: OfflineQueueManager.getInstance(),
    sync: SyncManager.getInstance(),
    utilities: SyncUtilities, // ✅ NEW: Export utilities for testing
};

// Export types for external use
export type {
    CachedData, ConflictInfo,
    MergeStrategy, QueuedOperation, SyncMetadata, SyncState
};

