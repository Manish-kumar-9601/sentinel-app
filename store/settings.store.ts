/**
 * Settings Store
 * 
 * Manages user settings and preferences.
 * Separated from global store for better performance.
 * 
 * @module SettingsStore
 */

import { StorageService, type LanguageCode, type ThemeMode } from '@/services/StorageService';
import { create } from 'zustand';

// ==================== TYPES ====================

export interface UserSettings {
    language: LanguageCode;
    themeMode: ThemeMode;
    apiKey: string | null;
    guestMode: boolean;
}

export interface FakeCallSettings {
    name: string;
    number: string;
    ringtoneUri: string | null;
}

export interface SettingsState {
    // State
    settings: UserSettings;
    fakeCallSettings: FakeCallSettings;
    isLoading: boolean;
    error: string | null;

    // Actions
    loadSettings: () => Promise<void>;
    updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
    updateFakeCallSettings: (updates: Partial<FakeCallSettings>) => Promise<void>;
    resetSettings: () => Promise<void>;
}

// ==================== STORE IMPLEMENTATION ====================

const DEFAULT_SETTINGS: UserSettings = {
    language: 'en',
    themeMode: 'system',
    apiKey: null,
    guestMode: false,
};

const DEFAULT_FAKE_CALL_SETTINGS: FakeCallSettings = {
    name: '',
    number: '',
    ringtoneUri: null,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
    // ==================== INITIAL STATE ====================
    settings: DEFAULT_SETTINGS,
    fakeCallSettings: DEFAULT_FAKE_CALL_SETTINGS,
    isLoading: false,
    error: null,

    // ==================== ACTIONS ====================

    /**
     * Load settings from storage
     */
    loadSettings: async () => {
        try {
            console.log('🔄 [SettingsStore] Loading settings...');
            set({ isLoading: true, error: null });

            const [language, themeMode, apiKey, guestMode, fakeCallSettings] = await Promise.all([
                StorageService.getLanguage(),
                StorageService.getThemeMode(),
                StorageService.getApiKey(),
                StorageService.getGuestMode(),
                StorageService.getFakeCallerSettings(),
            ]);

            set({
                settings: {
                    language: language || DEFAULT_SETTINGS.language,
                    themeMode: themeMode || DEFAULT_SETTINGS.themeMode,
                    apiKey: apiKey || null,
                    guestMode: guestMode || false,
                },
                fakeCallSettings: {
                    name: fakeCallSettings?.name || '',
                    number: fakeCallSettings?.number || '',
                    ringtoneUri: fakeCallSettings?.ringtoneUri || null,
                },
                isLoading: false,
            });

            console.log('✅ [SettingsStore] Settings loaded');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load settings';
            set({
                isLoading: false,
                error: errorMessage,
            });
            console.error('❌ [SettingsStore] Failed to load settings:', error);
        }
    },

    /**
     * Update user settings
     */
    updateSettings: async (updates) => {
        try {
            const { settings } = get();
            console.log('📝 [SettingsStore] Updating settings:', Object.keys(updates));

            const newSettings = { ...settings, ...updates };

            // Update state immediately
            set({ settings: newSettings });

            // Persist each setting individually
            const persistPromises: Promise<void>[] = [];

            if (updates.language !== undefined) {
                persistPromises.push(StorageService.setLanguage(updates.language));
            }
            if (updates.themeMode !== undefined) {
                persistPromises.push(StorageService.setThemeMode(updates.themeMode));
            }
            if (updates.apiKey !== undefined) {
                if (updates.apiKey) {
                    persistPromises.push(StorageService.setApiKey(updates.apiKey));
                } else {
                    persistPromises.push(StorageService.clearApiKey());
                }
            }
            if (updates.guestMode !== undefined) {
                persistPromises.push(StorageService.setGuestMode(updates.guestMode));
            }

            await Promise.all(persistPromises);

            console.log('✅ [SettingsStore] Settings updated');
        } catch (error) {
            console.error('❌ [SettingsStore] Failed to update settings:', error);
            // Rollback
            await get().loadSettings();
            throw error;
        }
    },

    /**
     * Update fake call settings
     */
    updateFakeCallSettings: async (updates) => {
        try {
            const { fakeCallSettings } = get();
            console.log('📝 [SettingsStore] Updating fake call settings');

            const newSettings = { ...fakeCallSettings, ...updates };

            // Update state immediately
            set({ fakeCallSettings: newSettings });

            // Persist to storage (convert null to undefined for StorageService)
            await StorageService.setFakeCallerSettings({
                name: newSettings.name,
                number: newSettings.number,
                ringtoneUri: newSettings.ringtoneUri || undefined,
            });

            console.log('✅ [SettingsStore] Fake call settings updated');
        } catch (error) {
            console.error('❌ [SettingsStore] Failed to update fake call settings:', error);
            // Rollback
            await get().loadSettings();
            throw error;
        }
    },

    /**
     * Reset all settings to defaults
     */
    resetSettings: async () => {
        try {
            console.log('🔄 [SettingsStore] Resetting settings...');

            set({
                settings: DEFAULT_SETTINGS,
                fakeCallSettings: DEFAULT_FAKE_CALL_SETTINGS,
            });

            await Promise.all([
                StorageService.setLanguage(DEFAULT_SETTINGS.language),
                StorageService.setThemeMode(DEFAULT_SETTINGS.themeMode),
                StorageService.clearApiKey(),
                StorageService.setGuestMode(false),
                StorageService.setFakeCallerSettings({
                    name: '',
                    number: '',
                }),
            ]);

            console.log('✅ [SettingsStore] Settings reset');
        } catch (error) {
            console.error('❌ [SettingsStore] Failed to reset settings:', error);
            throw error;
        }
    },
}));
