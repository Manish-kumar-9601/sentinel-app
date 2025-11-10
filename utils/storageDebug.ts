/**
 * AsyncStorage Diagnostic Utility
 * 
 * Use this to debug contact persistence issues.
 * Import and call these functions in any component to inspect storage state.
 */

import { STORAGE_KEYS } from '@/services/StorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get all AsyncStorage keys and their values
 */
export const debugAllStorage = async () => {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('🔍 [DEBUG] All AsyncStorage keys:', allKeys);

        const allData: Record<string, string | null> = {};
        for (const key of allKeys) {
            const value = await AsyncStorage.getItem(key);
            allData[key] = value;
        }

        console.log('📦 [DEBUG] All AsyncStorage data:', allData);
        return allData;
    } catch (error) {
        console.error('❌ [DEBUG] Failed to read all storage:', error);
        return null;
    }
};

/**
 * Check emergency contacts storage specifically
 */
export const debugContactsStorage = async () => {
    try {
        console.log('🔍 [DEBUG] Checking emergency contacts storage...');

        // Check primary
        const primary = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
        console.log('📦 [DEBUG] Primary storage:', primary);

        // Check backup
        const backup = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS_BACKUP);
        console.log('📦 [DEBUG] Backup storage:', backup);

        // Check timestamp
        const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS_TIMESTAMP);
        console.log('🕐 [DEBUG] Last saved:', timestamp ? new Date(timestamp).toLocaleString() : 'Never');

        // Parse and compare
        if (primary) {
            const primaryParsed = JSON.parse(primary);
            console.log('✅ [DEBUG] Primary contacts count:', primaryParsed.length);
            console.log('📋 [DEBUG] Primary contacts:', primaryParsed);
        } else {
            console.log('⚠️ [DEBUG] Primary storage is empty');
        }

        if (backup) {
            const backupParsed = JSON.parse(backup);
            console.log('✅ [DEBUG] Backup contacts count:', backupParsed.length);
            console.log('📋 [DEBUG] Backup contacts:', backupParsed);
        } else {
            console.log('⚠️ [DEBUG] Backup storage is empty');
        }

        return { primary, backup, timestamp };
    } catch (error) {
        console.error('❌ [DEBUG] Failed to check contacts storage:', error);
        return null;
    }
};

/**
 * Test write and verify
 */
export const testContactsWrite = async () => {
    try {
        console.log('🧪 [DEBUG] Testing contacts write...');

        const testContact = {
            id: 'test-' + Date.now(),
            name: 'Test Contact',
            phone: '1234567890',
            createdAt: new Date().toISOString(),
            synced: false
        };

        // Write
        await AsyncStorage.setItem(
            STORAGE_KEYS.EMERGENCY_CONTACTS,
            JSON.stringify([testContact])
        );
        console.log('✅ [DEBUG] Write successful');

        // Read back
        const readBack = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
        console.log('📖 [DEBUG] Read back:', readBack);

        if (readBack) {
            const parsed = JSON.parse(readBack);
            console.log('✅ [DEBUG] Parsed successfully:', parsed);
            return true;
        } else {
            console.log('❌ [DEBUG] Read back returned null!');
            return false;
        }
    } catch (error) {
        console.error('❌ [DEBUG] Test failed:', error);
        return false;
    }
};

/**
 * Clear all contacts from storage (for testing)
 */
export const clearContactsStorage = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
        await AsyncStorage.removeItem(STORAGE_KEYS.EMERGENCY_CONTACTS_BACKUP);
        await AsyncStorage.removeItem(STORAGE_KEYS.EMERGENCY_CONTACTS_TIMESTAMP);
        console.log('🗑️ [DEBUG] Contacts storage cleared');
        return true;
    } catch (error) {
        console.error('❌ [DEBUG] Failed to clear storage:', error);
        return false;
    }
};

/**
 * Quick diagnostic - run all checks
 */
export const runFullDiagnostic = async () => {
    console.log('🏥 [DEBUG] Running full diagnostic...');
    console.log('==========================================');

    await debugContactsStorage();
    console.log('------------------------------------------');

    const writeTest = await testContactsWrite();
    console.log('------------------------------------------');

    if (writeTest) {
        console.log('✅ [DEBUG] AsyncStorage is working correctly');
    } else {
        console.log('❌ [DEBUG] AsyncStorage has issues!');
    }

    console.log('==========================================');
};
