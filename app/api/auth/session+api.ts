import jwt from 'jsonwebtoken'; // Replaced jose with jsonwebtoken
import { COOKIE_NAME, JWT_SECRET } from '../../../utils/constants';
import { withAuth } from '../../../utils/middleware';
import type { AuthUser } from  '../../../utils/middleware';

export const GET = withAuth(async (_req: Request, user: AuthUser) => {
    // If the middleware succeeds, the user is authenticated.
    // We can return the user data from the token payload.
    return new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
});
