// components/SyncStatusBar.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NetworkStatusManager, OfflineQueueManager } from '@/utils/enhancedDataSync';

interface SyncStatusBarProps {
    lastSync?: Date | null;
    onRefresh?: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ lastSync, onRefresh }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const networkManager = NetworkStatusManager.getInstance();
        const queueManager = OfflineQueueManager.getInstance();

        // Subscribe to network status
        const unsubscribe = networkManager.subscribe((online) => {
            setIsOnline(online);
        });

        // Update queue status periodically
        const interval = setInterval(() => {
            const status = queueManager.getStatus();
            setPendingCount(status.count);
            setIsProcessing(status.processing);
        }, 1000);

        // Initial state
        setIsOnline(networkManager.getStatus());
        const status = queueManager.getStatus();
        setPendingCount(status.count);
        setIsProcessing(status.processing);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
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
        if (!isOnline) return '#FF9500'; // Orange for offline
        if (isProcessing) return '#007AFF'; // Blue for syncing
        if (pendingCount > 0) return '#FF9500'; // Orange for pending
        return '#34C759'; // Green for synced
    };

    const getStatusIcon = (): string => {
        if (!isOnline) return 'cloud-offline';
        if (isProcessing) return 'sync';
        if (pendingCount > 0) return 'cloud-upload';
        return 'cloud-done';
    };

    const getStatusText = (): string => {
        if (!isOnline) return 'Offline';
        if (isProcessing) return 'Syncing...';
        if (pendingCount > 0) return `${pendingCount} pending`;
        return 'Synced';
    };

    return (
        <View style={[styles.container, { backgroundColor: getStatusColor() + '15' }]}>
            <View style={styles.leftSection}>
                {isProcessing ? (
                    <ActivityIndicator size="small" color={getStatusColor()} />
                ) : (
                    <Ionicons
                        name={getStatusIcon() as any}
                        size={16}
                        color={getStatusColor()}
                    />
                )}
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                    {getStatusText()}
                </Text>
            </View>

            <View style={styles.rightSection}>
                {lastSync && (
                    <Text style={styles.lastSyncText}>
                        {formatLastSync(lastSync)}
                    </Text>
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