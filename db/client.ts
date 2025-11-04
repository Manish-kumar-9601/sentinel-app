// db/client.ts
// NOTE: Using drizzle-orm/neon-http driver
// LIMITATIONS:
// - Does NOT support transactions (db.transaction() will throw error)
// - Use sequential operations with proper error handling instead
// - For transaction support, consider switching to drizzle-orm/neon-serverless
//   or use a connection pooling driver like @neondatabase/serverless with ws
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Validate environment variable
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    throw new Error('DATABASE_URL is not set in environment variables');
}

console.log('🔧 Initializing database connection...');
console.log('📍 Environment:', process.env.NODE_ENV);
console.log('🌐 Database URL exists:', !!process.env.DATABASE_URL);

const connectionString: string = process.env.DATABASE_URL;

// Validate URL format
try {
    const url = new URL(connectionString);
    console.log('🔌 Connecting to:', {
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.slice(1),
        user: url.username
    });
} catch (e) {
    console.error('❌ Invalid DATABASE_URL format:', e);
    throw new Error('Invalid DATABASE_URL format');
}

// Create Neon client
let client;
try {
    client = neon(connectionString);
    console.log('✅ Neon client created');
} catch (error: any) {
    console.error('❌ Failed to create Neon client:', error);
    throw error;
}

// Test connection on initialization
(async () => {
    try {
        await client`SELECT 1`;
        console.log('✅ Database connection verified');
    } catch (error: any) {
        console.error('❌ Database connection test failed:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
    }
})();

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });
console.log('✅ Database client initialized with schema');

// Export schema for direct access
export { schema };
