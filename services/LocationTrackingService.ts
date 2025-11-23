// services/LocationTrackingService.ts
import { api as apiClient } from '@/utils/apiClient'; // Assuming you have an API client
import { NetworkManager, OfflineQueueManager } from '@/utils/syncManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';

class LocationTrackingService {
    private static instance: LocationTrackingService;
    private isTracking = false;
    private appStateSubscription: NativeEventSubscription | null = null;
    private offlineQueueManager = OfflineQueueManager.getInstance();

    private constructor() {
        this.handleAppStateChange = this.handleAppStateChange.bind(this);
    }

    public static getInstance(): LocationTrackingService {
        if (!LocationTrackingService.instance) {
            LocationTrackingService.instance = new LocationTrackingService();
        }
        return LocationTrackingService.instance;
    }

    private async isUserAuthorized(auth: { user: any; token: string }): Promise<boolean> {
        return !!auth.user && !!auth.token;
    }

    public async startTracking(auth: { user: any; token: string }) {
        if (this.isTracking) {
            console.log('Location tracking is already active.');
            return;
        }

        const isAuthorized = await this.isUserAuthorized(auth);
        if (!isAuthorized) {
            console.warn('User is not authorized. Retrying location tracking in 1 hour.');
            setTimeout(() => this.startTracking(auth), 3600000); // Retry after 1 hour
            return;
        }

        console.log('Starting location tracking...');
        this.isTracking = true;

        // Delay the tracker to avoid blocking other functions
        setTimeout(async () => {
            this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
            await this.trackLocation(auth); // Pass auth to trackLocation
        }, 5000); // Delay by 5 seconds
    }

    public stopTracking() {
        if (!this.isTracking) {
            console.log('Location tracking is not active.');
            return;
        }

        console.log('Stopping location tracking...');
        this.isTracking = false;
        this.appStateSubscription?.remove();
        this.appStateSubscription = null;
    }

    private handleAppStateChange(nextAppState: AppStateStatus, auth: { user: any; token: string }) {
        if (nextAppState === 'active') {
            console.log('App has come to the foreground, tracking location.');
            this.trackLocation(auth); // Pass auth to trackLocation
        }
    }

    public async trackLocation(auth: { user: any; token: string }) {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.error('Location permission not granted.');
                return;
            }

            // Example of using auth in trackLocation
            if (!auth.user || !auth.token) {
                console.warn('User is not authorized. Skipping location update.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const locationData = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                timestamp: new Date().toISOString(),
            };

            if (NetworkManager.getInstance().getStatus()) {
                await this.sendLocationToServer(locationData);
            } else {
                await this.queueLocation(locationData);
            }
        } catch (error) {
            console.error('Error tracking location:', error);
        }
    }

    private async sendLocationToServer(locationData: any) {
        try {
            const isAuthorized = await this.isUserAuthorized();
            if (!isAuthorized) {
                console.warn('User is not authorized. Skipping location update.');
                return;
            }

            console.log('Sending location to server:', locationData);
            await apiClient.post('/location', locationData);
        } catch (error) {
            console.error('Failed to send location to server, queueing instead.', error);
            await this.queueLocation(locationData);
        }
    }

    private async queueLocation(locationData: any) {
        console.log('Queueing location data:', locationData);
        const userId = await this.getUserId();
        await this.offlineQueueManager.add({
            entity: 'LOCATION',
            data: { ...locationData, userId },
            type: 'UPDATE',
            token: '', // Placeholder for token
        });
    }

    private async getUserId(): Promise<string | null> {
        // Replace with actual logic to fetch the user ID from auth context or storage
        const authData = await AsyncStorage.getItem('auth_data');
        if (!authData) return null;

        const { userId } = JSON.parse(authData);
        return userId || null;
    }

    public async syncOfflineLocations() {
        const queue = await OfflineQueueManager.getQueue('LOCATION_UPDATE');
        if (queue.length === 0) {
            console.log('No offline locations to sync.');
            return;
        }

        console.log('Syncing offline locations:', queue);
        for (const operation of queue) {
            try {
                await this.sendLocationToServer(operation.data);
                await OfflineQueueManager.remove(operation.timestamp); // Corrected to use the static method
            } catch (error) {
                console.error('Error syncing location:', error);
            }
        }
    }
}

export default LocationTrackingService.getInstance();
