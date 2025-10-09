// db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';
import { logger } from '@/utils/logger';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

logger.info('🔧 Initializing database connection...');
logger.info('📍 Environment:', process.env.NODE_ENV);
logger.info('🌐 Database URL exists:', !!process.env.DATABASE_URL);
const connectionString:string = `${process.env.DATABASE_URL}`;
// Parse and log connection details (without password)
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
// Configure postgres client with better error handling and edge runtime support
const client = postgres(connectionString, {
    // Increase timeout for serverless environments
    idle_timeout: 20,
    max_lifetime: 60 * 30, // 30 minutes
    connect_timeout: 10,
    // Better error handling
    onnotice: (notice) => {
        logger.info('📢 PostgreSQL Notice:', notice);
    }, 
    // Logging for debugging
    debug: process.env.NODE_ENV === 'development',
    // Handle connection errors
    connection: {
        application_name: 'sentinel_app'
    }
});
// Test connection on initialization
(async () => {
    try {
        await client`SELECT 1 as test`;
        logger.info('✅ Database connection verified');
    } catch (error: any) {
        logger.error('❌ Database connection test failed:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
    }
})();
export const db = drizzle(client);
logger.info('✅ Database client initialized');