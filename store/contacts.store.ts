/**
 * Contacts Store
 * 
 * Manages emergency contacts with local persistence and server sync.
 * Separated from global store for better performance.
 * 
 * @module ContactsStore
 */

import { StorageService, type EmergencyContact } from '@/services/StorageService';
import { safeJSONStringify } from '@/utils/safeJSON';
import Constants from 'expo-constants';
import { create } from 'zustand';

// ==================== TYPES ====================

export interface ContactsState {
    // State
    contacts: EmergencyContact[];
    isLoading: boolean;
    error: string | null;
    lastSync: Date | null;

    // Actions
    loadContacts: () => Promise<void>;
    addContact: (contact: EmergencyContact) => Promise<void>;
    updateContact: (id: string, updates: Partial<EmergencyContact>) => Promise<void>;
    removeContact: (id: string) => Promise<void>;
    fetchFromServer: (token: string) => Promise<EmergencyContact[]>;
    syncToServer: (token: string) => Promise<boolean>;
    clearContacts: () => Promise<void>;
}

// ==================== STORE IMPLEMENTATION ====================

export const useContactsStore = create<ContactsState>((set, get) => ({
    // ==================== INITIAL STATE ====================
    contacts: [],
    isLoading: false,
    error: null,
    lastSync: null,

    // ==================== ACTIONS ====================

    /**
     * Load contacts from local storage or server
     */
    loadContacts: async () => {
        try {
            console.log('🔄 [ContactsStore] Loading contacts...');
            set({ isLoading: true, error: null });

            // Load from AsyncStorage
            let contacts = await StorageService.getEmergencyContacts();
            console.log('📦 [ContactsStore] Loaded', contacts.length, 'contacts from storage');

            set({
                contacts,
                isLoading: false,
            });

            console.log('✅ [ContactsStore] Contacts loaded');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load contacts';
            set({
                isLoading: false,
                error: errorMessage,
            });
            console.error('❌ [ContactsStore] Failed to load contacts:', error);
        }
    },

    /**
     * Add a new emergency contact
     */
    addContact: async (contact) => {
        try {
            const { contacts } = get();
            console.log('📝 [ContactsStore] Adding contact:', contact.name);

            // Check for duplicates
            if (contacts.some(c => c.id === contact.id)) {
                throw new Error('Contact already exists');
            }

            // Update state optimistically
            const updatedContacts = [...contacts, contact];
            set({ contacts: updatedContacts });

            // Persist to AsyncStorage
            await StorageService.setEmergencyContacts(updatedContacts);
            console.log('💾 [ContactsStore] Contact persisted');

            // Verify write
            const verifyContacts = await StorageService.getEmergencyContacts();
            if (verifyContacts.length !== updatedContacts.length) {
                throw new Error('Storage verification failed');
            }
//  Auto-sync to server
            const token = await StorageService.getAuthToken();
            if (token) {
                // Run in background (don't await) to keep UI snappy
                get().syncToServer(token).catch(err => 
                    console.warn('⚠️ [ContactsStore] Background sync failed:', err)
                );
            }
            console.log('✅ [ContactsStore] Contact added:', contact.name);
        } catch (error) {
            console.error('❌ [ContactsStore] Failed to add contact:', error);
            // Rollback
            await get().loadContacts();
            throw error;
        }
    },

    /**
     * Update an existing contact
     */
    updateContact: async (id, updates) => {
        try {
            const { contacts } = get();
            console.log('📝 [ContactsStore] Updating contact:', id);

            const updatedContacts = contacts.map(contact =>
                contact.id === id ? { ...contact, ...updates } : contact
            );

            // Update state optimistically
            set({ contacts: updatedContacts });

            // Persist to storage
            await StorageService.setEmergencyContacts(updatedContacts);

            console.log('✅ [ContactsStore] Contact updated:', id);
        } catch (error) {
            console.error('❌ [ContactsStore] Failed to update contact:', error);
            // Rollback
            await get().loadContacts();
            throw error;
        }
    },

    /**
     * Remove a contact
     */
    removeContact: async (id) => {
        try {
            const { contacts } = get();
            console.log('🗑️ [ContactsStore] Removing contact:', id);

            const updatedContacts = contacts.filter(contact => contact.id !== id);

            // Update state optimistically
            set({ contacts: updatedContacts });

            // Persist to storage
            await StorageService.setEmergencyContacts(updatedContacts);

            console.log('✅ [ContactsStore] Contact removed:', id);
        } catch (error) {
            console.error('❌ [ContactsStore] Failed to remove contact:', error);
            // Rollback
            await get().loadContacts();
            throw error;
        }
    },

    /**
     * Fetch contacts from server
     */
    fetchFromServer: async (token) => {
        try {
            console.log('📥 [ContactsStore] Fetching from server...');

            const env = process.env.NODE_ENV;
            const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';

            if (!apiUrl && env === 'production') {
                console.log('⚠️ [ContactsStore] API URL not configured');
                return [];
            }

            const response = await fetch(`${apiUrl}/api/user-info`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const serverContacts = data.emergencyContacts || [];

            // Transform to match EmergencyContact type
            const formattedContacts: EmergencyContact[] = serverContacts.map((c: any) => ({
                id: c.id || String(Date.now() + Math.random()),
                name: c.name || '',
                phone: c.phone || '',
            }));

            console.log('✅ [ContactsStore] Fetched', formattedContacts.length, 'contacts');
            return formattedContacts;

        } catch (error) {
            console.error('❌ [ContactsStore] Failed to fetch from server:', error);
            throw error;
        }
    },

    /**
     * Sync contacts to server
     */
    syncToServer: async (token) => {
        try {
            const { contacts } = get();
            console.log('☁️ [ContactsStore] Syncing to server...');

            const env = process.env.NODE_ENV;
            const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';

            if (!apiUrl && env === 'production') {
                throw new Error('API URL not configured');
            }

            // Get current user info
            const userInfoResponse = await fetch(`${apiUrl}/api/user-info`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!userInfoResponse.ok) {
                throw new Error('Failed to get current user info');
            }

            const currentData = await userInfoResponse.json();

            // Prepare sync payload
            const payload = {
                userInfo: currentData.userInfo,
                medicalInfo: currentData.medicalInfo,
                emergencyContacts: contacts.map(c => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                })),
                lastUpdated: new Date().toISOString(),
            };

            const response = await fetch(`${apiUrl}/api/user-info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: safeJSONStringify(payload, 'sync_contacts'),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            set({ lastSync: new Date() });
            console.log('✅ [ContactsStore] Synced to server');
            return true;

        } catch (error) {
            console.error('❌ [ContactsStore] Sync failed:', error);
            return false;
        }
    },

    /**
     * Clear all contacts (on logout)
     */
    clearContacts: async () => {
        try {
            set({ contacts: [], error: null });
            await StorageService.setEmergencyContacts([]);
            console.log('✅ [ContactsStore] Contacts cleared');
        } catch (error) {
            console.error('❌ [ContactsStore] Failed to clear contacts:', error);
        }
    },
}));
