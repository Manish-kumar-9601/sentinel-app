import { db } from '../../../db/client';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { COOKIE_NAME, JWT_SECRET } from '../../../utils/constants';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  console.log('📝 Registration attempt started');
  
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

    // Check JWT_SECRET
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET is not configured!');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Checking for existing user...');
    
    // Check if user exists
    let existingUser;
    try {
      existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      console.log('✅ Database query successful');
    } catch (dbError) {
      console.error('❌ Database query failed:', dbError);
      console.error('Error details:', {
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
      console.log('❌ User already exists');
      return new Response(JSON.stringify({ error: 'User with this email already exists.' }), { 
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('💾 Creating user in database...');
    const userId = uuidv4();

    let newUserArr;
    try {
      newUserArr = await db.insert(users).values({
        id: userId,
        name,
        email: email.toLowerCase(),
        hashedPassword,
      }).returning();
      console.log('✅ User created successfully');
    } catch (insertError) {
      console.error('❌ Failed to insert user:', insertError);
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

    console.log('✅ Registration successful for:', email);

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
    console.error('💥 Registration error:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'An internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}