// app/api/user-info+api.ts
import { db } from '@/db/client';
import { emergencyContacts, medicalInfo, users } from '@/db/schema';
import addCorsHeaders, { AuthUser, withAuth } from '@/utils/middleware';
import { eq } from 'drizzle-orm';

export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}

// GET handler - Fetch user info
const getHandler = async (request: Request, user: AuthUser) => {
    console.log('=== GET USER INFO START ===');
    console.log('👤 User:', user.email, 'ID:', user.id);

    try {
        const userId = user.id;

        // Fetch user data
        console.log('🔄 Querying user...');
        const userData = await db
            .select({
                name: users.name,
                email: users.email,
                phone: users.phone,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        console.log('✅ User query done:', userData.length);

        if (userData.length === 0) {
            console.warn('⚠️ User not found in database');
            return addCorsHeaders(new Response(
                JSON.stringify({
                    userInfo: { name: user.name || '', email: user.email || '', phone: '' },
                    medicalInfo: { bloodGroup: '', allergies: '', medications: '' },
                    emergencyContacts: [],
                    lastUpdated: new Date().toISOString(),
                    success: true,
                    isNewUser: true,
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Fetch medical info
        console.log('🔄 Querying medical info...');
        const medicalData = await db
            .select()
            .from(medicalInfo)
            .where(eq(medicalInfo.userId, userId))
            .limit(1);

        console.log('✅ Medical query done:', medicalData.length);

        // Fetch contacts
        console.log('🔄 Querying contacts...');
        const contactsData = await db
            .select()
            .from(emergencyContacts)
            .where(eq(emergencyContacts.userId, userId));

        console.log('✅ Contacts query done:', contactsData.length);

        const response = {
            userInfo: {
                name: userData[0].name || '',
                email: userData[0].email || '',
                phone: userData[0].phone || '',
            },
            medicalInfo: medicalData.length > 0 ? {
                bloodGroup: medicalData[0].bloodGroup || '',
                allergies: medicalData[0].allergies || '',
                medications: medicalData[0].medications || '',
            } : {
                bloodGroup: '',
                allergies: '',
                medications: '',
            },
            emergencyContacts: contactsData.map(c => ({
                id: c.id,
                name: c.name || '',
                phone: c.phone || '',
                relationship: c.relationship || '',
                createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
                updatedAt: c.updatedAt?.toISOString() || new Date().toISOString(),
            })),
            lastUpdated: new Date().toISOString(),
            success: true,
        };

        console.log('✅ Response ready');
        console.log('=== GET USER INFO END ===');

        return addCorsHeaders(new Response(
            JSON.stringify(response),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));

    } catch (error: any) {
        console.error('💥 GET ERROR:', error.message);
        console.error('Stack:', error.stack);
        console.log('=== GET USER INFO END (ERROR) ===');

        return addCorsHeaders(new Response(
            JSON.stringify({
                error: 'Failed to fetch user information',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                success: false,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        ));
    }
};

// POST handler - Save user info
const postHandler = async (request: Request, user: AuthUser) => {
    console.log('=== POST USER INFO START ===');
    console.log('👤 User:', user.email, 'ID:', user.id);

    try {
        // Parse body with error handling
        let body;
        try {
            body = await request.json();
            console.log('📦 Request body parsed successfully');
        } catch (parseError: any) {
            console.error('❌ Failed to parse request body:', parseError.message);
            return addCorsHeaders(new Response(
                JSON.stringify({
                    error: 'Invalid request body',
                    details: parseError.message,
                    success: false,
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        const {
            userInfo: userInfoData,
            medicalInfo: medicalInfoData,
            emergencyContacts: emergencyContactsData
        } = body;

        console.log('📊 Data received:', {
            hasUserInfo: !!userInfoData,
            hasMedicalInfo: !!medicalInfoData,
            contactsCount: emergencyContactsData?.length || 0
        });

        const userId = user.id;

        // Validation
        if (!userInfoData && !medicalInfoData && !emergencyContactsData) {
            return addCorsHeaders(new Response(
                JSON.stringify({
                    error: 'No data provided',
                    success: false,
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        if (userInfoData && !userInfoData.name?.trim()) {
            return addCorsHeaders(new Response(
                JSON.stringify({
                    error: 'Name is required',
                    success: false,
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // NOTE: neon-http driver does not support transactions
        // We'll execute operations sequentially with error handling
        console.log('🔄 Starting sequential operations...');

        // 1. Update user info
        if (userInfoData) {
            console.log('💾 Updating user info...');

            const updateData: any = {
                updatedAt: new Date(),
            };

            if (userInfoData.name !== undefined) {
                const trimmedName = userInfoData.name?.trim();
                if (!trimmedName) {
                    throw new Error('Name cannot be empty');
                }
                updateData.name = trimmedName;
            }

            if (userInfoData.phone !== undefined) {
                updateData.phone = userInfoData.phone?.trim() || null;
            }

            await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, userId));

            console.log('✅ User info updated');
        }

        // 2. Upsert medical info
        if (medicalInfoData) {
            console.log('💾 Upserting medical info...');

            const medicalData = {
                userId: userId,
                bloodGroup: medicalInfoData.bloodGroup?.trim() || null,
                allergies: medicalInfoData.allergies?.trim() || null,
                medications: medicalInfoData.medications?.trim() || null,
                updatedAt: new Date(),
            };

            // Check if medical info exists
            const existing = await db
                .select({ userId: medicalInfo.userId })
                .from(medicalInfo)
                .where(eq(medicalInfo.userId, userId))
                .limit(1);

            if (existing.length > 0) {
                // Update existing
                await db
                    .update(medicalInfo)
                    .set({
                        bloodGroup: medicalData.bloodGroup,
                        allergies: medicalData.allergies,
                        medications: medicalData.medications,
                        updatedAt: medicalData.updatedAt,
                    })
                    .where(eq(medicalInfo.userId, userId));
            } else {
                // Insert new
                await db
                    .insert(medicalInfo)
                    .values(medicalData);
            }

            console.log('✅ Medical info updated');
        }

        // 3. Sync emergency contacts
        if (emergencyContactsData && Array.isArray(emergencyContactsData)) {
            console.log('💾 Syncing emergency contacts...');

            // Get existing contacts
            const existingContacts = await db
                .select({ id: emergencyContacts.id })
                .from(emergencyContacts)
                .where(eq(emergencyContacts.userId, userId));

            const existingIds = existingContacts.map(c => c.id);
            const incomingIds = emergencyContactsData
                .filter(c => c.id && !c.id.startsWith('temp_') && !c.id.startsWith('contact_'))
                .map(c => c.id);

            // Delete removed contacts
            const toDelete = existingIds.filter(id => !incomingIds.includes(id));

            if (toDelete.length > 0) {
                for (const contactId of toDelete) {
                    await db
                        .delete(emergencyContacts)
                        .where(eq(emergencyContacts.id, contactId));
                }
                console.log(`🗑️ Deleted ${toDelete.length} contacts`);
            }

            // Upsert contacts
            let added = 0;
            let updated = 0;

            for (const contact of emergencyContactsData) {
                if (!contact.name?.trim() || !contact.phone?.trim()) {
                    console.warn('⚠️ Skipping invalid contact');
                    continue;
                }

                const isNew = !contact.id ||
                    contact.id.startsWith('temp_') ||
                    contact.id.startsWith('contact_');

                if (isNew) {
                    // Generate a proper UUID for new contacts
                    const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    await db
                        .insert(emergencyContacts)
                        .values({
                            id: newId,
                            userId: userId,
                            name: contact.name.trim(),
                            phone: contact.phone.trim(),
                            relationship: contact.relationship?.trim() || null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });
                    added++;
                } else {
                    // Update existing contact
                    await db
                        .update(emergencyContacts)
                        .set({
                            name: contact.name.trim(),
                            phone: contact.phone.trim(),
                            relationship: contact.relationship?.trim() || null,
                            updatedAt: new Date(),
                        })
                        .where(eq(emergencyContacts.id, contact.id));
                    updated++;
                }
            }

            console.log(`✅ Contacts: ${added} added, ${updated} updated`);
        }

        console.log('✅ All operations completed successfully');
        console.log('=== POST USER INFO END ===');

        return addCorsHeaders(new Response(
            JSON.stringify({
                success: true,
                message: 'User information saved successfully',
                lastUpdated: new Date().toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));

    } catch (error: any) {
        console.error('💥 POST ERROR:', error.message);
        console.error('Stack:', error.stack);
        console.log('=== POST USER INFO END (ERROR) ===');

        let errorMessage = 'Failed to save user information';
        let statusCode = 500;

        if (error.message?.includes('foreign key')) {
            errorMessage = 'User not found';
            statusCode = 404;
        } else if (error.message?.includes('cannot be empty')) {
            errorMessage = error.message;
            statusCode = 400;
        } else if (error.message?.includes('unique constraint')) {
            errorMessage = 'Duplicate data detected';
            statusCode = 409;
        }

        return addCorsHeaders(new Response(
            JSON.stringify({
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                success: false,
            }),
            { status: statusCode, headers: { 'Content-Type': 'application/json' } }
        ));
    }
};

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);