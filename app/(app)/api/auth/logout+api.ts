import { COOKIE_NAME } from '../../../../utils/constants';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        cookies().set(COOKIE_NAME, '', {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: -1, // Expire the cookie immediately
            path: '/',
        });

        return new Response(JSON.stringify({ message: 'Logged out successfully' }), { status: 200 });
    } catch (error) {
        console.error('Logout error:', error);
        return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), { status: 500 });
    }
}
