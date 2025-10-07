import jwt, { JwtPayload } from 'jsonwebtoken';
import { COOKIE_NAME, JWT_SECRET } from './constants';

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
      // Check for Authorization header first (for mobile apps)
      const authHeader = req.headers.get('Authorization');
      let token: string | null = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        // Fallback to cookie
        const cookies = parseCookies(req);
        token = cookies[COOKIE_NAME];
      }

      if (!token) {
        console.log('❌ No authentication token found');
        return addCorsHeaders(new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      // Verify token
      const decodedPayload = jwt.verify(token, JWT_SECRET);

      if (
        typeof decodedPayload !== 'object' ||
        !('id' in decodedPayload) ||
        !('email' in decodedPayload) ||
        !('name' in decodedPayload)
      ) {
        throw new Error("Invalid token payload");
      }

      const user = decodedPayload as AuthUser;

      return await handler(req, user);

    } catch (error: any) {
      console.error("❌ Auth middleware error:", error.message);
      return addCorsHeaders(new Response(
        JSON.stringify({
          error: "Invalid or expired token",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }
  };
}

export default function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  headers.set('Access-Control-Allow-Credentials', 'true');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
