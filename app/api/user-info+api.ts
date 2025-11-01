import { db } from '@/db/client';
import { eq } from 'drizzle-orm';
import { emergencyContacts, medicalInfo, users } from '../../db/schema';
import addCorsHeaders, { AuthUser, withAuth } from '../../utils/middleware';

export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}

// GET handler - Fetch user information
const getHandler = async (request: Request, user: AuthUser) => {
    try {
        const userId = user.id;
        console.log('📋 Fetching user info for:', userId);
        console.log('🔍 Database instance:', typeof db);
        console.log('🔍 Users table:', typeof users);

        // Fetch user info with error handling
        let userData;
        try {
            console.log('🔄 Querying users table...');
            userData = await db
                .select({
                    name: users.name,
                    email: users.email,
                    phone: users.phone,
                })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);
            console.log('✅ User data query completed:', userData.length, 'records');
        } catch (dbError: any) {
            console.error('❌ Database error fetching user:', dbError);
            console.error('❌ Error stack:', dbError.stack);
            throw new Error('Failed to fetch user data from database: ' + dbError.message);
        }

        if (userData.length === 0) {
            console.warn('⚠️ User not found in database:', userId);

            // Return default empty data for new users instead of error
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

            console.log('ℹ️ Returning default data for new user');

            return addCorsHeaders(new Response(
                JSON.stringify(defaultResponse),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Fetch medical info
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
        } catch (dbError: any) {
            console.error('❌ Database error fetching medical info:', dbError);
            // Continue with empty medical info rather than failing
            medicalData = [];
        }

        // Fetch emergency contacts
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
        } catch (dbError: any) {
            console.error('❌ Database error fetching contacts:', dbError);
            // Continue with empty contacts rather than failing
            contactsData = [];
        }

        // Ensure contactsData is always an array
        if (!contactsData) {
            contactsData = [];
        }

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

        return addCorsHeaders(new Response(
            JSON.stringify(response),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        ));

    } catch (error: any) {
        console.error('💥 Error fetching user info:', error);
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
    try {
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

                try {
                    await tx
                        .update(users)
                        .set(updateData)
                        .where(eq(users.id, userId));

                    console.log('✅ User info updated');
                } catch (dbError: any) {
                    console.error('❌ Error updating user:', dbError);
                    throw new Error('Failed to update user information');
                }
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

                try {
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
                } catch (dbError: any) {
                    console.error('❌ Error updating medical info:', dbError);
                    throw new Error('Failed to update medical information');
                }
            }

            // Sync emergency contacts
            if (emergencyContactsData && Array.isArray(emergencyContactsData)) {
                try {
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
                        // Validate contact data
                        if (!contact.name?.trim() || !contact.phone?.trim()) {
                            console.warn('⚠️ Skipping invalid contact:', contact);
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
                } catch (dbError: any) {
                    console.error('❌ Error syncing contacts:', dbError);
                    throw new Error('Failed to update emergency contacts');
                }
            }
        });

        console.log('✅ All user info saved successfully');

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