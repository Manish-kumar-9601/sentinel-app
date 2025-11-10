/**
 * Store Barrel Export
 * 
 * Centralized export for all domain-specific stores.
 * Use these instead of the legacy global store.
 * 
 * @example
 * ```typescript
 * import { useAuthStore, useContactsStore } from '@/store';
 * 
 * function MyComponent() {
 *   const { user, isAuthenticated } = useAuthStore();
 *   const { contacts, addContact } = useContactsStore();
 * }
 * ```
 */

// Domain stores
export { useAuthStore, type AuthState } from './auth.store';
export { useContactsStore, type ContactsState } from './contacts.store';
export { useSettingsStore, type FakeCallSettings, type SettingsState, type UserSettings } from './settings.store';
export { useSyncStore, type SyncState, type SyncStatus } from './sync.store';

// Legacy global store (deprecated - use domain stores instead)
export { useGlobalStore, type GlobalState } from './index';

