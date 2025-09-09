﻿import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

// Ensure the DATABASE_URL is set in your .env file
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in .env file');
}

export default defineConfig({
    schema: './db/schema.ts',
    out: './drizzle',
    // This is the missing dialect property Drizzle needs.
    dialect: 'postgresql',
    dbCredentials: {
        // This tells Drizzle to get the connection string from your .env file.
        url: process.env.DATABASE_URL,
    },
    // This is recommended for Drizzle Kit to generate migrations
    migrations: {
        table: 'migrations',
        schema: 'public'
    }
});

