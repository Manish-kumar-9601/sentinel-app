// app/api/location+api.ts
import { db } from '@/db/client';
import { users } from '@/db/schema';
import addCorsHeaders from '@/utils/middleware';
import { eq, sql } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Normalize input to always be an array
        const locationsToProcess = Array.isArray(body) ? body : [body];
        console.log('locationsToProcess', locationsToProcess)
        if (locationsToProcess.length === 0) {
            return addCorsHeaders(new Response(JSON.stringify({ message: "No data provided" }), { status: 400 }));
        }

        // 2. Prepare the statements (Do not await them yet)
        // We use the `sql` append method to prevent race conditions (data overwriting)
        const batchStatements = locationsToProcess.map((location) => {
            return db.update(users)
                .set({
                    // Postgres Syntax: Append new JSON object to the existing array
                    location: sql`${users.location} || ${JSON.stringify(location)}::jsonb`
                })
                .where(eq(users.id, location.userId));
        });

        // 3. Execute all updates in ONE single HTTP request
        const result = await db.batch(batchStatements as any);
        console.log('location response result', result)
        return addCorsHeaders(new Response(JSON.stringify({ success: true }), { status: 200 }));

    } catch (error) {
        console.error("Location update error:", error);
        return addCorsHeaders(new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 }));
    }
}