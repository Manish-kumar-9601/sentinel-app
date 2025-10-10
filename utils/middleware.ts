import jwt from 'jsonwebtoken';
import { COOKIE_NAME, JWT_SECRET } from './constants';
import { logger } from './logger';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.match(/(.*?)=(.*)$/);
    if (parts) {
      const key = parts[1].trim();
      const value = parts[2].trim();
      cookies[key] = value;
    }
  });
  return cookies;
}

export function withAuth(
  handler: (req: Request, user: AuthUser) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      logger.info('🔐 Auth middleware: Checking authentication...');

      // Check for Authorization header first (for mobile apps)
      const authHeader = req.headers.get('Authorization');
      let token: string | null = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        logger.info('✅ Found Bearer token in Authorization header');
      } else {
        // Fallback to cookie
        const cookies = parseCookies(req);
        token = cookies[COOKIE_NAME];
        if (token) {
          logger.info('✅ Found token in cookie');
        }
      }

      if (!token) {
        logger.warn('❌ No authentication token found');
        return addCorsHeaders(new Response(
          JSON.stringify({ 
            error: "Authentication required. Please log in.",
            code: "NO_TOKEN"
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      // Check if JWT_SECRET is configured
      if (!JWT_SECRET) {
        logger.error('❌ JWT_SECRET is not configured!');
        return addCorsHeaders(new Response(
          JSON.stringify({ 
            error: "Server configuration error",
            code: "SERVER_CONFIG_ERROR"
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      // Verify token
      let decodedPayload;
      try {
        decodedPayload = jwt.verify(token, JWT_SECRET);
      } catch (jwtError: any) {
        logger.warn('❌ Token verification failed:', jwtError.message);
        
        if (jwtError.name === 'TokenExpiredError') {
          return addCorsHeaders(new Response(
            JSON.stringify({ 
              error: "Session expired. Please log in again.",
              code: "TOKEN_EXPIRED"
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ));
        }
        
        return addCorsHeaders(new Response(
          JSON.stringify({ 
            error: "Invalid authentication token",
            code: "INVALID_TOKEN"
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      if (
        typeof decodedPayload !== 'object' ||
        !('id' in decodedPayload) ||
        !('email' in decodedPayload) ||
        !('name' in decodedPayload)
      ) {
        logger.error('❌ Invalid token payload structure');
        return addCorsHeaders(new Response(
          JSON.stringify({ 
            error: "Invalid token payload",
            code: "INVALID_PAYLOAD"
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      const user = decodedPayload as AuthUser;
      logger.info('✅ Authentication successful for user:', user.email);

      // Call the actual handler
      return await handler(req, user);

    } catch (error: any) {
      logger.error("❌ Auth middleware error:", error);
      return addCorsHeaders(new Response(
        JSON.stringify({
          error: "Authentication error occurred",
          code: "AUTH_ERROR",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }
  };
}

export default function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  // More permissive CORS for development
  const origin = process.env.NODE_ENV === 'production' 
    ? 'https://manish-9601-sentinel.expo.app'
    : '*';
    
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  headers.set('Access-Control-Allow-Credentials', 'true');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}