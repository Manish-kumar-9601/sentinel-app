import { db } from '../../../../db/client';
import { users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { COOKIE_NAME, JWT_SECRET } from '../../../../utils/constants';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email and password are required.' }), { status: 400 });
        }

        const userArr = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

        if (userArr.length === 0) {
            // User not found, return a generic error to prevent email enumeration
            console.log('User not found for email:', userArr);
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }

        const user = userArr[0];

        // --- FIX ---
        // Add a check to ensure the user has a hashed password.
        // This prevents the bcrypt error if the user was created without a password.
        if (!user.hashedPassword) {
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }

        // Now it's safe to compare the passwords.
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }

        // --- Create JWT with jsonwebtoken ---
        const payload = { id: user.id, email: user.email, name: user.name };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        const cookie = `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax; ${process.env.NODE_ENV !== 'development' ? 'Secure;' : ''}`;

        const { hashedPassword: _, ...userWithoutPassword } = user;

        return new Response(JSON.stringify({ user: userWithoutPassword }), {
            status: 200,
            headers: { 'Set-Cookie': cookie },
        });
    } catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), { status: 500 });
    }
}

