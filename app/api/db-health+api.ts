// app/api/db-health+api.ts
import { logger } from '@/utils/logger';
import { db } from '../../db/client';
import { users } from '../../db/schema';
import addCorsHeaders from '../../utils/middleware';

export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}

export async function GET() {
    const checks: any = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        checks: {}
    };

    // 1. Check if DATABASE_URL exists
    checks.checks.databaseUrlExists = !!process.env.DATABASE_URL;
    
    if (process.env.DATABASE_URL) {
        // Show sanitized connection string (hide password)
        const dbUrl = process.env.DATABASE_URL;
        try {
            const url = new URL(dbUrl);
            checks.checks.databaseHost = url.hostname;
            checks.checks.databasePort = url.port || '5432';
            checks.checks.databaseName = url.pathname.slice(1);
            checks.checks.databaseUser = url.username;
        } catch (e) {
            checks.checks.urlParseError = 'Invalid DATABASE_URL format';
        }
    }

    // 2. Test database connection with raw query
    try {
        logger.info('🔌 Testing database connection...');
        const result = await db.select().from(users).limit(1);
        checks.checks.databaseConnection = 'success';
        checks.checks.userTableAccessible = true;
        checks.checks.resultCount = result.length;
        logger.info('✅ Database connection successful');
    } catch (dbError: any) {
        logger.error('❌ Database connection error:', dbError);
        checks.checks.databaseConnection = 'failed';
        checks.checks.error = {
            message: dbError.message,
            code: dbError.code,
            name: dbError.name,
            detail: dbError.detail,
            hint: dbError.hint
        };
    }

    // 3. Check other required env vars
    checks.checks.jwtSecretExists = !!process.env.JWT_SECRET;

    // 4. Runtime information
    checks.runtime = {
        platform: typeof process !== 'undefined' ? 'node' : 'edge',
        hasProcess: typeof process !== 'undefined',
        hasGlobal: typeof global !== 'undefined'
    };

    const status = checks.checks.databaseConnection === 'success' ? 200 : 500;

    return addCorsHeaders(new Response(
        JSON.stringify(checks, null, 2),
        {
            status,
            headers: { 'Content-Type': 'application/json' }
        }
    ));
}