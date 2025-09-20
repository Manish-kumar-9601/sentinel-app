import { db } from '../../../../db/client';
import { users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { COOKIE_NAME, JWT_SECRET } from '../../../../utils/constants';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // Input validation
        if (!email || !password) {
            console.log(email,password)
            return new Response(JSON.stringify({ error: 'Email and password are required.' }), { status: 400 });
        }

        // Additional validation
        if (typeof email !== 'string' || typeof password !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid input format.' }), { status: 400 });
        }

        if (password.length < 6) {
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }

        // Rate limiting could be implemented here
        // Example: Check if this IP has made too many requests

        const userArr = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);

        if (userArr.length === 0) {
            console.log(userArr)
            // User not found, return a generic error to prevent email enumeration
            console.log('Login attempt for non-existent email:', email);
            
            // Add a small delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 200));
            
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }

        const user = userArr[0];

        // Check if user has a hashed password
        if (!user.hashedPassword) {
            console.log('User without password attempted login:', email);
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            console.log('Invalid password for user:', email);
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }

        // Create JWT payload with essential user info
        const payload = { 
            id: user.id, 
            email: user.email, 
            name: user.name,
            iat: Math.floor(Date.now() / 1000) // issued at time
        };
        
        const token = jwt.sign(payload, JWT_SECRET, { 
            expiresIn: '24h',
            algorithm: 'HS256' // explicitly specify algorithm
        });

        // Set secure cookie
        const isProduction = process.env.NODE_ENV === 'production';
        const cookie = `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax${isProduction ? '; Secure' : ''}`;

        // Remove sensitive data from response
        const { hashedPassword: _, createdAt, updatedAt, ...userResponse } = user;

        console.log('Successful login for user:', email);

        return new Response(JSON.stringify({ 
            user: userResponse,
            message: 'Login successful'
        }), {
            status: 200,
            headers: { 
                'Set-Cookie': cookie,
                'Content-Type': 'application/json'
            },
        });

    } catch (error) {
        console.error('Login error:', error);
        
        // Don't expose internal error details in production
        const errorMessage = process.env.NODE_ENV === 'development' 
            ? `Internal server error: ${error.message}` 
            : 'An internal server error occurred.';
            
        return new Response(JSON.stringify({ error: errorMessage }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}