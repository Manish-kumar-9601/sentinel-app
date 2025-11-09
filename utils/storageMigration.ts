/**
 * Storage Migration Script
 * Migrates data from old storage keys to new centralized storage system
 */

import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '@/constants/storage';
import { StorageService } from '@/services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MigrationResult {
    success: boolean;
    migrated: string[];
    failed: string[];
    skipped: string[];
}

export class StorageMigration {
    /**
     * Run full migration
     */
    static async migrate(): Promise<MigrationResult> {
        const result: MigrationResult = {
            success: true,
            migrated: [],
            failed: [],
            skipped: [],
        };

        console.log('🔄 Starting storage migration...');

        // Check if migration already completed
        const migrationCompleted = await StorageService.get(STORAGE_KEYS.MIGRATION_COMPLETED);
        if (migrationCompleted) {
            console.log('✅ Migration already completed');
            return result;
        }

        // Migrate emergency contacts
        await this.migrateEmergencyContacts(result);

        // Migrate user info
        await this.migrateUserInfo(result);

        // Migrate location history
        await this.migrateLocationHistory(result);

        // Migrate evidence
        await this.migrateEvidence(result);

        // Migrate settings
        await this.migrateSettings(result);

        // Migrate sync data
        await this.migrateSyncData(result);

        // Mark migration as complete
        await StorageService.set(STORAGE_KEYS.MIGRATION_COMPLETED, true);
        await StorageService.set(STORAGE_KEYS.MIGRATION_VERSION, '1.0.0');

        console.log('✅ Migration complete:', result);
        return result;
    }

    /**
     * Migrate emergency contacts
     */
    private static async migrateEmergencyContacts(result: MigrationResult): Promise<void> {
        try {
            const oldContacts = await AsyncStorage.getItem(LEGACY_STORAGE_KEYS.CONTACTS_OLD);
            if (oldContacts) {
                const contacts = JSON.parse(oldContacts);
                await StorageService.setEmergencyContacts(contacts);
                result.migrated.push('emergency_contacts');
                console.log('✅ Migrated emergency contacts');
            } else {
                result.skipped.push('emergency_contacts');
            }
        } catch (error) {
            console.error('Failed to migrate emergency contacts:', error);
            result.failed.push('emergency_contacts');
            result.success = false;
        }
    }

    /**
     * Migrate user info
     */
    private static async migrateUserInfo(result: MigrationResult): Promise<void> {
        try {
            const oldUserInfo = await AsyncStorage.getItem(LEGACY_STORAGE_KEYS.USER_INFO_OLD);
            if (oldUserInfo) {
                const userInfo = JSON.parse(oldUserInfo);
                await StorageService.setUserInfo(userInfo);
                result.migrated.push('user_info');
                console.log('✅ Migrated user info');
            } else {
                result.skipped.push('user_info');
            }
        } catch (error) {
            console.error('Failed to migrate user info:', error);
            result.failed.push('user_info');
            result.success = false;
        }
    }

    /**
     * Migrate location history
     */
    private static async migrateLocationHistory(result: MigrationResult): Promise<void> {
        try {
            const oldHistory = await AsyncStorage.getItem(LEGACY_STORAGE_KEYS.LOCATION_HISTORY_OLD);
            if (oldHistory) {
                const history = JSON.parse(oldHistory);
                await StorageService.setLocationHistory(history);
                result.migrated.push('location_history');
                console.log('✅ Migrated location history');
            } else {
                result.skipped.push('location_history');
            }
        } catch (error) {
            console.error('Failed to migrate location history:', error);
            result.failed.push('location_history');
            result.success = false;
        }
    }

    /**
     * Migrate evidence
     */
    private static async migrateEvidence(result: MigrationResult): Promise<void> {
        try {
            // Evidence already uses new key format
            result.skipped.push('evidence');
        } catch (error) {
            console.error('Failed to migrate evidence:', error);
            result.failed.push('evidence');
            result.success = false;
        }
    }

    /**
     * Migrate settings
     */
    private static async migrateSettings(result: MigrationResult): Promise<void> {
        try {
            // Migrate language
            const oldLanguage = await AsyncStorage.getItem(LEGACY_STORAGE_KEYS.LANGUAGE_OLD);
            if (oldLanguage) {
                await StorageService.set(STORAGE_KEYS.LANGUAGE, oldLanguage);
                result.migrated.push('language');
                console.log('✅ Migrated language');
            } else {
                result.skipped.push('language');
            }
        } catch (error) {
            console.error('Failed to migrate settings:', error);
            result.failed.push('settings');
            result.success = false;
        }
    }

    /**
     * Migrate sync data
     */
    private static async migrateSyncData(result: MigrationResult): Promise<void> {
        try {
            // Migrate sync queue
            const oldQueue = await AsyncStorage.getItem(LEGACY_STORAGE_KEYS.SYNC_QUEUE_OLD);
            if (oldQueue) {
                await StorageService.set(STORAGE_KEYS.SYNC_QUEUE, JSON.parse(oldQueue));
                result.migrated.push('sync_queue');
                console.log('✅ Migrated sync queue');
            }

            // Migrate sync state
            const oldState = await AsyncStorage.getItem(LEGACY_STORAGE_KEYS.SYNC_STATE_OLD);
            if (oldState) {
                await StorageService.set(STORAGE_KEYS.SYNC_STATE, JSON.parse(oldState));
                result.migrated.push('sync_state');
                console.log('✅ Migrated sync state');
            }
        } catch (error) {
            console.error('Failed to migrate sync data:', error);
            result.failed.push('sync_data');
            result.success = false;
        }
    }

    /**
     * Cleanup old storage keys (call after migration is verified)
     */
    static async cleanup(): Promise<void> {
        try {
            console.log('🧹 Cleaning up old storage keys...');

            const oldKeys = Object.values(LEGACY_STORAGE_KEYS);
            await AsyncStorage.multiRemove(oldKeys);

            console.log('✅ Cleanup complete');
        } catch (error) {
            console.error('Failed to cleanup old storage:', error);
            throw error;
        }
    }

    /**
     * Rollback migration (in case of issues)
     */
    static async rollback(): Promise<void> {
        try {
            console.log('⏪ Rolling back migration...');

            // Copy new data back to old keys
            const contacts = await StorageService.getEmergencyContacts();
            if (contacts) {
                await AsyncStorage.setItem(LEGACY_STORAGE_KEYS.CONTACTS_OLD, JSON.stringify(contacts));
            }

            const userInfo = await StorageService.getUserInfo();
            if (userInfo) {
                await AsyncStorage.setItem(LEGACY_STORAGE_KEYS.USER_INFO_OLD, JSON.stringify(userInfo));
            }

            // Clear migration flags
            await StorageService.delete(STORAGE_KEYS.MIGRATION_COMPLETED);
            await StorageService.delete(STORAGE_KEYS.MIGRATION_VERSION);

            console.log('✅ Rollback complete');
        } catch (error) {
            console.error('Failed to rollback migration:', error);
            throw error;
        }
    }
}

export default StorageMigration;
