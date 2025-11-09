// components/GlobalSyncStatus.tsx
import { borderRadius, fontSize, fontWeight, spacing, useTheme } from '@/styles';
import { syncService } from '@/utils/syncManager';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export const GlobalSyncStatus = () => {
    const [state, setState] = useState(syncService.sync.getState());
    const { colors } = useTheme();

    useEffect(() => {
        return syncService.sync.subscribe(setState);
    }, []);

    const baseStyle = {
        padding: spacing.sm,
        borderRadius: borderRadius.sm,
        margin: spacing.sm,
        alignItems: 'center' as const,
        borderLeftWidth: 4,
    };

    const textStyle = {
        fontSize: fontSize.base,
        fontWeight: fontWeight.medium,
        color: colors.text,
    };

    if (!state.isOnline) {
        return (
            <View style={[baseStyle, { backgroundColor: colors.errorLight, borderLeftColor: colors.error }]}>
                <Text style={textStyle}>📴 Offline Mode</Text>
            </View>
        );
    }

    if (state.isSyncing) {
        return (
            <View style={[baseStyle, { backgroundColor: colors.infoLight, borderLeftColor: colors.info }]}>
                <Text style={textStyle}>🔄 Syncing...</Text>
            </View>
        );
    }

    if (state.pendingOperations > 0) {
        return (
            <View style={[baseStyle, { backgroundColor: colors.warningLight, borderLeftColor: colors.warning }]}>
                <Text style={textStyle}>⏳ {state.pendingOperations} changes pending</Text>
            </View>
        );
    }

    return null;
};
