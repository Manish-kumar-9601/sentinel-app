export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'API is working!',
      timestamp: new Date().toISOString(),
      env: {
        hasJWT: !!process.env.JWT_SECRET,
        hasDB: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV
      }
    }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}