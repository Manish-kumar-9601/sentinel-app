import { withAuth } from '../../../../utils/middleware';

// The withAuth middleware handles JWT verification from the cookie
// and passes the user payload to the handler.
export const GET = withAuth(async (req, user) => {
    if (user) {
        return new Response(JSON.stringify({ user }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
    });
});
