import { db } from '../../../../db/client';
import { users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { COOKIE_NAME, JWT_SECRET } from '../../../../utils/constants';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: 'All fields are required.' }), { status: 400 });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

    if (existingUser.length > 0) {
      return new Response(JSON.stringify({ error: 'User with this email already exists.' }), { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const newUserArr = await db.insert(users).values({
      id: userId,
      name,
      email: email.toLowerCase(),
      hashedPassword,
    }).returning();

    const newUser = newUserArr[0];

    const secret = new TextEncoder().encode(JWT_SECRET);
    const alg = 'HS256';

    const token = await new jose.SignJWT({ id: newUser.id, email: newUser.email, name: newUser.name })
      .setProtectedHeader({ alg })
      .setExpirationTime('24h')
      .setIssuedAt()
      .sign(secret);
      
    cookies().set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
    });

    const { hashedPassword: _, ...userWithoutPassword } = newUser;

    return new Response(JSON.stringify({ user: userWithoutPassword }), { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), { status: 500 });
  }
}
