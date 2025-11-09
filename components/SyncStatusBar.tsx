import { borderRadius, fontSize, fontWeight, layout, spacing, useTheme } from '@/styles';
import { syncService } from '@/utils/syncManager';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

interface SyncStatusBarProps {
    lastSync?: Date | null;
    onRefresh?: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ lastSync, onRefresh }) => {
    const [state, setState] = useState(syncService.sync.getState());
    const { colors } = useTheme();

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
        if (!state.isOnline) return colors.warning;
        if (state.isSyncing) return colors.info;
        if (state.pendingOperations > 0) return colors.warning;
        return colors.success;
    };

    const getStatusIcon = (): string => {
        if (!state.isOnline) return 'cloud-offline';
        if (state.isSyncing) return 'sync';
        if (state.pendingOperations > 0) return 'cloud-upload';
        return 'cloud-done';
    };

    const getStatusText = (): string => {
        if (!state.isOnline) return 'Offline';
        if (state.isSyncing) return 'Syncing...';
        if (state.pendingOperations > 0) return `${state.pendingOperations} pending`;
        return 'Synced';
    };

    const getBackgroundColor = (): string => {
        if (!state.isOnline) return colors.warningLight;
        if (state.isSyncing) return colors.infoLight;
        if (state.pendingOperations > 0) return colors.warningLight;
        return colors.successLight;
    };

    return (
        <View style={[
            layout.rowBetween,
            {
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.sm,
                marginHorizontal: spacing.sm,
                marginVertical: spacing.xs,
                backgroundColor: getBackgroundColor(),
            }
        ]}>
            <View style={[layout.rowCenter, { gap: spacing.sm }]}>
                {state.isSyncing ? (
                    <ActivityIndicator size="small" color={getStatusColor()} />
                ) : (
                    <Ionicons name={getStatusIcon() as any} size={16} color={getStatusColor()} />
                )}
                <Text style={{
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.semibold,
                    color: getStatusColor()
                }}>
                    {getStatusText()}
                </Text>
            </View>

            <View style={[layout.rowCenter, { gap: spacing.md }]}>
                {lastSync && (
                    <Text style={{
                        fontSize: fontSize.sm,
                        color: colors.textSecondary
                    }}>
                        {formatLastSync(lastSync)}
                    </Text>
                )}
                {onRefresh && (
                    <TouchableOpacity onPress={onRefresh} style={{ padding: spacing.xs }}>
                        <Ionicons name="refresh" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};
