/**
 * AsyncStorage Debug Script
 * 
 * Run this to manually check what's in AsyncStorage:
 * 
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * 
 * // Get all keys
 * const keys = await AsyncStorage.getAllKeys();
 * console.log('All AsyncStorage keys:', keys);
 * 
 * // Get emergency contacts
 * const contacts = await AsyncStorage.getItem('emergency_contacts');
 * console.log('Emergency contacts:', contacts);
 * 
 * // Clear emergency contacts (for testing)
 * // await AsyncStorage.removeItem('emergency_contacts');
 */

// You can add this to any component temporarily to debug:

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

export const useAsyncStorageDebug = () => {
    useEffect(() => {
        const debug = async () => {
            try {
                const keys = await AsyncStorage.getAllKeys();
                console.log('📦 [Debug] All AsyncStorage keys:', keys);
                
                const contacts = await AsyncStorage.getItem('emergency_contacts');
                console.log('📇 [Debug] Emergency contacts raw:', contacts);
                
                if (contacts) {
                    const parsed = JSON.parse(contacts);
                    console.log('📇 [Debug] Emergency contacts parsed:', parsed);
                }
            } catch (error) {
                console.error('❌ [Debug] AsyncStorage error:', error);
            }
        };
        debug();
    }, []);
};
