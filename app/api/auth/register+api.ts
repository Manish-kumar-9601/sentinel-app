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

export async function OPTIONS(request: Request) {
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
  logger.info('📝 Registration attempt started');

  try {
    // Test database connection first
    logger.info('🔌 Testing database connection...');
    try {
      await db.select().from(users).limit(1);
      logger.info('✅ Database connection successful');
    } catch (dbError: any) {
      logger.error('❌ Database connection failed:', dbError);
      return addCorsHeaders(new Response(JSON.stringify({
        error: 'Database connection error',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Parse request body (supports both JSON and form-data)
    const contentType = request.headers.get('content-type') || '';
    logger.info('📦 Content-Type:', contentType);

    let name: string | null;
    let email: string | null;
    let password: string | null;

    try {
      const parsed = await parseRequestBody(request);
      name = parsed.name;
      email = parsed.email;
      password = parsed.password;
      
      logger.info('📦 Received data:', { 
        hasName: !!name, 
        hasEmail: !!email, 
        hasPassword: !!password,
        nameValue: name,
        emailValue: email
      });
    } catch (parseError: any) {
      logger.error('❌ Failed to parse request body:', parseError);
      return addCorsHeaders(new Response(JSON.stringify({
        error: parseError.message || 'Invalid request body format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Validation
    if (!name || !email || !password) {
      logger.warn('❌ Missing required fields', { hasName: !!name, hasEmail: !!email, hasPassword: !!password });
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return addCorsHeaders(new Response(JSON.stringify({
        error: 'Invalid email format.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    // Sanitize and normalize email
    const sanitizedEmail = email.toLowerCase().trim();
    logger.info('📧 Sanitized email:', sanitizedEmail);

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
      logger.warn('❌ User already exists:', sanitizedEmail);
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
    logger.info('👤 User data to insert:', {
      userId,
      name: name.trim(),
      email: sanitizedEmail,
      hasHashedPassword: !!hashedPassword
    });
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
    logger.info('✅ User created successfully:', { id: newUser.id, email: newUser.email });
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
      token: token
    }), {
      status: 201,
      headers: {
        'Set-Cookie': cookie,
        'Content-Type': 'application/json'
      },
    }));
  } catch (error: any) {
    logger.error('💥 Registration error:', error);
    logger.error('Error name:', error.name);
    logger.error('Error message:', error.message);
    logger.error('Error stack:', error.stack);
    if (error.code) {
      logger.error('Database error code:', error.code);
    }
    return addCorsHeaders(new Response(JSON.stringify({
      error: 'An internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      } : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}