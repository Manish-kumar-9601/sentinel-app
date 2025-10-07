export async function GET() {
    const requiredEnvVars = {
        JWT_SECRET: !!process.env.JWT_SECRET,
        DATABASE_URL: !!process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
    };

    const missingVars = Object.entries(requiredEnvVars)
        .filter(([_, exists]) => !exists)
        .map(([name]) => name);

    if (missingVars.length > 0) {
        return new Response(
            JSON.stringify({
                status: 'error',
                message: 'Missing required environment variables',
                missing: missingVars
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
        JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
}