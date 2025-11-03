// utils/migration.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SYNC_CONFIG, CacheManager } from './syncManager';

export const migrateOldData = async () => {
    try {
        // Migrate old contacts format
        const oldContacts = await AsyncStorage.getItem('emergency_contacts');
        if (oldContacts) {
            const parsed = JSON.parse(oldContacts);
            await CacheManager.set(SYNC_CONFIG.KEYS.CONTACTS, parsed, false);
            console.log('✅ Migrated contacts');
        }

        // Migrate old user info
        const oldUserInfo = await AsyncStorage.getItem('user_info_cache');
        if (oldUserInfo) {
            const parsed = JSON.parse(oldUserInfo);
            await CacheManager.set(SYNC_CONFIG.KEYS.USER_INFO, parsed.data, false);
            console.log('✅ Migrated user info');
        }

        // Clean up old keys
        await AsyncStorage.multiRemove([
            'emergency_contacts',
            'user_info_cache',
            'contacts_last_sync'
        ]);

        console.log('✅ Migration complete');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
};