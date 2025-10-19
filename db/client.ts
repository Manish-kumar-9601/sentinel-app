// db/client.ts
import { drizzle } from 'drizzle-orm/neon-http';
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { logger } from '@/utils/logger';
import { emergencyContacts, medicalInfo, users } from './schema';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
}
logger.info('🔧 Initializing database connection...');
logger.info('📍 Environment:', process.env.NODE_ENV);
logger.info('🌐 Database URL exists:', !!process.env.DATABASE_URL);
const connectionString: string = `${process.env.DATABASE_URL}`;
try {
    const url = new URL(connectionString);
    logger.info('🔌 Connecting to:', {
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.slice(1),
        user: url.username
    });
} catch (e) {
    logger.error('❌ Invalid DATABASE_URL format:', e);
}

const client = neon(process.env.DATABASE_URL);

// Test connection on initialization
(async () => {
    try {
        await client`SELECT 1`;
        logger.info('✅ Database connection verified');
    } catch (error: any) {
        logger.error('❌ Database connection test failed:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
    }
})();
export const db = drizzle(client, { schema: { users, emergencyContacts, medicalInfo } });
logger.info('✅ Database client initialized');