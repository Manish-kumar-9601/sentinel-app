/**
 * Offline-First Location Tracking Service
 * 
 * Handles location tracking with:
 * - Authorization gate (only tracks when logged in)
 * - Delayed initialization (2-5s after auth)
 * - Network-aware sync (online: direct upload, offline: queue)
 * - Batch upload when connectivity restored
 * - Foreground/SOS triggers
 * 
 * @module LocationSyncService
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { AppState, AppStateStatus } from 'react-native';
import { authenticatedFetch } from '../utils/apiClient';
import { NetworkManager } from '../utils/syncManager';

// ==================== TYPES ====================

interface LocationQueueItem {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
}

interface LocationSyncConfig {
    enabled: boolean;
    token: string | null;
    userId: string | null;
    initDelayMs: number; // Delay before starting tracking
    trackingIntervalMs: number; // How often to record location
    batchSize: number; // Max locations per upload
}

interface LocationSyncStatus {
    isTracking: boolean;
    isOnline: boolean;
    queueSize: number;
    lastSync: Date | null;
    lastLocation: LocationQueueItem | null;
    errors: string[];
}

// ==================== CONSTANTS ====================

const STORAGE_KEYS = {
    LOCATION_QUEUE: 'location_sync_queue_v1',
    LAST_SYNC: 'location_sync_last_sync',
} as const;

const DEFAULT_CONFIG: Omit<LocationSyncConfig, 'token' | 'userId'> = {
    enabled: false,
    initDelayMs: 3000, // 3 second delay
    trackingIntervalMs: 60000, // Track every 1 minute
    batchSize: 50, // Upload 50 locations at once
};

// ==================== SERVICE IMPLEMENTATION ====================

class LocationSyncServiceClass {
    // State
    private config: LocationSyncConfig = {
        ...DEFAULT_CONFIG,
        token: null,
        userId: null,
    };

    private status: LocationSyncStatus = {
        isTracking: false,
        isOnline: true,
        queueSize: 0,
        lastSync: null,
        lastLocation: null,
        errors: [],
    };

    // Listeners
    private listeners = new Set<(status: LocationSyncStatus) => void>();
    private locationSubscription: Location.LocationSubscription | null = null;
    private networkUnsubscribe: (() => void) | null = null;
    private appStateSubscription: any = null;
    private initTimeout: NodeJS.Timeout | null = null;

    // ==================== PUBLIC API ====================

    /**
     * Initialize service with user credentials
     * Does NOT start tracking immediately - waits for initDelayMs
     */
    async initialize(token: string, userId: string): Promise<void> {
        console.log('🚀 [LocationSync] Initializing service...');

        // Clear any existing timeout
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
        }

        // Update config
        this.config = {
            ...this.config,
            token,
            userId,
            enabled: true,
        };

        // Setup network listener
        this.setupNetworkListener();

        // Setup app state listener
        this.setupAppStateListener();

        // ✅ CRITICAL: Delay tracking start to prevent blocking
        console.log(`⏳ [LocationSync] Waiting ${this.config.initDelayMs}ms before starting...`);
        this.initTimeout = setTimeout(() => {
            this.startTracking();
        }, this.config.initDelayMs);

        console.log('✅ [LocationSync] Service initialized (tracking will start after delay)');
    }

    /**
     * Stop tracking and cleanup
     */
    async stop(): Promise<void> {
        console.log('🛑 [LocationSync] Stopping service...');

        // Clear initialization timeout
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
            this.initTimeout = null;
        }

        // Stop location tracking
        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }

        // Cleanup listeners
        if (this.networkUnsubscribe) {
            this.networkUnsubscribe();
            this.networkUnsubscribe = null;
        }

        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = null;
        }

        // Update state
        this.config.enabled = false;
        this.config.token = null;
        this.config.userId = null;
        this.status.isTracking = false;

        this.notifyListeners();
        console.log('✅ [LocationSync] Service stopped');
    }

    /**
     * Manually trigger location update (for SOS button)
     */
    async captureNow(): Promise<LocationQueueItem | null> {
        console.log('📍 [LocationSync] Manual capture triggered');

        if (!this.config.enabled || !this.config.token) {
            console.warn('⚠️ [LocationSync] Service not initialized');
            return null;
        }

        try {
            const location = await this.getCurrentLocation();
            if (location) {
                await this.enqueueLocation(location);
                await this.attemptSync(); // Try to sync immediately
            }
            return location;
        } catch (error) {
            console.error('❌ [LocationSync] Manual capture failed:', error);
            return null;
        }
    }

    /**
     * Force sync (for manual refresh)
     */
    async forceSyncNow(): Promise<boolean> {
        console.log('🔄 [LocationSync] Force sync requested');
        return await this.attemptSync();
    }

    /**
     * Subscribe to status changes
     */
    subscribe(listener: (status: LocationSyncStatus) => void): () => void {
        this.listeners.add(listener);
        listener(this.getStatus()); // Immediate callback
        return () => this.listeners.delete(listener);
    }

    /**
     * Get current status
     */
    getStatus(): LocationSyncStatus {
        return { ...this.status };
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Start location tracking
     */
    private async startTracking(): Promise<void> {
        if (!this.config.enabled || !this.config.token) {
            console.warn('⚠️ [LocationSync] Cannot start - service not enabled');
            return;
        }

        if (this.status.isTracking) {
            console.log('ℹ️ [LocationSync] Already tracking');
            return;
        }

        try {
            console.log('🎯 [LocationSync] Starting location tracking...');

            // Check permissions
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Location permission denied');
            }

            // Start watching location
            this.locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: this.config.trackingIntervalMs,
                    distanceInterval: 50, // Update every 50 meters
                },
                async (locationData) => {
                    const item: LocationQueueItem = {
                        latitude: locationData.coords.latitude,
                        longitude: locationData.coords.longitude,
                        timestamp: new Date(locationData.timestamp).toISOString(),
                        accuracy: locationData.coords.accuracy ?? undefined,
                        altitude: locationData.coords.altitude ?? undefined,
                        speed: locationData.coords.speed ?? undefined,
                        heading: locationData.coords.heading ?? undefined,
                    };

                    console.log('📍 [LocationSync] New location:', {
                        lat: item.latitude.toFixed(4),
                        lng: item.longitude.toFixed(4),
                    });

                    this.status.lastLocation = item;
                    await this.enqueueLocation(item);
                    await this.attemptSync();
                }
            );

            this.status.isTracking = true;
            this.notifyListeners();
            console.log('✅ [LocationSync] Tracking started');
        } catch (error) {
            console.error('❌ [LocationSync] Failed to start tracking:', error);
            this.status.errors.push(error instanceof Error ? error.message : 'Start failed');
            this.notifyListeners();
        }
    }

    /**
     * Get current location once
     */
    private async getCurrentLocation(): Promise<LocationQueueItem | null> {
        try {
            const locationData = await Promise.race([
                Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced, // Balanced is faster than High
                }),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Location timeout')), 3000)
                )
            ]) as Location.LocationObject;

            return this.formatLocation(locationData)
        } catch (error) {
            console.warn('⚠️ [LocationSync] Current location failed, trying last known:', error);

            try {
                // 2. Fallback: Get last known position (instant)
                const lastKnown = await Location.getLastKnownPositionAsync();
                if (lastKnown) {
                    console.log('✅ [LocationSync] Using last known location');
                    return this.formatLocation(lastKnown);
                }
            } catch (fallbackError) {
                console.error('❌ [LocationSync] Fallback failed:', fallbackError);
            }
            return null;
        }
    }
    private formatLocation(locationData: Location.LocationObject): LocationQueueItem {
        return {
            latitude: locationData.coords.latitude,
            longitude: locationData.coords.longitude,
            timestamp: new Date(locationData.timestamp).toISOString(),
            accuracy: locationData.coords.accuracy ?? undefined,
            altitude: locationData.coords.altitude ?? undefined,
            speed: locationData.coords.speed ?? undefined,
            heading: locationData.coords.heading ?? undefined,
        };
    }
    /**
     * Add location to queue
     */
    private async enqueueLocation(location: LocationQueueItem): Promise<void> {
        try {
            const queue = await this.getQueue();
            queue.push(location);
            await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_QUEUE, JSON.stringify(queue));

            this.status.queueSize = queue.length;
            this.notifyListeners();

            console.log(`💾 [LocationSync] Queued location (total: ${queue.length})`);
        } catch (error) {
            console.error('❌ [LocationSync] Failed to enqueue:', error);
        }
    }

    /**
     * Get location queue
     */
    private async getQueue(): Promise<LocationQueueItem[]> {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_QUEUE);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('❌ [LocationSync] Failed to read queue:', error);
            return [];
        }
    }

    /**
     * Clear location queue
     */
    private async clearQueue(): Promise<void> {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.LOCATION_QUEUE);
            this.status.queueSize = 0;
            this.notifyListeners();
            console.log('🗑️ [LocationSync] Queue cleared');
        } catch (error) {
            console.error('❌ [LocationSync] Failed to clear queue:', error);
        }
    }

    /**
     * Attempt to sync queue with server
     */
    private async attemptSync(): Promise<boolean> {
        if (!this.status.isOnline || !this.config.token) {
            console.log('📴 [LocationSync] Skipping sync (offline or no token)');
            return false;
        }

        try {
            const queue = await this.getQueue();

            if (queue.length === 0) {
                console.log('ℹ️ [LocationSync] Queue empty, nothing to sync');
                return true;
            }

            console.log(`🔄 [LocationSync] Syncing ${queue.length} locations...`);

            // Batch upload
            const batch = queue.slice(0, this.config.batchSize);
            const success = await this.uploadBatch(batch);

            if (success) {
                // Remove uploaded items from queue
                const remaining = queue.slice(batch.length);
                await AsyncStorage.setItem(
                    STORAGE_KEYS.LOCATION_QUEUE,
                    JSON.stringify(remaining)
                );

                this.status.queueSize = remaining.length;
                this.status.lastSync = new Date();
                this.status.errors = [];

                await AsyncStorage.setItem(
                    STORAGE_KEYS.LAST_SYNC,
                    this.status.lastSync.toISOString()
                );

                this.notifyListeners();
                console.log(`✅ [LocationSync] Synced ${batch.length} locations`);

                // Continue if more items remain
                if (remaining.length > 0) {
                    console.log(`🔄 [LocationSync] ${remaining.length} locations remaining...`);
                    setTimeout(() => this.attemptSync(), 2000);
                }

                return true;
            } else {
                console.warn('⚠️ [LocationSync] Upload failed, will retry later');
                return false;
            }
        } catch (error) {
            console.error('❌ [LocationSync] Sync failed:', error);
            this.status.errors.push(error instanceof Error ? error.message : 'Sync failed');
            this.notifyListeners();
            return false;
        }
    }

    /**
     * Upload batch to server
     */
    private async uploadBatch(locations: LocationQueueItem[]): Promise<boolean> {
        if (!this.config.token) {
            return false;
        }

        try {
            const response = await authenticatedFetch('/api/location', {
                method: 'POST',
                requiresAuth: true,
                body: JSON.stringify(locations),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            console.log(`✅ [LocationSync] Uploaded ${locations.length} locations to server`);
            return true;
        } catch (error) {
            console.error('❌ [LocationSync] Upload error:', error);
            return false;
        }
    }

    /**
     * Setup network connectivity listener
     */
    private setupNetworkListener(): void {
        this.networkUnsubscribe = NetworkManager.getInstance().subscribe((isOnline) => {
            console.log(`📡 [LocationSync] Network: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

            const wasOffline = !this.status.isOnline;
            this.status.isOnline = isOnline;
            this.notifyListeners();

            // Auto-sync when coming online
            if (isOnline && wasOffline && this.status.queueSize > 0) {
                console.log('🔄 [LocationSync] Network restored, syncing queue...');
                setTimeout(() => this.attemptSync(), 1000);
            }
        });

        // Set initial status
        this.status.isOnline = NetworkManager.getInstance().getStatus();
    }

    /**
     * Setup app state listener (foreground/background)
     */
    private setupAppStateListener(): void {
        this.appStateSubscription = AppState.addEventListener(
            'change',
            (nextAppState: AppStateStatus) => {
                if (nextAppState === 'active') {
                    console.log('🌟 [LocationSync] App in foreground, attempting sync...');
                    setTimeout(() => this.attemptSync(), 1000);
                } else {
                    console.log('🌙 [LocationSync] App backgrounded');
                }
            }
        );
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(): void {
        this.listeners.forEach((listener) => listener(this.getStatus()));
    }
}

// ==================== SINGLETON EXPORT ====================

export const LocationSyncService = new LocationSyncServiceClass();
export default LocationSyncService;

// ==================== TYPE EXPORTS ====================

export type { LocationQueueItem, LocationSyncConfig, LocationSyncStatus };