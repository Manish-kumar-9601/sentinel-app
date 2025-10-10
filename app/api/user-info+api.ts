import { db } from '@/db/client';
import { users, medicalInfo, emergencyContacts } from '../../db/schema';
import addCorsHeaders, { withAuth, AuthUser } from '../../utils/middleware';
import { eq } from 'drizzle-orm';

export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}

// GET handler
const getHandler = async (request: Request, user: AuthUser) => {
    try {
        const userId = user.id;
        console.log('📋 Fetching user info for:', userId);

        // Fetch user info
        const userData = await db
            .select({
                name: users.name,
                email: users.email,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        // Fetch medical info
        const medicalData = await db
            .select({
                bloodGroup: medicalInfo.bloodGroup,
                allergies: medicalInfo.allergies,
                medications: medicalInfo.medications,
                emergencyContactName: medicalInfo.emergencyContactName,
                emergencyContactPhone: medicalInfo.emergencyContactPhone
            })
            .from(medicalInfo)
            .where(eq(medicalInfo.userId, userId))
            .limit(1);

        // Fetch emergency contacts
        const contactsData = await db
            .select({
                id: emergencyContacts.id,
                name: emergencyContacts.name,
                phone: emergencyContacts.phone,
                relationship: emergencyContacts.relationship,
                createdAt: emergencyContacts.createdAt
            })
            .from(emergencyContacts)
            .where(eq(emergencyContacts.userId, userId))
            .orderBy(emergencyContacts.createdAt);

        const defaultUserInfo = {
            name: '',
            email: '',
            phone: '',
        };

        const defaultMedicalInfo = {
            bloodGroup: '',
            allergies: '',
            medications: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
        };

        const userInfoResult = userData.length > 0 ? userData[0] : defaultUserInfo;
        const medicalInfoResult = medicalData.length > 0 ? medicalData[0] : defaultMedicalInfo;

        console.log('✅ User info fetched successfully');

        return addCorsHeaders(new Response(
            JSON.stringify({
                userInfo: {
                    name: userInfoResult.name || '',
                    email: userInfoResult.email || '',
            
                },
                medicalInfo: {
                    bloodGroup: medicalInfoResult.bloodGroup || '',
                    allergies: medicalInfoResult.allergies || '',
                    medications: medicalInfoResult.medications || '',
                    emergencyContactName: medicalInfoResult.emergencyContactName || '',
                    emergencyContactPhone: medicalInfoResult.emergencyContactPhone || '',
                },
                emergencyContacts: contactsData.map(contact => ({
                    id: contact.id,
                    name: contact.name || '',
                    phone: contact.phone || '',
                    relationship: contact.relationship || '',
                    createdAt: contact.createdAt
                })),
                lastUpdated: new Date().toISOString()
            }),
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
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        ));
    }
};

// POST handler
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

        if (!userInfoData && !medicalInfoData && !emergencyContactsData) {
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'No data provided to save' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        await db.transaction(async (tx) => {
            // Update user info
            if (userInfoData) {
                const updateData: any = {};

                if (userInfoData.name !== undefined) {
                    updateData.name = userInfoData.name?.trim() || null;
                }
                if (userInfoData.phone !== undefined) {
                    updateData.phone = userInfoData.phone?.trim() || null;
                }

                if (Object.keys(updateData).length > 0) {
                    updateData.updatedAt = new Date();

                    await tx
                        .update(users)
                        .set(updateData)
                        .where(eq(users.id, userId));
                }
            }

            // Upsert medical info
            if (medicalInfoData) {
                const medicalDataToSave = {
                    userId: userId,
                    bloodGroup: medicalInfoData.bloodGroup?.trim() || null,
                    allergies: medicalInfoData.allergies?.trim() || null,
                    medications: medicalInfoData.medications?.trim() || null,
                    emergencyContactName: medicalInfoData.emergencyContactName?.trim() || null,
                    emergencyContactPhone: medicalInfoData.emergencyContactPhone?.trim() || null,
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
                            emergencyContactName: medicalDataToSave.emergencyContactName,
                            emergencyContactPhone: medicalDataToSave.emergencyContactPhone,
                            updatedAt: medicalDataToSave.updatedAt,
                        }
                    });
            }

            // Sync emergency contacts
            if (emergencyContactsData && Array.isArray(emergencyContactsData)) {
                const existingContacts = await tx
                    .select({ id: emergencyContacts.id })
                    .from(emergencyContacts)
                    .where(eq(emergencyContacts.userId, userId));

                const existingContactIds = existingContacts.map(c => c.id);
                const incomingContactIds = emergencyContactsData
                    .filter(c => c.id && !c.id.startsWith('temp_'))
                    .map(c => c.id);

                // Delete removed contacts
                const contactsToDelete = existingContactIds.filter(id => !incomingContactIds.includes(id));
                for (const contactId of contactsToDelete) {
                    await tx
                        .delete(emergencyContacts)
                        .where(eq(emergencyContacts.id, contactId));
                }

                // Upsert contacts
                for (const contact of emergencyContactsData) {
                    if (!contact.name?.trim() || !contact.phone?.trim()) continue;

                    const contactData = {
                        id: contact.id && !contact.id.startsWith('temp_') ? contact.id : crypto.randomUUID(),
                        userId: userId,
                        name: contact.name.trim(),
                        phone: contact.phone.trim(),
                        relationship: contact.relationship?.trim() || null,
                        createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date(),
                        updatedAt: new Date(),
                    };

                    if (contact.id && !contact.id.startsWith('temp_')) {
                        await tx
                            .update(emergencyContacts)
                            .set({
                                name: contactData.name,
                                phone: contactData.phone,
                                relationship: contactData.relationship,
                                updatedAt: contactData.updatedAt,
                            })
                            .where(eq(emergencyContacts.id, contact.id));
                    } else {
                        await tx
                            .insert(emergencyContacts)
                            .values(contactData);
                    }
                }
            }
        });

        console.log('✅ User info saved successfully');

        return addCorsHeaders(new Response(
            JSON.stringify({
                success: true,
                message: 'User information saved successfully',
                lastUpdated: new Date().toISOString()
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));

    } catch (error: any) {
        console.error('💥 Error saving user info:', error);

        let errorMessage = 'Failed to save user information';
        if (error.message?.includes('foreign key')) {
            errorMessage = 'User account not found';
        } else if (error.message?.includes('unique constraint')) {
            errorMessage = 'Data conflict occurred';
        }

        return addCorsHeaders(new Response(
            JSON.stringify({
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        ));
    }
};

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);