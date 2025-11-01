// app/api/user-info+api.ts
import addCorsHeaders, { AuthUser, withAuth } from '../../utils/middleware';

export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}

// GET handler - Fetch user information
const getHandler = async (request: Request, user: AuthUser) => {
    console.log('=== GET USER INFO START ===');
    console.log('📋 Request from user:', user.email);
    console.log('👤 User ID:', user.id);

    try {
        // Dynamic imports to avoid initialization issues
        const { db } = await import('@/db/client');
        const { users, medicalInfo, emergencyContacts } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        console.log('✅ All modules imported successfully');

        const userId = user.id;

        // Fetch user info
        console.log('🔄 Querying users table...');
        const userData = await db
            .select({
                name: users.name,
                email: users.email,
                phone: users.phone,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        console.log('✅ User query completed. Records found:', userData.length);

        if (userData.length === 0) {
            console.warn('⚠️ User not found in database. Returning default data.');

            const defaultResponse = {
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
            };

            return addCorsHeaders(new Response(
                JSON.stringify(defaultResponse),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Fetch medical info
        console.log('🔄 Fetching medical info...');
        let medicalData: any[] = [];
        try {
            medicalData = await db
                .select({
                    bloodGroup: medicalInfo.bloodGroup,
                    allergies: medicalInfo.allergies,
                    medications: medicalInfo.medications,
                })
                .from(medicalInfo)
                .where(eq(medicalInfo.userId, userId))
                .limit(1);
            console.log('✅ Medical info query completed. Records:', medicalData.length);
        } catch (dbError: any) {
            console.error('⚠️ Error fetching medical info:', dbError.message);
            medicalData = [];
        }

        // Fetch emergency contacts
        console.log('🔄 Fetching emergency contacts...');
        let contactsData: any[] = [];
        try {
            contactsData = await db
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
            console.log('✅ Contacts query completed. Records:', contactsData.length);
        } catch (dbError: any) {
            console.error('⚠️ Error fetching contacts:', dbError.message);
            contactsData = [];
        }

        // Build response
        const defaultMedicalInfo = {
            bloodGroup: '',
            allergies: '',
            medications: '',
        };

        const userInfoResult = userData[0];
        const medicalInfoResult = medicalData.length > 0 ? medicalData[0] : defaultMedicalInfo;

        const response = {
            userInfo: {
                name: userInfoResult.name || '',
                email: userInfoResult.email || '',
                phone: userInfoResult.phone || '',
            },
            medicalInfo: {
                bloodGroup: medicalInfoResult.bloodGroup || '',
                allergies: medicalInfoResult.allergies || '',
                medications: medicalInfoResult.medications || '',
            },
            emergencyContacts: (contactsData || []).map(contact => ({
                id: contact.id,
                name: contact.name || '',
                phone: contact.phone || '',
                relationship: contact.relationship || '',
                createdAt: contact.createdAt?.toISOString() || new Date().toISOString(),
                updatedAt: contact.updatedAt?.toISOString() || new Date().toISOString(),
            })),
            lastUpdated: new Date().toISOString(),
            success: true,
        };

        console.log('✅ User info fetched successfully');
        console.log('📊 Response summary:', {
            userName: response.userInfo.name,
            hasPhone: !!response.userInfo.phone,
            contactsCount: response.emergencyContacts.length
        });
        console.log('=== GET USER INFO END ===');

        return addCorsHeaders(new Response(
            JSON.stringify(response),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));

    } catch (error: any) {
        console.error('💥 CRITICAL ERROR in getHandler:');
        console.error('   Message:', error.message);
        console.error('   Name:', error.name);
        if (process.env.NODE_ENV === 'development') {
            console.error('   Stack:', error.stack);
        }
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

// POST handler - Save user information
const postHandler = async (request: Request, user: AuthUser) => {
    console.log('=== POST USER INFO START ===');

    try {
        // Dynamic imports
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
        console.log('💾 Saving user info for:', userId);

        // Validate payload
        if (!userInfoData && !medicalInfoData && !emergencyContactsData) {
            return addCorsHeaders(new Response(
                JSON.stringify({
                    error: 'No data provided to save',
                    success: false,
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Validate required fields
        if (userInfoData && !userInfoData.name?.trim()) {
            return addCorsHeaders(new Response(
                JSON.stringify({
                    error: 'Name is required',
                    success: false,
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Use transaction for atomicity
        await db.transaction(async (tx) => {
            // Update user info
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

                console.log('✅ User info updated');
            }

            // Upsert medical info
            if (medicalInfoData) {
                const medicalDataToSave = {
                    userId: userId,
                    bloodGroup: medicalInfoData.bloodGroup?.trim() || null,
                    allergies: medicalInfoData.allergies?.trim() || null,
                    medications: medicalInfoData.medications?.trim() || null,
                    updatedAt: new Date(),
                };

                await tx
                    .insert(medicalInfo)
                    .values(medicalDataToSave)
                    .onConflictDoUpdate({
                        target: medicalInfo.userId,
                        set: {
                            bloodGroup: medicalDataToSave.bloodGroup,
                            allergies: medicalDataToSave.allergies,
                            medications: medicalDataToSave.medications,
                            updatedAt: medicalDataToSave.updatedAt,
                        }
                    });

                console.log('✅ Medical info updated');
            }

            // Sync emergency contacts
            if (emergencyContactsData && Array.isArray(emergencyContactsData)) {
                // Get existing contacts
                const existingContacts = await tx
                    .select({ id: emergencyContacts.id })
                    .from(emergencyContacts)
                    .where(eq(emergencyContacts.userId, userId));

                const existingContactIds = existingContacts.map(c => c.id);
                const incomingContactIds = emergencyContactsData
                    .filter(c => c.id && !c.id.startsWith('temp_'))
                    .map(c => c.id);

                // Delete removed contacts
                const contactsToDelete = existingContactIds.filter(
                    id => !incomingContactIds.includes(id)
                );

                for (const contactId of contactsToDelete) {
                    await tx
                        .delete(emergencyContacts)
                        .where(eq(emergencyContacts.id, contactId));
                }

                if (contactsToDelete.length > 0) {
                    console.log(`🗑️ Deleted ${contactsToDelete.length} contacts`);
                }

                // Upsert contacts
                let addedCount = 0;
                let updatedCount = 0;

                for (const contact of emergencyContactsData) {
                    if (!contact.name?.trim() || !contact.phone?.trim()) {
                        console.warn('⚠️ Skipping invalid contact');
                        continue;
                    }

                    const isNewContact = !contact.id || contact.id.startsWith('temp_');
                    const contactData = {
                        id: isNewContact ? crypto.randomUUID() : contact.id,
                        userId: userId,
                        name: contact.name.trim(),
                        phone: contact.phone.trim(),
                        relationship: contact.relationship?.trim() || null,
                        createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date(),
                        updatedAt: new Date(),
                    };

                    if (isNewContact) {
                        await tx
                            .insert(emergencyContacts)
                            .values(contactData);
                        addedCount++;
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
                        updatedCount++;
                    }
                }

                console.log(`✅ Contacts synced: ${addedCount} added, ${updatedCount} updated`);
            }
        });

        console.log('✅ All user info saved successfully');
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
        console.error('💥 Error saving user info:', error);
        console.log('=== POST USER INFO END (ERROR) ===');

        let errorMessage = 'Failed to save user information';
        let statusCode = 500;

        if (error.message?.includes('foreign key')) {
            errorMessage = 'User account not found';
            statusCode = 404;
        } else if (error.message?.includes('unique constraint')) {
            errorMessage = 'Data conflict occurred';
            statusCode = 409;
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