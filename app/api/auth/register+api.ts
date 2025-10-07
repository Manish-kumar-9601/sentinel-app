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
    const body = await request.json();
    const { name, email, password } = body;

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return addCorsHeaders(new Response(JSON.stringify({
        error: 'Invalid email format.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Sanitize and normalize email - FIXED
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

    // Check if user exists - FIXED query
    let existingUserArr;
    try {
      existingUserArr = await db
        .select()
        .from(users)
        .where(eq(users.email, sanitizedEmail))
        .limit(1);

      logger.info('✅ Database query successful', {
        found: existingUserArr.length > 0
      });
    } catch (dbError: any) {
      logger.error('❌ Database query failed:', dbError);
      logger.error('Error details:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        query: dbError.query
      });

      return addCorsHeaders(new Response(JSON.stringify({
        error: 'Database error. Please try again.',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Verify the hash was created correctly
    const verifyHash = await bcrypt.compare(password, hashedPassword);
    if (!verifyHash) {
      logger.error('❌ Password hashing verification failed');
      return addCorsHeaders(new Response(JSON.stringify({
        error: 'Password processing error.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    logger.info('💾 Creating user in database...');
    const userId = uuidv4();
    // FIXED: Properly structured insert with all fields
    let newUserArr;
    try {
      const insertData = {
        id: userId,
        name: name.trim(),
        email: sanitizedEmail,
        hashedPassword: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      logger.info('Inserting user with data:', {
        id: insertData.id,
        email: insertData.email,
      });
      newUserArr = await db
        .insert(users)
        .values(insertData)
        .returning();
      logger.info('✅ User created successfully');
    } catch (insertError: any) {
      logger.error('❌ Failed to insert user:', insertError);
      logger.error('Insert error details:', {
        message: insertError.message,
        code: insertError.code,
        detail: insertError.detail,
        constraint: insertError.constraint
      });

      return addCorsHeaders(new Response(JSON.stringify({
        error: 'Failed to create user account.',
        details: process.env.NODE_ENV === 'development' ? insertError.message : undefined
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

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

    const { hashedPassword: _, createdAt, updatedAt, ...userWithoutPassword } = newUser;

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