import jwt, { JwtPayload } from 'jsonwebtoken';
import { COOKIE_NAME, JWT_SECRET } from './constants';

// Define the structure of the authenticated user object
export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

// Function to parse cookies from the request headers
function parseCookies(request: Request) {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return {};
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.match(/(.*?)=(.*)$/)
        if(parts) {
            const key = parts[1].trim();
            const value = parts[2].trim();
            cookies[key] = value;
        }
    });
    return cookies;
}

/**
 * Middleware to authenticate API requests using JWT from cookies.
 * This is a higher-order function that wraps your API route handlers.
 */
export function withAuth(
  handler: (req: Request, user: AuthUser) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      const cookies = parseCookies(req);
      const token = cookies[COOKIE_NAME];

      if (!token) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Verify the token using the jsonwebtoken library
      const decodedPayload = jwt.verify(token, JWT_SECRET);

      // --- TYPE-SAFE CHECK ---
      // Before we trust the payload, we must validate its shape at runtime.
      if (
        typeof decodedPayload !== 'object' ||
        !('id' in decodedPayload) ||
        !('email' in decodedPayload) ||
        !('name' in decodedPayload)
      ) {
        throw new Error("Invalid token payload shape");
      }
      
      // Now that we've validated the object, it's safe to cast and use it.
      const user = decodedPayload as AuthUser;

      // If the token is valid, call the original handler with the user payload
      return await handler(req, user);

    } catch (error) {
        console.error("Auth middleware error:", error);
        // This will catch expired tokens, invalid signatures, or our custom shape error
        return new Response(
            JSON.stringify({ error: "Invalid token or authentication failed" }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }
  };
}


export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CORS (adjust for your needs)
  if (process.env.NODE_ENV === 'production') {
    headers.set('Access-Control-Allow-Origin', 'https://yourdomain.com');
  } else {
    headers.set('Access-Control-Allow-Origin', '*');
  }
  
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

