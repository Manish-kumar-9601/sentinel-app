import { COOKIE_NAME } from '../../../utils/constants';

export async function POST() {
    try {
        // To log out, we send back a response that tells the browser to expire the cookie.
        // We do this by setting its Max-Age to 0.
        const cookie = `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`;

        return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
            status: 200,
            headers: {
                'Set-Cookie': cookie,
            },
        });
    } catch (error) {
        console.error('Logout error:', error);
        return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), { status: 500 });
    }
}

