import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// USERS TABLE
export const users = pgTable('users', {
    id: text('id').primaryKey(), // UUID
    name: text('name'),
    email: text('email').unique().notNull(),
    phone: text('phone'),
    hashedPassword: text('hashed_password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    location: jsonb('location').$type<{
        latitude: number;
        longitude: number;
        timestamp: string;
        accuracy?: number | null;
        altitude?: number | null;
        speed?: number | null;
        heading?: number | null;
        meta?: {
            emergencyContact?: string;
            trigger?: string;
        } | null;
    }[]>(),
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
    email: text('email'),
    relationship: text('relationship'), // e.g., "Mother", "Spouse", "Friend"
    priority: integer('priority').default(3), // 1=highest, 5=lowest

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});