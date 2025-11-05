// components/GlobalSyncStatus.tsx
import { syncService } from '@/utils/syncManager';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';

export const GlobalSyncStatus = () => {
    const [state, setState] = useState(syncService.sync.getState());
    const { colors } = useThemedStyles();

    useEffect(() => {
        return syncService.sync.subscribe(setState);
    }, []);

    if (!state.isOnline) {
        return (
            <View style={[styles.offline, { backgroundColor: colors.errorLight, borderLeftColor: colors.error }]}>
                <Text style={[styles.text, { color: colors.text }]}>📴 Offline Mode</Text>
            </View>
        );
    }

    if (state.isSyncing) {
        return (
            <View style={[styles.syncing, { backgroundColor: colors.infoLight, borderLeftColor: colors.info }]}>
                <Text style={[styles.text, { color: colors.text }]}>🔄 Syncing...</Text>
            </View>
        );
    }

    if (state.pendingOperations > 0) {
        return (
            <View style={[styles.pending, { backgroundColor: colors.warningLight, borderLeftColor: colors.warning }]}>
                <Text style={[styles.text, { color: colors.text }]}>⏳ {state.pendingOperations} changes pending</Text>
            </View>
        );
    }

    return null;
};
const styles = StyleSheet.create({
    offline: {
        padding: 10,
        borderRadius: 8,
        margin: 10,
        alignItems: 'center',
        borderLeftWidth: 4,
    },
    syncing: {
        padding: 10,
        borderRadius: 8,
        margin: 10,
        alignItems: 'center',
        borderLeftWidth: 4,
    },
    pending: {
        padding: 10,
        borderRadius: 8,
        margin: 10,
        alignItems: 'center',
        borderLeftWidth: 4,
    },
    text: {
        fontSize: 14,
        fontWeight: '500',
    },
});
