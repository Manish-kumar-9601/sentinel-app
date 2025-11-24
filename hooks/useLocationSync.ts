import { useAuth } from '@/context/AuthContext';
import LocationSyncService, { LocationSyncStatus } from "../services/LocationTrackingService";
import { useEffect, useState, useMemo } from 'react';

export function useLocationSync() {
    const { user, token } = useAuth();
    const [status, setStatus] = useState<LocationSyncStatus>(
        LocationSyncService.getStatus()
    );

    // Initialize service when user logs in
    useEffect(() => {
        if (user && token) {
            LocationSyncService.initialize(token, user.id);
        } else {
            LocationSyncService.stop();
        }
        return () => { LocationSyncService.stop(); };
    }, [user, token]);

    useEffect(() => {
        return LocationSyncService.subscribe(setStatus);
    }, []);

    // Helper to determine the "Pill" status
    const connectionStatus = useMemo(() => {
        if (!status.isTracking) return 'idle';
        if (status.errors.length > 0) return 'error';
        if (!status.isOnline) return 'offline';
        if (status.queueSize > 0) return 'syncing';
        return 'tracking';
    }, [status]);

    return {
        // Expose the raw status object
        status, 
        // Derived status for the UI Pill
        connectionStatus,
        // Fix: Alias captureNow to trackLocation so your UI code works
        trackLocation: () => LocationSyncService.captureNow(),
        captureNow: () => LocationSyncService.captureNow(),
        forceSyncNow: () => LocationSyncService.forceSyncNow(),
    };
}

export default useLocationSync;