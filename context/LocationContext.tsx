/**
 * Location Context
 * Global state management for current location and location history
 */

import { STORAGE_KEYS } from '@/constants/storage';
import { LocationHistoryService, LocationPoint } from '@/services/locationHistoryService';
import { StorageService } from '@/services/storage';
import * as Location from 'expo-location';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

// ==================== INTERFACES ====================

export interface CurrentLocation {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
    timestamp?: number;
    address?: string;
}

interface LocationContextType {
    // Current location
    currentLocation: CurrentLocation | null;
    locationError: string | null;
    isLoadingLocation: boolean;
    permissionStatus: Location.PermissionStatus | null;

    // Location history
    locationHistory: LocationPoint[];
    isTracking: boolean;

    // Actions
    requestPermission: () => Promise<Location.PermissionStatus>;
    refreshLocation: (force?: boolean) => Promise<void>;
    startTracking: () => Promise<void>;
    stopTracking: () => Promise<void>;
    refreshHistory: () => Promise<void>;
    clearHistory: () => Promise<void>;
    clearError: () => void;
}

// ==================== CONTEXT ====================

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// ==================== PROVIDER ====================

interface LocationProviderProps {
    children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
    const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
    const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
    const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
    const [isTracking, setIsTracking] = useState<boolean>(false);

    // Check permission on mount
    useEffect(() => {
        checkPermission();
        loadLocationHistory();
        checkTrackingStatus();
    }, []);

    /**
     * Check current permission status
     */
    const checkPermission = useCallback(async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            setPermissionStatus(status);
            return status;
        } catch (error) {
            console.error('Failed to check permission:', error);
            return 'undetermined' as Location.PermissionStatus;
        }
    }, []);

    /**
     * Request location permission
     */
    const requestPermission = useCallback(async (): Promise<Location.PermissionStatus> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setPermissionStatus(status);
            console.log('📍 Location permission:', status);
            return status;
        } catch (error) {
            console.error('Failed to request permission:', error);
            setLocationError('Failed to request location permission');
            return 'denied' as Location.PermissionStatus;
        }
    }, []);

    /**
     * Get current location
     */
    const refreshLocation = useCallback(async (force: boolean = false) => {
        try {
            setIsLoadingLocation(true);
            setLocationError(null);

            // Check permission first
            const status = await checkPermission();
            if (status !== 'granted') {
                setLocationError('Location permission not granted');
                return;
            }

            // Try cache first if not forced
            if (!force) {
                const cachedLocation = await StorageService.getWithExpiry<CurrentLocation>(
                    STORAGE_KEYS.LOCATION_CACHE
                );
                if (cachedLocation) {
                    setCurrentLocation(cachedLocation);
                    console.log('📍 Using cached location');
                    return;
                }
            }

            // Get fresh location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const newLocation: CurrentLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy || undefined,
                altitude: location.coords.altitude || undefined,
                speed: location.coords.speed || undefined,
                heading: location.coords.heading || undefined,
                timestamp: location.timestamp,
            };

            // Reverse geocode
            try {
                const addresses = await Location.reverseGeocodeAsync({
                    latitude: newLocation.latitude,
                    longitude: newLocation.longitude,
                });
                if (addresses && addresses.length > 0) {
                    const addr = addresses[0];
                    newLocation.address = `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
                }
            } catch (geocodeError) {
                console.error('Reverse geocoding failed:', geocodeError);
            }

            setCurrentLocation(newLocation);

            // Cache for 5 minutes
            await StorageService.setWithExpiry(
                STORAGE_KEYS.LOCATION_CACHE,
                newLocation,
                5 * 60 * 1000
            );

            console.log('📍 Location updated:', newLocation.latitude, newLocation.longitude);
        } catch (error: any) {
            console.error('Failed to get location:', error);
            setLocationError(error?.message || 'Failed to get location');
        } finally {
            setIsLoadingLocation(false);
        }
    }, [checkPermission]);

    /**
     * Load location history
     */
    const loadLocationHistory = useCallback(async () => {
        try {
            const history = await LocationHistoryService.getHistory();
            setLocationHistory(history);
            console.log('📍 Loaded location history:', history.length);
        } catch (error) {
            console.error('Failed to load location history:', error);
        }
    }, []);

    /**
     * Check tracking status
     */
    const checkTrackingStatus = useCallback(async () => {
        try {
            const tracking = await LocationHistoryService.isTracking();
            setIsTracking(tracking);
        } catch (error) {
            console.error('Failed to check tracking status:', error);
        }
    }, []);

    /**
     * Start location tracking
     */
    const startTracking = useCallback(async () => {
        try {
            await LocationHistoryService.startTracking();
            setIsTracking(true);
            console.log('📍 Location tracking started');
        } catch (error) {
            console.error('Failed to start tracking:', error);
            setLocationError('Failed to start location tracking');
            throw error;
        }
    }, []);

    /**
     * Stop location tracking
     */
    const stopTracking = useCallback(async () => {
        try {
            await LocationHistoryService.stopTracking();
            setIsTracking(false);
            console.log('📍 Location tracking stopped');
        } catch (error) {
            console.error('Failed to stop tracking:', error);
            setLocationError('Failed to stop location tracking');
            throw error;
        }
    }, []);

    /**
     * Refresh location history
     */
    const refreshHistory = useCallback(async () => {
        await loadLocationHistory();
    }, [loadLocationHistory]);

    /**
     * Clear location history
     */
    const clearHistory = useCallback(async () => {
        try {
            await LocationHistoryService.clearHistory();
            setLocationHistory([]);
            console.log('📍 Location history cleared');
        } catch (error) {
            console.error('Failed to clear history:', error);
            throw error;
        }
    }, []);

    /**
     * Clear error message
     */
    const clearError = useCallback(() => {
        setLocationError(null);
    }, []);

    const value: LocationContextType = {
        currentLocation,
        locationError,
        isLoadingLocation,
        permissionStatus,
        locationHistory,
        isTracking,
        requestPermission,
        refreshLocation,
        startTracking,
        stopTracking,
        refreshHistory,
        clearHistory,
        clearError,
    };

    return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

// ==================== HOOK ====================

export function useLocation(): LocationContextType {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within LocationProvider');
    }
    return context;
}

export default LocationContext;
