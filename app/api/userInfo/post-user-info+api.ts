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
}
);