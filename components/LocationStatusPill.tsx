/**
 * LocationStatusPill Component
 * 
 * Lightweight status indicator for location tracking.
 * Performance-optimized with React.memo and minimal re-renders.
 * 
 * Usage:
 *   <LocationStatusPill status={locationSyncStatus} />
 * 
 * @module components/LocationStatusPill
 */

import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// ==================== TYPES ====================

type LocationStatus = 'tracking' | 'syncing' | 'idle' | 'error';

interface LocationStatusPillProps {
    status?: LocationStatus;
}

interface StatusConfig {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    backgroundColor: string;
    text: string;
    showSpinner?: boolean;
}

// ==================== COMPONENT ====================

export const LocationStatusPill: React.FC<LocationStatusPillProps> = React.memo(({ status = 'idle' }) => {
    const { colors } = useTheme();

    // ✅ OPTIMIZATION: Memoize status configuration
    const config = useMemo((): StatusConfig => {
        switch (status) {
            case 'tracking':
                return {
                    icon: 'location',
                    color: colors.success,
                    backgroundColor: colors.successLight,
                    text: 'Tracking',
                    showSpinner: false,
                };
            case 'syncing':
                return {
                    icon: 'cloud-upload',
                    color: colors.info,
                    backgroundColor: colors.infoLight,
                    text: 'Syncing',
                    showSpinner: true,
                };
            case 'error':
                return {
                    icon: 'alert-circle',
                    color: colors.error,
                    backgroundColor: colors.errorLight,
                    text: 'Error',
                    showSpinner: false,
                };
            case 'idle':
            default:
                return {
                    icon: 'location-outline',
                    color: colors.textTertiary,
                    backgroundColor: colors.backgroundTertiary,
                    text: 'Idle',
                    showSpinner: false,
                };
        }
    }, [status, colors]);

    // Don't render if idle (reduce visual noise)
    if (status === 'idle') {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
            {config.showSpinner ? (
                <ActivityIndicator size="small" color={config.color} />
            ) : (
                <Ionicons name={config.icon} size={12} color={config.color} />
            )}
            <Text style={[styles.text, { color: config.color }]}>
                {config.text}
            </Text>
        </View>
    );
});

LocationStatusPill.displayName = 'LocationStatusPill';

// ==================== STYLES ====================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    text: {
        fontSize: 11,
        fontWeight: '600',
    },
});

export default LocationStatusPill;