// components/GlobalSyncStatus.tsx
import { syncService } from '@/utils/syncManager';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const GlobalSyncStatus = () => {
    const [state, setState] = useState(syncService.sync.getState());

    useEffect(() => {
        return syncService.sync.subscribe(setState);
    }, []);

    if (!state.isOnline) {
        return (
            <View style={styles.offline}>
                <Text>📴 Offline Mode</Text>
            </View>
        );
    }

    if (state.isSyncing) {
        return (
            <View style={styles.syncing}>
                <Text>🔄 Syncing...</Text>
            </View>
        );
    }

    if (state.pendingOperations > 0) {
        return (
            <View style={styles.pending}>
                <Text>⏳ {state.pendingOperations} changes pending</Text>
            </View>
        );
    }

    return null;
};
const styles = StyleSheet.create({
    offline: {
        backgroundColor: '#ffe4e1',
        padding: 10,
        borderRadius: 8,
        margin: 10,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#ff4d4d',
    },
    syncing: {
        backgroundColor: '#e6f7ff',
        padding: 10,
        borderRadius: 8,
        margin: 10,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#1890ff',
    },
    pending: {
        backgroundColor: '#fffbe6',
        padding: 10,
        borderRadius: 8,
        margin: 10,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#faad14',
    },
    text: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
});
