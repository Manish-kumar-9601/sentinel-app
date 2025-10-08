import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// USERS TABLE
export const users = pgTable('users', {
    id: text('id').primaryKey(), // UUID
    name: text('name'),
    email: text('email').unique().notNull(),
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

// Add indexes for better performance
// CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
// CREATE INDEX idx_emergency_contacts_is_primary ON emergency_contacts(user_id, is_primary) WHERE is_primary = true;