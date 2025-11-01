// app/api/test-user-info-noauth+api.ts
// TEMPORARY - Just to test if the issue is in the handler or middleware

export async function GET(request: Request) {
    console.log('🧪 Testing user-info handler without auth...');

    try {
        // Step 1: Import db
        console.log('📦 Importing db...');
        const { db } = await import('@/db/client');
        console.log('✅ db imported');

        // Step 2: Import schema
        console.log('📦 Importing schema...');
        const { users, medicalInfo, emergencyContacts } = await import('@/db/schema');
        console.log('✅ schema imported');

        // Step 3: Import drizzle functions
        console.log('📦 Importing drizzle-orm...');
        const { eq } = await import('drizzle-orm');
        console.log('✅ drizzle-orm imported');

        // Use a hardcoded test user ID (the one from your logs)
        const testUserId = '2261b06e-3881-4a52-bb8d-1b1b96ba9afe';

        // Step 4: Query users table
        console.log('🔄 Querying users table...');
        const userData = await db
            .select({
                name: users.name,
                email: users.email,
                phone: users.phone,
            })
            .from(users)
            .where(eq(users.id, testUserId))
            .limit(1);

        console.log('✅ Query completed, records:', userData.length);

        if (userData.length === 0) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'User not found',
                    userId: testUserId
                }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Step 5: Query medical info
        console.log('🔄 Querying medical info...');
        const medicalData = await db
            .select()
            .from(medicalInfo)
            .where(eq(medicalInfo.userId, testUserId))
            .limit(1);

        console.log('✅ Medical query completed, records:', medicalData.length);

        // Step 6: Query contacts
        console.log('🔄 Querying contacts...');
        const contactsData = await db
            .select()
            .from(emergencyContacts)
            .where(eq(emergencyContacts.userId, testUserId));

        console.log('✅ Contacts query completed, records:', contactsData.length);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'All queries worked!',
                data: {
                    userFound: userData.length > 0,
                    userName: userData[0]?.name,
                    userEmail: userData[0]?.email,
                    hasMedicalInfo: medicalData.length > 0,
                    contactsCount: contactsData.length
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
        console.error('💥 Error in test handler:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                errorName: error.name,
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