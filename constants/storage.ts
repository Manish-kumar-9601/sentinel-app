/**
 * Centralized Storage Keys
 * Single source of truth for all AsyncStorage and SecureStore keys
 */

export const STORAGE_KEYS = {
    // ==================== SECURE STORAGE (expo-secure-store) ====================
    // For sensitive authentication and credential data
    AUTH_TOKEN: 'sentinel_auth_token',
    REFRESH_TOKEN: 'sentinel_refresh_token',
    USER_CREDENTIALS: 'sentinel_user_credentials',

    // ==================== ASYNC STORAGE - USER DATA ====================
    USER_INFO: 'sentinel_user_info_v1',
    EMERGENCY_CONTACTS: 'sentinel_emergency_contacts_v1',
    MEDICAL_INFO: 'sentinel_medical_info_v1',

    // ==================== ASYNC STORAGE - LOCATION ====================
    LOCATION_CACHE: 'sentinel_location_cache_v1',
    LOCATION_HISTORY: 'sentinel_location_history_v1',
    LOCATION_TRACKING_STATUS: 'sentinel_location_tracking_v1',

    // ==================== ASYNC STORAGE - EVIDENCE ====================
    EVIDENCE: 'sentinel_evidence_v1',
    SHARED_SESSIONS: 'sentinel_shared_sessions_v1',

    // ==================== ASYNC STORAGE - SETTINGS ====================
    THEME_MODE: 'sentinel_theme_mode',
    LANGUAGE: 'sentinel_language',
    VOLUME_SOS_ENABLED: 'sentinel_volume_sos_enabled',
    NOTIFICATIONS_ENABLED: 'sentinel_notifications_enabled',
    VOICE_SOS_ENABLED: 'sentinel_voice_sos_enabled',
    FAKE_CALLER_NAME: 'sentinel_fake_caller_name',
    FAKE_CALLER_NUMBER: 'sentinel_fake_caller_number',
    FAKE_CALL_RINGTONE: 'sentinel_fake_call_ringtone_uri',
    API_KEY: 'sentinel_api_key',

    // ==================== ASYNC STORAGE - SYNC ====================
    SYNC_QUEUE: 'sentinel_sync_queue_v1',
    SYNC_STATE: 'sentinel_sync_state_v1',
    LAST_SYNC_TIMESTAMP: 'sentinel_last_sync_v1',
    OFFLINE_CHANGES: 'sentinel_offline_changes_v1',

    // ==================== ASYNC STORAGE - CACHE ====================
    CACHE_METADATA: 'sentinel_cache_metadata',
    API_CACHE_PREFIX: 'sentinel_api_cache_',

    // ==================== ASYNC STORAGE - SOS ====================
    SOS_HISTORY: 'sentinel_sos_history_v1',
    LAST_SOS_TIMESTAMP: 'sentinel_last_sos_timestamp',

    // ==================== ASYNC STORAGE - MIGRATION ====================
    MIGRATION_VERSION: 'sentinel_migration_version',
    MIGRATION_COMPLETED: 'sentinel_migration_completed',
} as const;

// Type-safe storage keys
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// Legacy keys for migration (DO NOT USE IN NEW CODE)
export const LEGACY_STORAGE_KEYS = {
    CONTACTS_OLD: 'emergency_contacts',
    USER_INFO_OLD: 'user_info_cache',
    LOCATION_HISTORY_OLD: 'location_history',
    SYNC_CONTACTS_OLD: 'sync_contacts_v3',
    SYNC_USER_INFO_OLD: 'sync_user_info_v3',
    SYNC_LOCATION_OLD: 'sync_location_v3',
    SYNC_MEDICAL_OLD: 'sync_medical_info_v3',
    SYNC_QUEUE_OLD: 'sync_queue_v3',
    SYNC_STATE_OLD: 'sync_state_v3',
    LANGUAGE_OLD: 'user_language',
} as const;

// Cache expiry times (in milliseconds)
export const CACHE_EXPIRY = {
    USER_INFO: 10 * 60 * 1000, // 10 minutes
    CONTACTS: 5 * 60 * 1000, // 5 minutes
    LOCATION: 5 * 60 * 1000, // 5 minutes
    MEDICAL_INFO: 30 * 60 * 1000, // 30 minutes
    API_RESPONSE: 15 * 60 * 1000, // 15 minutes
    LOCATION_HISTORY: 7 * 24 * 60 * 60 * 1000, // 7 days
    EVIDENCE: Infinity, // Never expire (user managed)
} as const;

// Storage namespaces for organization
export const STORAGE_NAMESPACES = {
    AUTH: 'auth',
    USER: 'user',
    LOCATION: 'location',
    EVIDENCE: 'evidence',
    SETTINGS: 'settings',
    SYNC: 'sync',
    CACHE: 'cache',
    SOS: 'sos',
} as const;

export default STORAGE_KEYS;
