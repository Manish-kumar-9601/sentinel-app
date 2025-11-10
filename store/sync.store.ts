/**
 * Sync Store
 * 
 * Manages synchronization state and offline queue.
 * Separated from global store for better performance.
 * 
 * @module SyncStore
 */

import { NetworkManager, OfflineQueueManager } from '@/utils/syncManager';
import { create } from 'zustand';

// ==================== TYPES ====================

export interface SyncStatus {
    isOnline: boolean;
    isSyncing: boolean;
    lastSync: Date | null;
    pendingChanges: number;
    error: string | null;
}

export interface SyncState {
    // State
    syncStatus: SyncStatus;

    // Actions
    initialize: () => Promise<void>;
    startSync: (operation: string) => void;
    finishSync: (success: boolean, error?: string) => void;
    updateOnlineStatus: (isOnline: boolean) => void;
    incrementPendingChanges: () => void;
    decrementPendingChanges: () => void;
    processOfflineQueue: () => Promise<void>;
}

// ==================== STORE IMPLEMENTATION ====================

export const useSyncStore = create<SyncState>((set, get) => ({
    // ==================== INITIAL STATE ====================
    syncStatus: {
        isOnline: true,
        isSyncing: false,
        lastSync: null,
        pendingChanges: 0,
        error: null,
    },

    // ==================== ACTIONS ====================

    /**
     * Initialize sync system (network listener, etc.)
     */
    initialize: async () => {
        try {
            console.log('🚀 [SyncStore] Initializing sync system...');

            // Setup network listener
            NetworkManager.getInstance().subscribe(isOnline => {
                get().updateOnlineStatus(isOnline);

                // Auto-process queue when coming online
                if (isOnline) {
                    const { syncStatus } = get();
                    if (syncStatus.pendingChanges > 0) {
                        console.log('🔄 [SyncStore] Coming online, processing queue...');
                        get().processOfflineQueue();
                    }
                }
            });

            // Load initial network status
            const isOnline = NetworkManager.getInstance().getStatus();
            get().updateOnlineStatus(isOnline);

            console.log('✅ [SyncStore] Sync system initialized');
        } catch (error) {
            console.error('❌ [SyncStore] Failed to initialize:', error);
        }
    },

    /**
     * Mark sync operation as started
     */
    startSync: (operation) => {
        console.log(`🔄 [SyncStore] Starting sync: ${operation}`);
        set(state => ({
            syncStatus: {
                ...state.syncStatus,
                isSyncing: true,
                error: null,
            },
        }));
    },

    /**
     * Mark sync operation as finished
     */
    finishSync: (success, error) => {
        console.log(`${success ? '✅' : '❌'} [SyncStore] Sync finished:`, success ? 'success' : error);

        set(state => ({
            syncStatus: {
                ...state.syncStatus,
                isSyncing: false,
                lastSync: success ? new Date() : state.syncStatus.lastSync,
                error: error || null,
                pendingChanges: success ? 0 : state.syncStatus.pendingChanges,
            },
        }));
    },

    /**
     * Update online/offline status
     */
    updateOnlineStatus: (isOnline) => {
        console.log(`${isOnline ? '🟢' : '🔴'} [SyncStore] Network status:`, isOnline ? 'ONLINE' : 'OFFLINE');

        set(state => ({
            syncStatus: {
                ...state.syncStatus,
                isOnline,
            },
        }));
    },

    /**
     * Increment pending changes counter
     */
    incrementPendingChanges: () => {
        set(state => ({
            syncStatus: {
                ...state.syncStatus,
                pendingChanges: state.syncStatus.pendingChanges + 1,
            },
        }));
        console.log('📈 [SyncStore] Pending changes:', get().syncStatus.pendingChanges);
    },

    /**
     * Decrement pending changes counter
     */
    decrementPendingChanges: () => {
        set(state => ({
            syncStatus: {
                ...state.syncStatus,
                pendingChanges: Math.max(0, state.syncStatus.pendingChanges - 1),
            },
        }));
        console.log('📉 [SyncStore] Pending changes:', get().syncStatus.pendingChanges);
    },

    /**
     * Process offline queue
     */
    processOfflineQueue: async () => {
        try {
            const { syncStatus } = get();

            if (!syncStatus.isOnline) {
                console.log('📴 [SyncStore] Offline, skipping queue processing');
                return;
            }

            console.log('🔄 [SyncStore] Processing offline queue...');
            get().startSync('offline-queue');

            await OfflineQueueManager.getInstance().processQueue();

            get().finishSync(true);
            console.log('✅ [SyncStore] Offline queue processed');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Queue processing failed';
            get().finishSync(false, errorMessage);
            console.error('❌ [SyncStore] Failed to process queue:', error);
        }
    },
}));
