import { db } from '../../../../db/client';
import { users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // Replaced jose with jsonwebtoken
import { COOKIE_NAME, JWT_SECRET } from '../../../../utils/constants';
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

    // --- Create JWT with jsonwebtoken ---
    const payload = { id: newUser.id, email: newUser.email, name: newUser.name };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    const cookie = `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax; ${process.env.NODE_ENV !== 'development' ? 'Secure;' : ''}`;

    const { hashedPassword: _, ...userWithoutPassword } = newUser;

    return new Response(JSON.stringify({ user: userWithoutPassword }), {
      status: 201,
      headers: { 'Set-Cookie': cookie },
    });

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), { status: 500 });
  }
}
