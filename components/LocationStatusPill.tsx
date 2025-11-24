import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface LocationStatusPillProps {
    status: 'tracking' | 'syncing' | 'idle' | 'error' | 'offline';
    queueSize?: number;
}

export const LocationStatusPill: React.FC<LocationStatusPillProps> = React.memo(({ status = 'idle', queueSize = 0 }) => {
    const { colors } = useTheme();

    const config = useMemo(() => {
        switch (status) {
            case 'tracking':
                return {
                    icon: 'radio-button-on',
                    color: '#fff',
                    backgroundColor: colors.success, // Green
                    text: 'Live Tracking',
                };
            case 'syncing':
                return {
                    icon: 'cloud-upload',
                    color: '#fff',
                    backgroundColor: colors.info, // Blue
                    text: `Syncing (${queueSize})`,
                    isLoading: true
                };
            case 'offline':
                return {
                    icon: 'cloud-offline',
                    color: '#000',
                    backgroundColor: colors.warning, // Yellow
                    text: `Offline (Queued: ${queueSize})`,
                };
            case 'error':
                return {
                    icon: 'alert-circle',
                    color: '#fff',
                    backgroundColor: colors.error, // Red
                    text: 'Sync Error',
                };
            default:
                return null;
        }
    }, [status, queueSize, colors]);

    if (!config) return null;

    return (
        <View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
            {config.isLoading ? (
                <ActivityIndicator size="small" color={config.color} style={{ marginRight: 4 }} />
            ) : (
                <Ionicons name={config.icon as any} size={14} color={config.color} style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.text, { color: config.color }]}>
                {config.text}
            </Text>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 10,
    },
    text: {
        fontSize: 12,
        fontWeight: '700',
    },
});

export default LocationStatusPill;