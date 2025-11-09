/**
 * Location History Service
 * Tracks and stores user location history in background
 * Uses latest expo-location v18.1.6 and expo-task-manager v13.1.6
 */

import { STORAGE_KEYS } from '@/constants/storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { StorageService } from './storage';

const LOCATION_TASK_NAME = 'background-location-task';
const MAX_HISTORY_POINTS = 1000; // Keep last 1000 location points
const LOCATION_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Types
export interface LocationPoint {
    id: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    speed: number | null;
    heading: number | null;
    timestamp: number;
    address?: string;
}

export interface LocationHistoryStats {
    totalPoints: number;
    firstPoint: LocationPoint | null;
    lastPoint: LocationPoint | null;
    totalDistance: number; // in kilometers
    timeSpan: number; // in milliseconds
}

// Define background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Background location task error:', error);
        return;
    }

    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };

        if (locations && locations.length > 0) {
            const location = locations[0];

            // Save to history
            await LocationHistoryService.addLocationPoint({
                id: `loc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                altitude: location.coords.altitude,
                speed: location.coords.speed,
                heading: location.coords.heading,
                timestamp: location.timestamp,
            });

            console.log('📍 Background location saved:', {
                lat: location.coords.latitude.toFixed(4),
                lng: location.coords.longitude.toFixed(4),
                time: new Date(location.timestamp).toLocaleTimeString(),
            });
        }
    }
});

export class LocationHistoryService {
    /**
     * Initialize and start background location tracking
     * Uses latest expo-location API with background permissions
     */
    static async startTracking(): Promise<boolean> {
        try {
            console.log('🚀 Starting location history tracking...');

            // Request foreground location permission
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

            if (foregroundStatus !== 'granted') {
                console.error('❌ Foreground location permission denied');
                return false;
            }

            console.log('✅ Foreground location permission granted');

            // Request background location permission
            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

            if (backgroundStatus !== 'granted') {
                console.error('❌ Background location permission denied');
                // Still continue with foreground tracking
            } else {
                console.log('✅ Background location permission granted');
            }

            // Check if task is already registered
            const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

            if (isRegistered) {
                console.log('⚠️ Location tracking already running');
                return true;
            }

            // Start location updates in background
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: LOCATION_UPDATE_INTERVAL,
                distanceInterval: 100, // Update every 100 meters
                foregroundService: {
                    notificationTitle: 'Sentinel Active',
                    notificationBody: 'Tracking your location for safety',
                    notificationColor: '#FF0000',
                },
                pausesUpdatesAutomatically: false,
                showsBackgroundLocationIndicator: true,
            });

            console.log('✅ Location history tracking started');
            return true;

        } catch (error) {
            console.error('❌ Error starting location tracking:', error);
            return false;
        }
    }

    /**
     * Stop background location tracking
     */
    static async stopTracking(): Promise<void> {
        try {
            const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

            if (isRegistered) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                console.log('🛑 Location history tracking stopped');
            }
        } catch (error) {
            console.error('Error stopping location tracking:', error);
        }
    }

    /**
     * Check if location tracking is currently active
     */
    static async isTracking(): Promise<boolean> {
        try {
            return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        } catch (error) {
            console.error('Error checking tracking status:', error);
            return false;
        }
    }

    /**
     * Add a location point to history
     */
    static async addLocationPoint(point: LocationPoint): Promise<void> {
        try {
            const history = await this.getHistory();

            // Add new point at the beginning
            history.unshift(point);

            // Keep only last MAX_HISTORY_POINTS
            if (history.length > MAX_HISTORY_POINTS) {
                history.splice(MAX_HISTORY_POINTS);
            }

            await StorageService.setLocationHistory(history);
        } catch (error) {
            console.error('Error adding location point:', error);
        }
    }

    /**
     * Get all location history
     */
    static async getHistory(): Promise<LocationPoint[]> {
        try {
            const history = await StorageService.getLocationHistory();
            return history || [];
        } catch (error) {
            console.error('Error getting location history:', error);
            return [];
        }
    }

    /**
     * Get location history for a specific time range
     */
    static async getHistoryByTimeRange(
        startTime: number,
        endTime: number
    ): Promise<LocationPoint[]> {
        const history = await this.getHistory();
        return history.filter(
            (point) => point.timestamp >= startTime && point.timestamp <= endTime
        );
    }

    /**
     * Get location history for today
     */
    static async getTodayHistory(): Promise<LocationPoint[]> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        return this.getHistoryByTimeRange(startOfDay.getTime(), endOfDay.getTime());
    }

    /**
     * Get location history statistics
     */
    static async getStats(): Promise<LocationHistoryStats> {
        const history = await this.getHistory();

        if (history.length === 0) {
            return {
                totalPoints: 0,
                firstPoint: null,
                lastPoint: null,
                totalDistance: 0,
                timeSpan: 0,
            };
        }

        // Calculate total distance using Haversine formula
        let totalDistance = 0;
        for (let i = 0; i < history.length - 1; i++) {
            const point1 = history[i];
            const point2 = history[i + 1];
            totalDistance += this.calculateDistance(
                point1.latitude,
                point1.longitude,
                point2.latitude,
                point2.longitude
            );
        }

        return {
            totalPoints: history.length,
            firstPoint: history[history.length - 1],
            lastPoint: history[0],
            totalDistance,
            timeSpan: history[0].timestamp - history[history.length - 1].timestamp,
        };
    }

    /**
     * Calculate distance between two points (Haversine formula)
     * Returns distance in kilometers
     */
    static calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
            Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private static toRad(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get address for a location point (reverse geocoding)
     */
    static async getAddressForPoint(
        latitude: number,
        longitude: number
    ): Promise<string | null> {
        try {
            const addresses = await Location.reverseGeocodeAsync({
                latitude,
                longitude,
            });

            if (addresses && addresses.length > 0) {
                const addr = addresses[0];
                return `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''} ${addr.postalCode || ''}`.trim();
            }

            return null;
        } catch (error) {
            console.error('Error getting address:', error);
            return null;
        }
    }

    /**
     * Clear all location history
     */
    static async clearHistory(): Promise<void> {
        try {
            await StorageService.delete(STORAGE_KEYS.LOCATION_HISTORY);
            console.log('🗑️ Location history cleared');
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }

    /**
     * Export location history as GeoJSON
     */
    static async exportAsGeoJSON(): Promise<string> {
        const history = await this.getHistory();

        const features = history.map((point) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [point.longitude, point.latitude],
            },
            properties: {
                id: point.id,
                timestamp: point.timestamp,
                accuracy: point.accuracy,
                altitude: point.altitude,
                speed: point.speed,
                heading: point.heading,
                address: point.address,
            },
        }));

        const geoJSON = {
            type: 'FeatureCollection',
            features,
        };

        return JSON.stringify(geoJSON, null, 2);
    }

    /**
     * Get location heatmap data (for visualization)
     */
    static async getHeatmapData(): Promise<Array<{ latitude: number; longitude: number; weight: number }>> {
        const history = await this.getHistory();

        // Group nearby points and calculate weights
        const grid = new Map<string, { lat: number; lng: number; count: number }>();
        const gridSize = 0.001; // ~100 meters

        history.forEach((point) => {
            const gridLat = Math.floor(point.latitude / gridSize) * gridSize;
            const gridLng = Math.floor(point.longitude / gridSize) * gridSize;
            const key = `${gridLat},${gridLng}`;

            const existing = grid.get(key);
            if (existing) {
                existing.count++;
            } else {
                grid.set(key, { lat: gridLat, lng: gridLng, count: 1 });
            }
        });

        // Convert to heatmap format
        return Array.from(grid.values()).map((cell) => ({
            latitude: cell.lat,
            longitude: cell.lng,
            weight: cell.count,
        }));
    }
}
