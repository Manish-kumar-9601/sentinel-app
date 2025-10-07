import { db } from '../../../db/client';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { COOKIE_NAME, JWT_SECRET } from '../../../utils/constants';
import addCorsHeaders from '@/utils/middleware';

export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        console.log('🔐 Login attempt for:', email);

        // Input validation
        if (!email || !password) {
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'Email and password are required.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Type validation
        if (typeof email !== 'string' || typeof password !== 'string') {
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'Invalid input format.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Sanitize email
        const sanitizedEmail = email.toLowerCase().trim();

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedEmail)) {
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'Invalid email format.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Query database
        let userArr;
        try {
            userArr = await db
                .select()
                .from(users)
                .where(eq(users.email, sanitizedEmail))
                .limit(1);
        } catch (dbError: any) {
            console.error('❌ Database query error:', dbError);
            return addCorsHeaders(new Response(
                JSON.stringify({
                    error: 'Database error occurred.',
                    details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
                }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // User not found
        if (userArr.length === 0) {
            console.log('❌ User not found:', sanitizedEmail);
            await new Promise(resolve => setTimeout(resolve, 200)); // Prevent timing attacks
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'Invalid credentials.' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        const user = userArr[0];

        // Check if user has password
        if (!user.hashedPassword) {
            console.log('❌ User without password:', sanitizedEmail);
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'Invalid credentials.' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Verify password
        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        } catch (bcryptError) {
            console.error('❌ Password comparison error:', bcryptError);
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'Authentication error occurred.' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        if (!isPasswordValid) {
            console.log('❌ Invalid password for:', sanitizedEmail);
            await new Promise(resolve => setTimeout(resolve, 200));
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'Invalid credentials.' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Create JWT
        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            iat: Math.floor(Date.now() / 1000)
        };

        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: '24h',
            algorithm: 'HS256'
        });

        // Set cookie
        const isProduction = process.env.NODE_ENV === 'production';
        const cookie = `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax${isProduction ? '; Secure' : ''}`;

        // Remove sensitive data
        const { hashedPassword: _, createdAt, updatedAt, ...userResponse } = user;

        console.log('✅ Login successful for:', sanitizedEmail);

        return addCorsHeaders(new Response(
            JSON.stringify({
                user: userResponse,
                token: token, // Include token for mobile apps
                message: 'Login successful'
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
        console.error('💥 Login error:', error);

        const errorMessage = process.env.NODE_ENV === 'development'
            ? `Internal server error: ${error.message}`
            : 'An internal server error occurred.';

        return addCorsHeaders(new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        ));
    }
}