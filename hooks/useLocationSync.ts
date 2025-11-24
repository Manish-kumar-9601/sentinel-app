/**
 * ============================================================================
 * PRODUCTION-READY LOCATION SYNC HOOK
 * ============================================================================
 * 
 * Features:
 * - Auth-gated initialization (only when user is logged in)
 * - Performance-optimized with useMemo and useCallback
 * - Automatic cleanup on unmount
 * - Type-safe with no 'any' types
 * - Zero unnecessary re-renders
 * 
 * @module useLocationSync
 */

import { useAuth } from '@/context/AuthContext';
import LocationSyncService, { LocationSyncStatus } from '../services/LocationTrackingService';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ==================== TYPES ====================

type ConnectionStatus = 'tracking' | 'syncing' | 'idle' | 'error' | 'offline';

interface UseLocationSyncReturn {
    // Status
    status: LocationSyncStatus;
    connectionStatus: ConnectionStatus;
    
    // Actions
    trackLocation: () => Promise<void>;
    captureNow: () => Promise<void>;
    forceSyncNow: () => Promise<void>;
}

// ==================== HOOK IMPLEMENTATION ====================

/**
 * ✅ AUTH-GATED: Hook to manage location tracking
 * Only initializes when user is authenticated (has token and userId)
 */
export function useLocationSync(): UseLocationSyncReturn {
    const { user, token } = useAuth();
    
    // ✅ OPTIMIZED: Single state for status (reduces re-renders)
    const [status, setStatus] = useState<LocationSyncStatus>(
        LocationSyncService.getStatus()
    );

    // ==================== INITIALIZATION & CLEANUP ====================

    /**
     * ✅ AUTH-GATED: Initialize service when user logs in
     * Automatically stops when user logs out
     */
    useEffect(() => {
        console.log('🔄 [useLocationSync] Auth state changed:', { 
            hasUser: !!user, 
            hasToken: !!token 
        });

        // ✅ STRICT AUTH CHECK
        if (user && token) {
            console.log('✅ [useLocationSync] Initializing service for user:', user.id);
            LocationSyncService.initialize(token, user.id);
        } else {
            console.log('⚠️ [useLocationSync] No auth, stopping service');
            LocationSyncService.stop();
        }

        // ✅ CLEANUP: Stop service on unmount or auth change
        return () => {
            console.log('🧹 [useLocationSync] Cleaning up service');
            LocationSyncService.stop();
        };
    }, [user, token]);

    /**
     * ✅ PERFORMANCE: Subscribe to status changes (single subscription)
     */
    useEffect(() => {
        console.log('📡 [useLocationSync] Subscribing to status updates');
        
        const unsubscribe = LocationSyncService.subscribe((newStatus) => {
            setStatus(newStatus);
        });

        // ✅ CLEANUP: Unsubscribe on unmount
        return () => {
            console.log('🧹 [useLocationSync] Unsubscribing from status updates');
            unsubscribe();
        };
    }, []); // Empty deps - only subscribe once

    // ==================== DERIVED STATE ====================

    /**
     * ✅ OPTIMIZED: Memoized connection status for UI
     * Only recalculates when status changes
     */
    const connectionStatus: ConnectionStatus = useMemo(() => {
        // Not tracking at all
        if (!status.isTracking) {
            return 'idle';
        }

        // Has errors
        if (status.errors.length > 0) {
            return 'error';
        }

        // Offline
        if (!status.isOnline) {
            return 'offline';
        }

        // Has pending uploads
        if (status.queueSize > 0) {
            return 'syncing';
        }

        // Actively tracking
        return 'tracking';
    }, [status]);

    // ==================== ACTIONS ====================

    /**
     * ✅ PERFORMANCE: Memoized action to trigger location capture
     * Prevents function recreation on every render
     */
    const trackLocation = useCallback(async (): Promise<void> => {
        console.log('📍 [useLocationSync] Track location requested');
        
        // ✅ STRICT AUTH CHECK
        if (!token) {
            console.warn('⚠️ [useLocationSync] Cannot track location - no token');
            return;
        }

        try {
            await LocationSyncService.captureNow();
        } catch (error) {
            console.error('❌ [useLocationSync] Track location failed:', error);
        }
    }, [token]);

    /**
     * ✅ ALIAS: Alternative name for trackLocation (for backwards compatibility)
     */
    const captureNow = useCallback(async (): Promise<void> => {
        await trackLocation();
    }, [trackLocation]);

    /**
     * ✅ PERFORMANCE: Memoized action to force sync
     */
    const forceSyncNow = useCallback(async (): Promise<void> => {
        console.log('🔄 [useLocationSync] Force sync requested');
        
        // ✅ STRICT AUTH CHECK
        if (!token) {
            console.warn('⚠️ [useLocationSync] Cannot sync - no token');
            return;
        }

        try {
            await LocationSyncService.forceSyncNow();
        } catch (error) {
            console.error('❌ [useLocationSync] Force sync failed:', error);
        }
    }, [token]);

    // ==================== RETURN ====================

    return {
        // Status
        status,
        connectionStatus,
        
        // Actions
        trackLocation,
        captureNow,
        forceSyncNow,
    };
}

export default useLocationSync;