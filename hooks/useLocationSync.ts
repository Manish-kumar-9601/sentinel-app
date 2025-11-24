/**
 * Location Sync Integration Hook
 * 
 * Provides easy integration of LocationSyncService with auth state.
 * Automatically starts/stops tracking based on authentication.
 * 
 * Usage:
 * ```typescript
 * import { useLocationSync } from '@/hooks/useLocationSync';
 * 
 * function App() {
 *   const { status, captureNow } = useLocationSync();
 *   
 *   return (
 *     <Button onPress={captureNow} disabled={!status.isTracking}>
 *       Send SOS
 *     </Button>
 *   );
 * }
 * ```
 * 
 * @module useLocationSync
 */

import { useAuth } from '@/context/AuthContext';
import LocationSyncService, { LocationSyncStatus } from ".././services/LocationTrackingService"
import { useEffect, useState } from 'react';

export function useLocationSync() {
    const { user, token } = useAuth();
    const [status, setStatus] = useState<LocationSyncStatus>(
        LocationSyncService.getStatus()
    );

    // Initialize service when user logs in
    useEffect(() => {
        if (user && token) {
            console.log('🔐 [useLocationSync] User authenticated, initializing tracking');
            LocationSyncService.initialize(token, user.id);
        } else {
            console.log('🚪 [useLocationSync] User logged out, stopping tracking');
            LocationSyncService.stop();
        }

        // Cleanup on unmount
        return () => {
            LocationSyncService.stop();
        };
    }, [user, token]);

    // Subscribe to status changes
    useEffect(() => {
        const unsubscribe = LocationSyncService.subscribe(setStatus);
        return unsubscribe;
    }, []);

    return {
        status,
        captureNow: () => LocationSyncService.captureNow(),
        forceSyncNow: () => LocationSyncService.forceSyncNow(),
        isTracking: status.isTracking,
        queueSize: status.queueSize,
        lastLocation: status.lastLocation,
    };
}

export default useLocationSync;