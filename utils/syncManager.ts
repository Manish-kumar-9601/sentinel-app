// utils/syncManager.ts
import { STORAGE_KEYS } from '@/constants/storage';
import { StorageService } from '@/services/storage';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

// ==================== CONFIGURATION ====================
export const SYNC_CONFIG = {
    KEYS: {
        USER_INFO: STORAGE_KEYS.USER_INFO,
        CONTACTS: STORAGE_KEYS.EMERGENCY_CONTACTS,
        LOCATION: STORAGE_KEYS.LOCATION_CACHE,
        MEDICAL_INFO: STORAGE_KEYS.MEDICAL_INFO,
        QUEUE: STORAGE_KEYS.SYNC_QUEUE,
        LAST_SYNC: STORAGE_KEYS.LAST_SYNC_TIMESTAMP,
        SYNC_STATE: STORAGE_KEYS.SYNC_STATE,
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
    timestamp: number;
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

    static mergeData<T>(local: T, server: T, serverWins: boolean = true): T {
        if (serverWins) return server;
        return { ...server, ...local };
    }
}

// ==================== CACHE MANAGER ====================
export class CacheManager {
    private static readonly VERSION = '3.0';

    static async set<T>(key: string, data: T, synced: boolean = false): Promise<boolean> {
        try {
            const cached: CachedData<T> = {
                data,
                metadata: {
                    timestamp: Date.now(),
                    version: this.VERSION,
                    hash: SyncUtilities.generateHash(data),
                    synced,
                },
            };

            await StorageService.set(key, cached);
            console.log(`💾 Cached: ${key} (synced: ${synced})`);
            return true;
        } catch (error) {
            console.error(`❌ Cache save failed for ${key}:`, error);
            return false;
        }
    }

    static async get<T>(key: string, maxAge?: number): Promise<{ data: T; metadata: SyncMetadata } | null> {
        try {
            const cached = await StorageService.get<CachedData<T>>(key);
            if (!cached) return null;

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
            await StorageService.delete(key);
            console.log(`🗑️ Removed cache: ${key}`);
        } catch (error) {
            console.error(`❌ Cache removal failed for ${key}:`, error);
        }
    }

    static async clearAll(): Promise<void> {
        try {
            const keys = Object.values(SYNC_CONFIG.KEYS);
            await Promise.all(keys.map(key => StorageService.delete(key)));
            console.log('🗑️ All cache cleared');
        } catch (error) {
            console.error('❌ Cache clear failed:', error);
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
            const stored = await StorageService.get<QueuedOperation[]>(SYNC_CONFIG.KEYS.QUEUE);
            if (stored) {
                this.queue = stored;
                console.log(`📥 Loaded ${this.queue.length} queued operations`);
            }
        } catch (error) {
            console.error('❌ Queue load failed:', error);
        }
    }

    private async saveQueue(): Promise<void> {
        try {
            await StorageService.set(SYNC_CONFIG.KEYS.QUEUE, this.queue);
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
            const saved = await StorageService.get<Partial<SyncState>>(SYNC_CONFIG.KEYS.SYNC_STATE);
            if (saved) {
                this.state = { ...this.state, ...saved };
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
            await StorageService.set(SYNC_CONFIG.KEYS.SYNC_STATE, this.state);
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
        // Implementation would go here
        console.log('Syncing user info...');
    }

    private async syncContacts(token: string): Promise<void> {
        // Implementation would go here
        console.log('Syncing contacts...');
    }

    private async syncMedicalInfo(token: string): Promise<void> {
        // Implementation would go here
        console.log('Syncing medical info...');
    }
}

// ==================== EXPORTS ====================
export const syncService = {
    cache: CacheManager,
    network: NetworkManager.getInstance(),
    queue: OfflineQueueManager.getInstance(),
    sync: SyncManager.getInstance(),
};