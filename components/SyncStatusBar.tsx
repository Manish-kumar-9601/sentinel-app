import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { syncService } from '@/utils/syncManager';
interface SyncStatusBarProps {
    lastSync?: Date | null;
    onRefresh?: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ lastSync, onRefresh }) => {
    const [state, setState] = useState(syncService.sync.getState());

    useEffect(() => {
        const unsubscribe = syncService.sync.subscribe(setState);
        return () => unsubscribe();
    }, []);

    const formatLastSync = (date: Date | null | undefined): string => {
        if (!date) return 'Never';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    const getStatusColor = (): string => {
        if (!state.isOnline) return '#FF9500';
        if (state.isSyncing) return '#007AFF';
        if (state.pendingOperations > 0) return '#FF9500';
        return '#34C759';
    };

    const getStatusIcon = (): string => {
        if (!state.isOnline) return 'cloud-offline';
        if (state.isSyncing) return 'sync';
        if (state.pendingOperations > 0) return 'cloud-upload';
        return 'cloud-done';
    };

    const getStatusText = (): string => {
        if (!state.isOnline ) return 'Offline';
        if (state.isSyncing) return 'Syncing...';
        if (state.pendingOperations > 0) return `${state.pendingOperations} pending`;
        return 'Synced';
    };

    return (
        <View style={[styles.container, { backgroundColor: getStatusColor() + '15' }]}>
            <View style={styles.leftSection}>
                {state.isSyncing ? (
                    <ActivityIndicator size="small" color={getStatusColor()} />
                ) : (
                    <Ionicons name={getStatusIcon() as any} size={16} color={getStatusColor()} />
                )}
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                    {getStatusText()}
                </Text>
            </View>

            <View style={styles.rightSection}>
                {lastSync && (
                    <Text style={styles.lastSyncText}>{formatLastSync(lastSync)}</Text>
                )}
                {onRefresh && (
                    <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                        <Ionicons name="refresh" size={16} color="#666" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginHorizontal: 10,
        marginVertical: 4,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    lastSyncText: {
        fontSize: 12,
        color: '#666',
    },
    refreshButton: {
        padding: 4,
    },
});
