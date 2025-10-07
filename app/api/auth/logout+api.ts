import addCorsHeaders from '@/utils/middleware';
import { COOKIE_NAME } from '../../../utils/constants';

export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}

export async function POST() {
    try {
        console.log('🚪 Logout requested');

        // Expire the cookie
        const isProduction = process.env.NODE_ENV === 'production';
        const cookie = `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${isProduction ? '; Secure' : ''}`;

        console.log('✅ Logout successful');

        return addCorsHeaders(new Response(
            JSON.stringify({
                success: true,
                message: 'Logged out successfully'
            }),
            {
                status: 200,
                headers: {
                    'Set-Cookie': cookie,
                    'Content-Type': 'application/json'
                },
            }
        ));
    } catch (error: any) {
        console.error('💥 Logout error:', error);
        return addCorsHeaders(new Response(
            JSON.stringify({
                error: 'An internal server error occurred.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        ));
    }
}