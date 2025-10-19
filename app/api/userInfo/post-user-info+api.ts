import { db } from "@/db/client";
import { users, medicalInfo, emergencyContacts } from '@/db/schema';
import addCorsHeaders, { withAuth, AuthUser } from '@/utils/middleware';
import { eq } from 'drizzle-orm';

export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}

export const POST = withAuth(
    async (request: Request, user: AuthUser) => {
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

                    await db
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

                await db
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
                const existingContacts = await db
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
                    await db
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
                        await db
                            .update(emergencyContacts)
                            .set({
                                name: contactData.name,
                                phone: contactData.phone,
                                relationship: contactData.relationship,
                                updatedAt: contactData.updatedAt,
                            })
                            .where(eq(emergencyContacts.id, contact.id));
                    } else {
                        await db
                            .insert(emergencyContacts)
                            .values(contactData);
                    }
                }
            }

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
    }
);