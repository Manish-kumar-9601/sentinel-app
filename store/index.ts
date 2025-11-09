/**
 * Global State Store
 * 
 * Centralized state management using Zustand.
 * Handles in-memory state, persistence, and database syncing.
 * 
 * Architecture:
 * - Zustand for reactive state
 * - StorageService for persistence
 * - SyncManager for offline/online sync
 * - Type-safe with TypeScript
 * 
 * @module GlobalStore
 */

import { StorageService, type EmergencyContact, type User } from '@/services/StorageService';
import { NetworkManager, OfflineQueueManager } from '@/utils/syncManager';
import Constants from 'expo-constants';
import { create } from 'zustand';

// ==================== TYPES ====================

export interface UserSettings {
    language: string;
    themeMode: 'light' | 'dark' | 'system';
    apiKey: string | null;
    guestMode: boolean;
}

export interface FakeCallSettings {
    name: string;
    number: string;
    ringtoneUri: string | null;
}

export interface SyncStatus {
    isOnline: boolean;
    isSyncing: boolean;
    lastSync: Date | null;
    pendingChanges: number;
    error: string | null;
}

export interface GlobalState {
    // ==================== USER & AUTH ====================
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;

    // ==================== EMERGENCY CONTACTS ====================
    emergencyContacts: EmergencyContact[];
    contactsLoading: boolean;
    contactsError: string | null;

    // ==================== SETTINGS ====================
    settings: UserSettings;
    fakeCallSettings: FakeCallSettings;

    // ==================== SYNC STATUS ====================
    syncStatus: SyncStatus;

    // ==================== ACTIONS ====================
    // Auth Actions
    setAuth: (user: User | null, token: string | null) => Promise<void>;
    clearAuth: () => Promise<void>;

    // Contact Actions
    loadContacts: () => Promise<void>;
    addContact: (contact: EmergencyContact) => Promise<void>;
    updateContact: (id: string, updates: Partial<EmergencyContact>) => Promise<void>;
    removeContact: (id: string) => Promise<void>;
    fetchContactsFromServer: (token: string) => Promise<EmergencyContact[]>;
    syncContactsToServer: (token: string) => Promise<boolean>;

    // Settings Actions
    updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
    updateFakeCallSettings: (updates: Partial<FakeCallSettings>) => Promise<void>;

    // Sync Actions
    initializeSync: () => Promise<void>;
    forceSyncAll: (token: string) => Promise<void>;
}

// ==================== STORE IMPLEMENTATION ====================

export const useGlobalStore = create<GlobalState>((set, get) => ({
    // ==================== INITIAL STATE ====================
    user: null,
    token: null,
    isAuthenticated: false,

    emergencyContacts: [],
    contactsLoading: false,
    contactsError: null,

    settings: {
        language: 'en',
        themeMode: 'system',
        apiKey: null,
        guestMode: false,
    },

    fakeCallSettings: {
        name: '',
        number: '',
        ringtoneUri: null,
    },

    syncStatus: {
        isOnline: true,
        isSyncing: false,
        lastSync: null,
        pendingChanges: 0,
        error: null,
    },

    // ==================== AUTH ACTIONS ====================

    setAuth: async (user, token) => {
        try {
            // Update state immediately (optimistic)
            set({
                user,
                token,
                isAuthenticated: !!(user && token),
            });

            // Persist to secure storage
            if (token) {
                await StorageService.setAuthToken(token);
            } else {
                await StorageService.clearAuthToken();
            }

            if (user) {
                await StorageService.setUserData(user);
            } else {
                await StorageService.clearUserData();
            }

            console.log('✅ [Store] Auth updated');
        } catch (error) {
            console.error('❌ [Store] Failed to set auth:', error);
            throw error;
        }
    },

    clearAuth: async () => {
        try {
            // Clear state
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                emergencyContacts: [],
            });

            // Clear storage
            await StorageService.clearAuthData();

            console.log('✅ [Store] Auth cleared');
        } catch (error) {
            console.error('❌ [Store] Failed to clear auth:', error);
            throw error;
        }
    },

    // ==================== CONTACT ACTIONS ====================

    loadContacts: async () => {
        try {
            console.log('🔄 [Store] Loading contacts from storage...');
            console.log('📊 [Store] Current state before load:', {
                currentContactsCount: get().emergencyContacts.length,
                loading: get().contactsLoading
            });
            set({ contactsLoading: true, contactsError: null });

            // Step 1: Try to load from AsyncStorage (local cache)
            let contacts = await StorageService.getEmergencyContacts();
            console.log('📦 [Store] Retrieved from AsyncStorage:', contacts.length, 'contacts');

            // Step 2: If no contacts in AsyncStorage, try to fetch from database/server
            if (contacts.length === 0) {
                console.log('⚠️ [Store] No contacts in AsyncStorage, attempting to fetch from server...');
                const { token } = get();

                if (token) {
                    try {
                        const serverContacts = await get().fetchContactsFromServer(token);
                        if (serverContacts && serverContacts.length > 0) {
                            console.log('📥 [Store] Fetched', serverContacts.length, 'contacts from server');
                            contacts = serverContacts;

                            // Save to AsyncStorage for future use
                            await StorageService.setEmergencyContacts(serverContacts);
                            console.log('💾 [Store] Server contacts cached to AsyncStorage');
                        } else {
                            console.log('ℹ️ [Store] No contacts found on server');
                        }
                    } catch (serverError) {
                        console.error('❌ [Store] Failed to fetch from server:', serverError);
                        // Continue with empty array - don't throw, let user add contacts
                    }
                } else {
                    console.log('ℹ️ [Store] No auth token, cannot fetch from server');
                }
            }

            console.log('📋 [Store] Contact details:', JSON.stringify(contacts, null, 2));

            set({
                emergencyContacts: contacts,
                contactsLoading: false,
            });

            console.log(`✅ [Store] Loaded ${contacts.length} contacts into state`);
            console.log('📊 [Store] Final state after load:', {
                contactsCount: get().emergencyContacts.length,
                loading: get().contactsLoading
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load contacts';
            set({
                contactsLoading: false,
                contactsError: errorMessage,
            });
            console.error('❌ [Store] Failed to load contacts:', error);
        }
    },

    addContact: async (contact) => {
        try {
            const { emergencyContacts } = get();
            console.log('📝 [Store] Adding contact:', contact.name, 'Current count:', emergencyContacts.length);

            // Check for duplicates
            if (emergencyContacts.some(c => c.id === contact.id)) {
                throw new Error('Contact already exists');
            }

            // Update state optimistically
            const updatedContacts = [...emergencyContacts, contact];
            set({ emergencyContacts: updatedContacts });
            console.log('✅ [Store] State updated, new count:', updatedContacts.length);

            // Persist to AsyncStorage (critical - must succeed)
            await StorageService.setEmergencyContacts(updatedContacts);
            console.log('💾 [Store] Persisted to AsyncStorage');

            // Verify write was successful
            const verifyContacts = await StorageService.getEmergencyContacts();
            if (verifyContacts.length !== updatedContacts.length) {
                throw new Error('AsyncStorage verification failed - contact not saved');
            }
            console.log('✅ [Store] AsyncStorage write verified');

            // Sync to server (best effort - don't fail if offline)
            const { token, syncStatus } = get();
            if (token && syncStatus.isOnline) {
                try {
                    await get().syncContactsToServer(token);
                    console.log('☁️ [Store] Contact synced to server');
                } catch (syncError) {
                    console.warn('⚠️ [Store] Server sync failed, but contact saved locally:', syncError);
                    // Don't throw - local save succeeded
                }
            } else {
                console.log('ℹ️ [Store] Contact saved locally, will sync when online');
            }

            console.log('✅ [Store] Contact added successfully:', contact.name);
        } catch (error) {
            console.error('❌ [Store] Failed to add contact:', error);
            // Rollback on error
            await get().loadContacts();
            throw error;
        }
    },

    updateContact: async (id, updates) => {
        try {
            const { emergencyContacts } = get();

            const updatedContacts = emergencyContacts.map(contact =>
                contact.id === id ? { ...contact, ...updates } : contact
            );

            // Update state optimistically
            set({ emergencyContacts: updatedContacts });

            // Persist to storage
            await StorageService.setEmergencyContacts(updatedContacts);

            // Queue for server sync if online
            const { token, syncStatus } = get();
            if (token && syncStatus.isOnline) {
                await get().syncContactsToServer(token);
            }

            console.log('✅ [Store] Contact updated:', id);
        } catch (error) {
            console.error('❌ [Store] Failed to update contact:', error);
            // Rollback on error
            await get().loadContacts();
            throw error;
        }
    },

    removeContact: async (id) => {
        try {
            const { emergencyContacts } = get();

            const updatedContacts = emergencyContacts.filter(contact => contact.id !== id);

            // Update state optimistically
            set({ emergencyContacts: updatedContacts });

            // Persist to storage
            await StorageService.setEmergencyContacts(updatedContacts);

            // Queue for server sync if online
            const { token, syncStatus } = get();
            if (token && syncStatus.isOnline) {
                await get().syncContactsToServer(token);
            }

            console.log('✅ [Store] Contact removed:', id);
        } catch (error) {
            console.error('❌ [Store] Failed to remove contact:', error);
            // Rollback on error
            await get().loadContacts();
            throw error;
        }
    },

    fetchContactsFromServer: async (token) => {
        try {
            console.log('📥 [Store] Fetching contacts from server...');

            const env = process.env.NODE_ENV;
            const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';

            if (!apiUrl && env === 'production') {
                console.log('⚠️ [Store] API URL not configured');
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
                throw new Error(`Failed to fetch contacts: HTTP ${response.status}`);
            }

            const data = await response.json();
            const serverContacts = data.emergencyContacts || [];

            // Transform server contacts to match our EmergencyContact type
            const formattedContacts: EmergencyContact[] = serverContacts.map((c: any) => ({
                id: c.id || String(Date.now() + Math.random()),
                name: c.name || '',
                phone: c.phone || '',
                relationship: c.relationship || '',
                createdAt: c.createdAt || new Date().toISOString(),
                synced: true, // Contacts from server are synced
            }));

            console.log('✅ [Store] Fetched', formattedContacts.length, 'contacts from server');
            return formattedContacts;

        } catch (error) {
            console.error('❌ [Store] Failed to fetch contacts from server:', error);
            throw error;
        }
    },

    syncContactsToServer: async (token) => {
        try {
            const { emergencyContacts, syncStatus } = get();

            if (!syncStatus.isOnline) {
                console.log('📴 [Store] Offline, queuing contact sync');
                await OfflineQueueManager.getInstance().add({
                    type: 'UPDATE',
                    entity: 'CONTACTS',
                    data: { emergencyContacts },
                    token,
                });
                return false;
            }

            set(state => ({
                syncStatus: { ...state.syncStatus, isSyncing: true, error: null }
            }));

            const env = process.env.NODE_ENV;
            const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';

            if (!apiUrl && env === 'production') {
                throw new Error('API URL not configured');
            }

            // Get current user info to preserve other data
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
                emergencyContacts: emergencyContacts.map(c => ({
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
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Sync failed: HTTP ${response.status}`);
            }

            set(state => ({
                syncStatus: {
                    ...state.syncStatus,
                    isSyncing: false,
                    lastSync: new Date(),
                    pendingChanges: 0,
                    error: null,
                }
            }));

            console.log('✅ [Store] Contacts synced to server');
            return true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sync failed';
            set(state => ({
                syncStatus: {
                    ...state.syncStatus,
                    isSyncing: false,
                    error: errorMessage,
                }
            }));
            console.error('❌ [Store] Contact sync failed:', error);
            return false;
        }
    },

    // ==================== SETTINGS ACTIONS ====================

    updateSettings: async (updates) => {
        try {
            const { settings } = get();
            const newSettings = { ...settings, ...updates };

            // Update state immediately
            set({ settings: newSettings });

            // Persist each setting
            if (updates.language !== undefined) {
                await StorageService.setLanguage(updates.language as any);
            }
            if (updates.themeMode !== undefined) {
                await StorageService.setThemeMode(updates.themeMode);
            }
            if (updates.apiKey !== undefined) {
                if (updates.apiKey) {
                    await StorageService.setApiKey(updates.apiKey);
                } else {
                    await StorageService.clearApiKey();
                }
            }
            if (updates.guestMode !== undefined) {
                await StorageService.setGuestMode(updates.guestMode);
            }

            console.log('✅ [Store] Settings updated');
        } catch (error) {
            console.error('❌ [Store] Failed to update settings:', error);
            throw error;
        }
    },

    updateFakeCallSettings: async (updates) => {
        try {
            const { fakeCallSettings } = get();
            const newSettings = { ...fakeCallSettings, ...updates };

            // Update state immediately
            set({ fakeCallSettings: newSettings });

            // Persist to storage (convert null to undefined for StorageService)
            await StorageService.setFakeCallerSettings({
                name: newSettings.name,
                number: newSettings.number,
                ringtoneUri: newSettings.ringtoneUri || undefined,
            });

            console.log('✅ [Store] Fake call settings updated');
        } catch (error) {
            console.error('❌ [Store] Failed to update fake call settings:', error);
            throw error;
        }
    },

    // ==================== SYNC ACTIONS ====================

    initializeSync: async () => {
        try {
            console.log('🚀 [Store] Initializing sync...');

            // Setup network listener
            NetworkManager.getInstance().subscribe(isOnline => {
                set(state => ({
                    syncStatus: { ...state.syncStatus, isOnline }
                }));

                // Auto-sync when coming online
                if (isOnline) {
                    const { token, syncStatus } = get();
                    if (token && syncStatus.pendingChanges > 0) {
                        console.log('🔄 [Store] Coming online, syncing pending changes...');
                        get().forceSyncAll(token);
                    }
                }
            });

            // Load initial network status
            const isOnline = NetworkManager.getInstance().getStatus();
            set(state => ({
                syncStatus: { ...state.syncStatus, isOnline }
            }));

            console.log('✅ [Store] Sync initialized');
        } catch (error) {
            console.error('❌ [Store] Failed to initialize sync:', error);
        }
    },

    forceSyncAll: async (token) => {
        try {
            set(state => ({
                syncStatus: { ...state.syncStatus, isSyncing: true, error: null }
            }));

            // Sync contacts
            await get().syncContactsToServer(token);

            // Process offline queue
            await OfflineQueueManager.getInstance().processQueue();

            set(state => ({
                syncStatus: {
                    ...state.syncStatus,
                    isSyncing: false,
                    lastSync: new Date(),
                    pendingChanges: 0,
                }
            }));

            console.log('✅ [Store] Full sync completed');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Sync failed';
            set(state => ({
                syncStatus: {
                    ...state.syncStatus,
                    isSyncing: false,
                    error: errorMessage,
                }
            }));
            console.error('❌ [Store] Full sync failed:', error);
        }
    },
}));

// ==================== INITIALIZATION ====================

/**
 * Initialize the store with persisted data
 * Call this once on app startup
 */
export const initializeStore = async () => {
    console.log('🚀 [Store] Initializing global store...');
    console.log('📱 [Store] App startup - beginning store initialization');

    try {
        // Load auth data
        console.log('🔐 [Store] Loading auth data...');
        const [token, user] = await Promise.all([
            StorageService.getAuthToken(),
            StorageService.getUserData(),
        ]);

        if (token && user) {
            console.log('✅ [Store] Auth data found, setting auth state');
            await useGlobalStore.getState().setAuth(user, token);
        } else {
            console.log('ℹ️ [Store] No auth data found');
        }

        // Load contacts
        console.log('📇 [Store] Loading emergency contacts...');
        await useGlobalStore.getState().loadContacts();
        const contactsAfterLoad = useGlobalStore.getState().emergencyContacts;
        console.log('📊 [Store] Contacts after initialization:', {
            count: contactsAfterLoad.length,
            contacts: contactsAfterLoad.map(c => ({ id: c.id, name: c.name }))
        });

        // Load settings
        console.log('⚙️ [Store] Loading user settings...');
        const [language, themeMode, apiKey, guestMode] = await Promise.all([
            StorageService.getLanguage(),
            StorageService.getThemeMode(),
            StorageService.getApiKey(),
            StorageService.getGuestMode(),
        ]);

        useGlobalStore.setState({
            settings: {
                language: language || 'en',
                themeMode,
                apiKey,
                guestMode,
            },
        });
        console.log('✅ [Store] Settings loaded');

        // Load fake call settings (convert undefined to null for store)
        console.log('📞 [Store] Loading fake call settings...');
        const fakeCallSettings = await StorageService.getFakeCallerSettings();
        useGlobalStore.setState({
            fakeCallSettings: {
                name: fakeCallSettings.name,
                number: fakeCallSettings.number,
                ringtoneUri: fakeCallSettings.ringtoneUri || null,
            },
        });
        console.log('✅ [Store] Fake call settings loaded');

        // Initialize sync
        console.log('🔄 [Store] Initializing sync manager...');
        await useGlobalStore.getState().initializeSync();
        console.log('✅ [Store] Sync manager initialized');

        console.log('✅ [Store] Store initialized successfully');
        console.log('📊 [Store] Final state:', {
            contactsCount: useGlobalStore.getState().emergencyContacts.length,
            isAuthenticated: useGlobalStore.getState().isAuthenticated,
            language: useGlobalStore.getState().settings.language
        });
    } catch (error) {
        console.error('❌ [Store] Initialization failed:', error);
    }
};

// ==================== CONVENIENCE HOOKS ====================

/**
 * Hook to access emergency contacts
 */
export const useContacts = () => {
    const contacts = useGlobalStore(state => state.emergencyContacts);
    const loading = useGlobalStore(state => state.contactsLoading);
    const error = useGlobalStore(state => state.contactsError);
    const addContact = useGlobalStore(state => state.addContact);
    const updateContact = useGlobalStore(state => state.updateContact);
    const removeContact = useGlobalStore(state => state.removeContact);
    const loadContacts = useGlobalStore(state => state.loadContacts);
    const fetchContactsFromServer = useGlobalStore(state => state.fetchContactsFromServer);
    const syncContactsToServer = useGlobalStore(state => state.syncContactsToServer);

    return {
        contacts,
        loading,
        error,
        addContact,
        updateContact,
        removeContact,
        loadContacts,
        fetchContactsFromServer,
        syncContactsToServer,
    };
};

/**
 * Hook to access sync status
 */
export const useSyncStatus = () => {
    const syncStatus = useGlobalStore(state => state.syncStatus);
    const forceSyncAll = useGlobalStore(state => state.forceSyncAll);
    const token = useGlobalStore(state => state.token);

    return {
        ...syncStatus,
        sync: token ? () => forceSyncAll(token) : undefined,
    };
};

/**
 * Hook to access user settings
 */
export const useSettings = () => {
    const settings = useGlobalStore(state => state.settings);
    const updateSettings = useGlobalStore(state => state.updateSettings);

    return {
        settings,
        updateSettings,
    };
};

/**
 * Hook to access auth state
 */
export const useAuthStore = () => {
    const user = useGlobalStore(state => state.user);
    const token = useGlobalStore(state => state.token);
    const isAuthenticated = useGlobalStore(state => state.isAuthenticated);
    const setAuth = useGlobalStore(state => state.setAuth);
    const clearAuth = useGlobalStore(state => state.clearAuth);

    return {
        user,
        token,
        isAuthenticated,
        setAuth,
        clearAuth,
    };
};
