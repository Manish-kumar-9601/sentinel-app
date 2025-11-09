import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// USERS TABLE
export const users = pgTable('users', {
    id: text('id').primaryKey(), // UUID
    name: text('name'),
    email: text('email').unique().notNull(),
    phone: text('phone'),
    hashedPassword: text('hashed_password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// MEDICAL INFO TABLE
export const medicalInfo = pgTable('medical_info', {
    userId: text('user_id')
        .primaryKey()
        .references(() => users.id, { onDelete: 'cascade' }),
    bloodGroup: text('blood_group'),
    allergies: text('allergies'),
    medications: text('medications'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// EMERGENCY CONTACTS TABLE
export const emergencyContacts = pgTable('emergency_contacts', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    relationship: text('relationship'), // e.g., "Mother", "Spouse", "Friend"

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// SOS ALERTS TABLE (Track all emergency alerts)
export const sosAlerts = pgTable('sos_alerts', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    location: text('location'), // JSON string: {latitude, longitude, address}
    status: text('status').notNull().default('pending'), // 'pending', 'sent', 'failed'

    // Multi-layer delivery tracking
    apiSent: text('api_sent'), // 'success', 'failed', 'skipped'
    whatsappSent: text('whatsapp_sent'), // 'success', 'failed', 'skipped'
    smsSent: text('sms_sent'), // 'success', 'failed', 'skipped'
    callMade: text('call_made'), // 'yes', 'no'

    contactsNotified: text('contacts_notified'), // Comma-separated contact IDs
    deliveryDetails: text('delivery_details'), // JSON with detailed results

    createdAt: timestamp('created_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
});

// EVIDENCE TABLE (Photos, videos, audio recordings)
export const evidence = pgTable('evidence', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    alertId: text('alert_id').references(() => sosAlerts.id, { onDelete: 'set null' }),

    type: text('type').notNull(), // 'photo', 'video', 'audio', 'document'
    fileName: text('file_name').notNull(),
    fileSize: text('file_size'),
    mimeType: text('mime_type'),

    localUri: text('local_uri'), // Local file path
    cloudUri: text('cloud_uri'), // Cloud storage URL (if uploaded)
    thumbnailUri: text('thumbnail_uri'),

    latitude: text('latitude'),
    longitude: text('longitude'),
    address: text('address'),
    deviceInfo: text('device_info'), // JSON

    isShared: text('is_shared').default('false'),
    sharedWith: text('shared_with'), // JSON array of contact IDs
    sharedAt: timestamp('shared_at'),

    description: text('description'),
    tags: text('tags'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// LOCATION HISTORY TABLE (Stored in database)
export const locationHistory = pgTable('location_history', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    latitude: text('latitude').notNull(),
    longitude: text('longitude').notNull(),
    accuracy: text('accuracy'),
    altitude: text('altitude'),
    speed: text('speed'),
    heading: text('heading'),

    address: text('address'),

    isEmergency: text('is_emergency').default('false'),
    alertId: text('alert_id').references(() => sosAlerts.id, { onDelete: 'set null' }),

    isShared: text('is_shared').default('false'),
    sharedWith: text('shared_with'),

    timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// SHARED DATA SESSIONS (Track what was shared with whom)
export const sharedDataSessions = pgTable('shared_data_sessions', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    alertId: text('alert_id').references(() => sosAlerts.id, { onDelete: 'cascade' }),

    recipientContactId: text('recipient_contact_id')
        .references(() => emergencyContacts.id, { onDelete: 'cascade' }),
    recipientPhone: text('recipient_phone').notNull(),
    recipientName: text('recipient_name'),

    evidenceIds: text('evidence_ids'), // JSON array
    locationHistoryCount: text('location_history_count'),
    shareLink: text('share_link'),
    accessToken: text('access_token'),

    status: text('status').default('active'), // 'active', 'expired', 'revoked'
    expiresAt: timestamp('expires_at'),
    viewCount: text('view_count').default('0'),
    lastViewedAt: timestamp('last_viewed_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Add indexes for better performance
// CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
// CREATE INDEX idx_sos_alerts_user_id ON sos_alerts(user_id);
// CREATE INDEX idx_sos_alerts_status ON sos_alerts(status);
// CREATE INDEX idx_evidence_user_id ON evidence(user_id);
// CREATE INDEX idx_evidence_alert_id ON evidence(alert_id);
// CREATE INDEX idx_location_history_user_id ON location_history(user_id);
// CREATE INDEX idx_location_history_timestamp ON location_history(timestamp DESC);
// CREATE INDEX idx_shared_data_sessions_user_id ON shared_data_sessions(user_id);
// CREATE INDEX idx_shared_data_sessions_token ON shared_data_sessions(access_token);