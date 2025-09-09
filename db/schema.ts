import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// USERS TABLE
export const users = pgTable('users', {
    id: text('id').primaryKey(), // Assuming you use an ID from an auth provider
    name: text('name'),
    email: text('email').unique().notNull(),
    phone: text('phone'),
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
