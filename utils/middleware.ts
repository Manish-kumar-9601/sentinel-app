import * as jose from "jose";
import { COOKIE_NAME, JWT_SECRET } from "./constants";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  [key: string]: any;
};

// Function to parse cookies from the request headers
function parseCookies(request: Request) {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return {};
    const cookies = {};
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
export function withAuth<T extends Response>(
  handler: (req: Request, user: AuthUser) => Promise<T | Response>
) {
  return async (req: Request): Promise<T | Response> => {
    try {
      const cookies = parseCookies(req);
      const token = cookies[COOKIE_NAME];

      if (!token) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401 }
        );
      }

      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);

      return await handler(req, payload as AuthUser);
    } catch (error) {
        console.error("Auth middleware error:", error);
        return new Response(JSON.stringify({ error: "Invalid token or authentication failed" }), { status: 401 });
    }
  };
}

