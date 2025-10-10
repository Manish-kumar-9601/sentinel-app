/// <reference lib="dom" />
import { db } from '../../../db/client';
import { users } from '../../../db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { COOKIE_NAME, JWT_SECRET } from '../../../utils/constants';
import addCorsHeaders from '@/utils/middleware';
import { logger } from '@/utils/logger';

export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}

async function parseRequestBody(request: Request): Promise<{ name: string | null; email: string | null; password: string | null }> {
    const contentType = request.headers.get('content-type') || '';

    // Handle JSON
    if (contentType.includes('application/json')) {
        try {
            const body = await request.json();
            return {
                name: body.name || null,
                email: body.email || null,
                password: body.password || null
            };
        } catch (error) {
            throw new Error('Invalid JSON format');
        }
    }

    // Handle form-data or x-www-form-urlencoded
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
        try {
            const formData = await request.formData();
            return {
                name: formData.get('name') as string | null,
                email: formData.get('email') as string | null,
                password: formData.get('password') as string | null
            };
        } catch (error) {
            throw new Error('Invalid form data');
        }
    }

    throw new Error('Unsupported content type. Please use application/json or multipart/form-data');
}

export async function POST(request: Request) {
    try {

        // Parse request body (supports both JSON and form-data)
        const contentType = request.headers.get('content-type') || '';
        logger.info('📦 Content-Type:', contentType);
        const { email, password } = await parseRequestBody(request);

        logger.info('🔐 Login attempt for:', email);

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
            logger.warn('❌ User not found:', sanitizedEmail);
            await new Promise(resolve => setTimeout(resolve, 200)); // Prevent timing attacks
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'Invalid credentials.' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        const user = userArr[0];

        // Check if user has password
        if (!user.hashedPassword) {
            logger.warn('❌ User without password:', sanitizedEmail);
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
            logger.error('❌ Password comparison error:', bcryptError);
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'Authentication error occurred.' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        if (!isPasswordValid) {
            logger.warn('❌ Invalid password for:', sanitizedEmail);
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

        logger.info('✅ Login successful for:', sanitizedEmail);

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
        logger.error('💥 Login error:', error);

        const errorMessage = process.env.NODE_ENV === 'development'
            ? `Internal server error: ${error.message}`
            : 'An internal server error occurred.';

        return addCorsHeaders(new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        ));
    }
}