 // /api/user-info+api.ts
import addCorsHeaders, { AuthUser, withAuth } from '@/utils/middleware';

export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}

// GET handler
const getHandler = async (request: Request, user: AuthUser) => {
    console.log('=== GET USER INFO START ===');
    console.log('👤 User:', user.email, 'ID:', user.id);

    try {
        // Import modules
        console.log('📦 Importing modules...');
        const { db } = await import('@/db/client');
        const { users, medicalInfo, emergencyContacts } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        console.log('✅ Modules imported');

        const userId = user.id;

        // Query user
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
            console.warn('⚠️ User not found, returning defaults');
            return addCorsHeaders(new Response(
                JSON.stringify({
                    userInfo: {
                        name: user.name || '',
                        email: user.email || '',
                        phone: '',
                    },
                    medicalInfo: {
                        bloodGroup: '',
                        allergies: '',
                        medications: '',
                    },
                    emergencyContacts: [],
                    lastUpdated: new Date().toISOString(),
                    success: true,
                    isNewUser: true,
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Query medical info
        console.log('🔄 Querying medical info...');
        const medicalData = await db
            .select({
                bloodGroup: medicalInfo.bloodGroup,
                allergies: medicalInfo.allergies,
                medications: medicalInfo.medications,
            })
            .from(medicalInfo)
            .where(eq(medicalInfo.userId, userId))
            .limit(1);

        console.log('✅ Medical query done:', medicalData.length);

        // Query contacts
        console.log('🔄 Querying contacts...');
        const contactsData = await db
            .select({
                id: emergencyContacts.id,
                name: emergencyContacts.name,
                phone: emergencyContacts.phone,
                relationship: emergencyContacts.relationship,
                createdAt: emergencyContacts.createdAt,
                updatedAt: emergencyContacts.updatedAt,
            })
            .from(emergencyContacts)
            .where(eq(emergencyContacts.userId, userId))
            .orderBy(emergencyContacts.createdAt);

        console.log('✅ Contacts query done:', contactsData.length);

        // Build response
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

// POST handler
const postHandler = async (request: Request, user: AuthUser) => {
    console.log('=== POST USER INFO START ===');

    try {
        const { db } = await import('@/db/client');
        const { users, medicalInfo, emergencyContacts } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        const body = await request.json();
        const {
            userInfo: userInfoData,
            medicalInfo: medicalInfoData,
            emergencyContacts: emergencyContactsData
        } = body;

        const userId = user.id;
        console.log('💾 Saving for:', userId);

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

        await db.transaction(async (tx) => {
            // Update user
            if (userInfoData) {
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

                await tx
                    .update(users)
                    .set(updateData)
                    .where(eq(users.id, userId));

                console.log('✅ User updated');
            }

            // Upsert medical
            if (medicalInfoData) {
                await tx
                    .insert(medicalInfo)
                    .values({
                        userId: userId,
                        bloodGroup: medicalInfoData.bloodGroup?.trim() || null,
                        allergies: medicalInfoData.allergies?.trim() || null,
                        medications: medicalInfoData.medications?.trim() || null,
                        updatedAt: new Date(),
                    })
                    .onConflictDoUpdate({
                        target: medicalInfo.userId,
                        set: {
                            bloodGroup: medicalInfoData.bloodGroup?.trim() || null,
                            allergies: medicalInfoData.allergies?.trim() || null,
                            medications: medicalInfoData.medications?.trim() || null,
                            updatedAt: new Date(),
                        }
                    });

                console.log('✅ Medical updated');
            }

            // Sync contacts
            if (emergencyContactsData && Array.isArray(emergencyContactsData)) {
                const existingContacts = await tx
                    .select({ id: emergencyContacts.id })
                    .from(emergencyContacts)
                    .where(eq(emergencyContacts.userId, userId));

                const existingIds = existingContacts.map(c => c.id);
                const incomingIds = emergencyContactsData
                    .filter(c => c.id && !c.id.startsWith('temp_'))
                    .map(c => c.id);

                const toDelete = existingIds.filter(id => !incomingIds.includes(id));

                for (const contactId of toDelete) {
                    await tx
                        .delete(emergencyContacts)
                        .where(eq(emergencyContacts.id, contactId));
                }

                if (toDelete.length > 0) {
                    console.log(`🗑️ Deleted ${toDelete.length} contacts`);
                }

                let added = 0;
                let updated = 0;

                for (const contact of emergencyContactsData) {
                    if (!contact.name?.trim() || !contact.phone?.trim()) {
                        continue;
                    }

                    const isNew = !contact.id || contact.id.startsWith('temp_');
                    const contactData = {
                        id: isNew ? crypto.randomUUID() : contact.id,
                        userId: userId,
                        name: contact.name.trim(),
                        phone: contact.phone.trim(),
                        relationship: contact.relationship?.trim() || null,
                        createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date(),
                        updatedAt: new Date(),
                    };

                    if (isNew) {
                        await tx.insert(emergencyContacts).values(contactData);
                        added++;
                    } else {
                        await tx
                            .update(emergencyContacts)
                            .set({
                                name: contactData.name,
                                phone: contactData.phone,
                                relationship: contactData.relationship,
                                updatedAt: contactData.updatedAt,
                            })
                            .where(eq(emergencyContacts.id, contact.id));
                        updated++;
                    }
                }

                console.log(`✅ Contacts: ${added} added, ${updated} updated`);
            }
        });

        console.log('✅ Save complete');
        console.log('=== POST USER INFO END ===');

        return addCorsHeaders(new Response(
            JSON.stringify({
                success: true,
                message: 'Saved successfully',
                lastUpdated: new Date().toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));

    } catch (error: any) {
        console.error('💥 POST ERROR:', error.message);
        console.error('Stack:', error.stack);
        console.log('=== POST USER INFO END (ERROR) ===');

        let errorMessage = 'Failed to save';
        let statusCode = 500;

        if (error.message?.includes('foreign key')) {
            errorMessage = 'User not found';
            statusCode = 404;
        } else if (error.message?.includes('cannot be empty')) {
            errorMessage = error.message;
            statusCode = 400;
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