/// <reference lib="dom" />
import { db } from '../../../db/client';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { COOKIE_NAME, JWT_SECRET } from '../../../utils/constants';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../utils/logger';
import addCorsHeaders from '../../../utils/middleware';

// Handle OPTIONS preflight request
export async function OPTIONS(request: Request) {
  return addCorsHeaders(new Response(null, { status: 204 }));
}

export async function POST(request: Request) {
  logger.info('📝 Registration attempt started');

  try {
    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const email = formData.get('email') as string | null;
    const password = formData.get('password') as string | null;

    logger.info('📦 Received registration data', {
      name,
      email,
      hasPassword: !!password,
    });

    // Validation
    if (!name || !email || !password) {
      logger.warn('❌ Missing required fields');
      return addCorsHeaders(new Response(JSON.stringify({
        error: 'Name, email and password are required.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Validate name length
    if (name.trim().length < 2 || name.trim().length > 100) {
      return addCorsHeaders(new Response(JSON.stringify({
        error: 'Name must be between 2 and 100 characters.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Validate password strength
    if (password.length < 8) {
      return addCorsHeaders(new Response(JSON.stringify({
        error: 'Password must be at least 8 characters long.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Simple email validation
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!emailRegex.test(email)) {
    //   return addCorsHeaders(new Response(JSON.stringify({
    //     error: 'Invalid email format.'
    //   }), {
    //     status: 400,
    //     headers: { 'Content-Type': 'application/json' }
    //   }));
    // }

    // Sanitize and normalize email
    const sanitizedEmail = email.toLowerCase().trim();

    // Check JWT_SECRET
    if (!JWT_SECRET) {
      logger.error('❌ JWT_SECRET is not configured!');
      return addCorsHeaders(new Response(JSON.stringify({
        error: 'Server configuration error.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    logger.info('🔍 Checking for existing user...');

    const existingUserArr = await db
      .select()
      .from(users)
      .where(eq(users.email, sanitizedEmail))
      .limit(1);

    if (existingUserArr.length > 0) {
      logger.warn('❌ User already exists');
      return addCorsHeaders(new Response(JSON.stringify({
        error: 'User with this email already exists.'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    logger.info('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);

    logger.info('💾 Creating user in database...');
    const userId = uuidv4();
    const newUserArr = await db
      .insert(users)
      .values({
        id: userId,
        name: name.trim(),
        email: sanitizedEmail,
        hashedPassword: hashedPassword,
      })
      .returning();
    const newUser = newUserArr[0];

    logger.info('🎫 Generating JWT token...');
    const payload = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '24h',
      algorithm: 'HS256'
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookie = `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax${isProduction ? '; Secure' : ''}`;

    const { hashedPassword: _, ...userWithoutPassword } = newUser;

    logger.info('✅ Registration successful for:', sanitizedEmail);

    return addCorsHeaders(new Response(JSON.stringify({
      user: userWithoutPassword,
      message: 'Registration successful',
      token: token // Include token in response for mobile app
    }), {
      status: 201,
      headers: {
        'Set-Cookie': cookie,
        'Content-Type': 'application/json'
      },
    }));

  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('Failed to parse')) {
      logger.error('💥 Invalid request body format. Expected form-data.', error);
      return addCorsHeaders(new Response(JSON.stringify({
        error: 'Invalid request format.',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    logger.error('💥 Registration error:', error);
    logger.error('Error stack:', error.stack);

    return addCorsHeaders(new Response(JSON.stringify({
      error: 'An internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}