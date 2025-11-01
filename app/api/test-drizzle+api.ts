// app/api/test-drizzle+api.ts

export async function GET() {
    console.log('🧪 Testing Drizzle ORM setup...');

    try {
        // Test 1: Import db client
        console.log('📦 Step 1: Importing db client...');
        let db;
        try {
            const dbModule = await import('@/db/client');
            db = dbModule.db;
            console.log('✅ db imported:', typeof db);
        } catch (error: any) {
            console.error('❌ Failed to import db:', error.message);
            throw new Error(`DB import failed: ${error.message}`);
        }

        // Test 2: Import schema
        console.log('📦 Step 2: Importing schema...');
        let users, medicalInfo, emergencyContacts;
        try {
            const schemaModule = await import('@/db/schema');
            users = schemaModule.users;
            medicalInfo = schemaModule.medicalInfo;
            emergencyContacts = schemaModule.emergencyContacts;
            console.log('✅ Schema imported:', {
                users: typeof users,
                medicalInfo: typeof medicalInfo,
                emergencyContacts: typeof emergencyContacts
            });
        } catch (error: any) {
            console.error('❌ Failed to import schema:', error.message);
            throw new Error(`Schema import failed: ${error.message}`);
        }

        // Test 3: Import drizzle-orm
        console.log('📦 Step 3: Importing drizzle-orm...');
        let eq;
        try {
            const drizzleModule = await import('drizzle-orm');
            eq = drizzleModule.eq;
            console.log('✅ drizzle-orm imported, eq:', typeof eq);
        } catch (error: any) {
            console.error('❌ Failed to import drizzle-orm:', error.message);
            throw new Error(`drizzle-orm import failed: ${error.message}`);
        }

        // Test 4: Try a simple query
        console.log('🔄 Step 4: Testing simple query...');
        try {
            const result = await db.select().from(users).limit(1);
            console.log('✅ Query successful, results:', result.length);
        } catch (error: any) {
            console.error('❌ Query failed:', error.message);
            throw new Error(`Query failed: ${error.message}`);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Drizzle ORM setup is working!',
                checks: {
                    dbImported: !!db,
                    schemaImported: !!(users && medicalInfo && emergencyContacts),
                    drizzleOrmImported: !!eq,
                    queryWorks: true
                },
                timestamp: new Date().toISOString()
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );

    } catch (error: any) {
        console.error('💥 Drizzle test failed:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                timestamp: new Date().toISOString()
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}