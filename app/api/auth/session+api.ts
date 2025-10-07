import jwt from 'jsonwebtoken';
import { COOKIE_NAME, JWT_SECRET } from '../../../utils/constants';
import { logger } from '../../../utils/logger';

// --- CORS Configuration ---
const allowedOrigins =
    process.env.NODE_ENV === 'production'
        ? ['https://manish-9601-sentinel.expo.app']
        : ['http://localhost:8081', 'https://manish-9601-sentinel.expo.app'];

function getCorsHeaders(origin: string | null) {
    const headers = new Headers();
    if (origin && allowedOrigins.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
    }
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Allow-Credentials', 'true');
    return headers;
}
// --- OPTIONS Handler ---
export async function OPTIONS(request: Request) {
    const origin = request.headers.get('Origin');
    const headers = getCorsHeaders(origin);
    return new Response(null, { status: 204, headers });
}
// --- GET Handler ---
export async function GET(request: Request) {
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);
    const createJsonResponse = (body: object, status: number) => {
        return new Response(JSON.stringify(body), {
            status,
            headers: {
                ...Object.fromEntries(corsHeaders),
                'Content-Type': 'application/json',
            },
        });
    };
    logger.info('📝 Session check started');
    try {
        const cookieHeader = request.headers.get('cookie');
        const token = cookieHeader?.split(';')
            .find(c => c.trim().startsWith(`${COOKIE_NAME}=`))
            ?.split('=')[1];
        if (!token) {
            logger.warn('❌ No token found, user is not authenticated.');
            return createJsonResponse({ isAuthenticated: false, user: null }, 200);
        }
        if (!JWT_SECRET) {
            logger.error('❌ JWT_SECRET is not configured!');
            return createJsonResponse({ error: 'Server configuration error.' }, 500);
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        logger.info('✅ Session is valid.');
        return createJsonResponse({ isAuthenticated: true, user: decoded }, 200);
    } catch (error) {
        logger.error('💥 Session validation error:', error.name);
        // If token is invalid or expired, it's not a server error, but an unauthenticated state
        if (error instanceof jwt.JsonWebTokenError) {
            return createJsonResponse({ isAuthenticated: false, user: null, error: 'Invalid session token.' }, 200);
        }

        return createJsonResponse({ error: 'An internal server error occurred.' }, 500);
    }
}