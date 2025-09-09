import { db } from '../../../db/client';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { COOKIE_NAME, JWT_SECRET } from '../../../utils/constants';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email and password are required.' }), { status: 400 });
        }

        const userResult = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
        const user = userResult[0];

        if (!user || !user.hashedPassword) {
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

        if (!isPasswordValid) {
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }

        const secret = new TextEncoder().encode(JWT_SECRET);
        const alg = 'HS256';

        const token = await new jose.SignJWT({ id: user.id, email: user.email, name: user.name })
            .setProtectedHeader({ alg })
            .setExpirationTime('24h')
            .setIssuedAt()
            .sign(secret);

        const { hashedPassword, ...userWithoutPassword } = user;

        // Set the cookie in the response header
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax`);

        return new Response(JSON.stringify({ user: userWithoutPassword }), { status: 200, headers });

    } catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), { status: 500 });
    }
}

