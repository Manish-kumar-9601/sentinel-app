import { db } from '../../../db/client';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { COOKIE_NAME, JWT_SECRET } from '../../../utils/constants';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../utils/logger';
export async function POST(request: Request) {
  logger.info('📝 Registration attempt started');

  try {
    const body = await request.json();
    const { name, email, password } = body;

    console.log('📦 Received registration:', { name, email, passwordLength: password?.length });

    // Validation
    if (!name || !email || !password) {
      console.log('❌ Missing required fields');
      return new Response(JSON.stringify({ error: 'All fields are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Sanitize email input
    const sanitizedEmail = email.toLowerCase().trim().replace(/[^\w@.-]/g, '');

    if (sanitizedEmail !== email.toLowerCase().trim()) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // Check JWT_SECRET
    if (!JWT_SECRET) {
      logger.error('❌ JWT_SECRET is not configured!');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('🔍 Checking for existing user...');

    // Check if user exists
    let existingUser;
    try {
      existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      logger.info('✅ Database query successful');
    } catch (dbError) {
      logger.error('❌ Database query failed:', dbError);
      logger.error('Error details:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail
      });

      return new Response(JSON.stringify({
        error: 'Database connection failed. Please ensure migrations have been run.',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (existingUser.length > 0) {
      logger.warn('❌ User already exists');
      return new Response(JSON.stringify({ error: 'User with this email already exists.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('🔐 Hashing password...');
    // Add password strength validation
    const hashedPassword = await bcrypt.hash(password, 12); // Increase cost factor to 12

    // Verify the hash was created correctly
    const verifyHash = await bcrypt.compare(password, hashedPassword);
    if (!verifyHash) {
      logger.error('Password hashing verification failed');
      throw new Error('Password hashing failed');
    }
    logger.info('💾 Creating user in database...');
    const userId = uuidv4();

    let newUserArr;
    try {
      newUserArr = await db.insert(users).values({
        id: userId,
        name,
        email: email.toLowerCase(),
        hashedPassword,
      }).returning();
      logger.info('✅ User created successfully');
    } catch (insertError) {
      logger.error('❌ Failed to insert user:', insertError);
      return new Response(JSON.stringify({
        error: 'Failed to create user account.',
        details: process.env.NODE_ENV === 'development' ? insertError.message : undefined
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newUser = newUserArr[0];

    console.log('🎫 Generating JWT token...');
    const payload = { id: newUser.id, email: newUser.email, name: newUser.name };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookie = `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax${isProduction ? '; Secure' : ''}`;

    const { hashedPassword: _, ...userWithoutPassword } = newUser;

    logger.info('✅ Registration successful for:', email);

    return new Response(JSON.stringify({
      user: userWithoutPassword,
      message: 'Registration successful'
    }), {
      status: 201,
      headers: {
        'Set-Cookie': cookie,
        'Content-Type': 'application/json'
      },
    });

  } catch (error) {
    logger.error('💥 Registration error:', error);
    logger.error('Error stack:', error.stack);

    return new Response(JSON.stringify({
      error: 'An internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}