import { db } from '../../../db/client';
import { users, medicalInfo, emergencyContacts } from '../../../db/schema';
import { withAuth, AuthUser } from '../../../utils/middleware';
import { eq } from 'drizzle-orm';

// GET handler to fetch user data
const getHandler = async (request: Request, user:any) => {
    try {
        const userId = user.id;

        // Fetch user info from users table
        const userData = await db
            .select({
                name: users.name,
                email: users.email,
                phone: users.phone
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        // Fetch medical info from medicalInfo table
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

        // Fetch emergency contacts from emergencyContacts table
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

        // Provide default values if no data exists
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

        // Extract first result or use defaults
        const userInfoResult = userData.length > 0 ? userData[0] : defaultUserInfo;
        const medicalInfoResult = medicalData.length > 0 ? medicalData[0] : defaultMedicalInfo;

        return new Response(
            JSON.stringify({
                userInfo: {
                    name: userInfoResult.name || '',
                    email: userInfoResult.email || '',
                    phone: userInfoResult.phone || '',
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
        );

    } catch (error) {
        console.error('API Error fetching user info:', error);
        return new Response(
            JSON.stringify({ 
                error: 'Failed to fetch user information',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// POST handler to save user data
const postHandler = async (request: Request, user:any) => {
    try {
        const body = await request.json();
        const { 
            userInfo: userInfoData, 
            medicalInfo: medicalInfoData,
            emergencyContacts: emergencyContactsData 
        } = body;
        const userId = user.id;

        // Validate that we have some data to save
        if (!userInfoData && !medicalInfoData && !emergencyContactsData) {
            return new Response(
                JSON.stringify({ error: 'No data provided to save' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Use transaction to ensure all operations succeed or fail together
        await db.transaction(async (tx) => {
            // Update user info in users table
            if (userInfoData) {
                const updateData: any = {};
                
                if (userInfoData.name !== undefined) {
                    updateData.name = userInfoData.name?.trim() || null;
                }
                if (userInfoData.phone !== undefined) {
                    updateData.phone = userInfoData.phone?.trim() || null;
                }
                
                // Only update if there's data to update
                if (Object.keys(updateData).length > 0) {
                    updateData.updatedAt = new Date();
                    
                    await tx
                        .update(users)
                        .set(updateData)
                        .where(eq(users.id, userId));
                }
            }

            // Handle medical info (upsert since userId is primary key)
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

            // Handle emergency contacts sync
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

                // Delete contacts that are no longer in the incoming data
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
                        // Update existing contact
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
                        // Insert new contact
                        await tx
                            .insert(emergencyContacts)
                            .values(contactData);
                    }
                }
            }
        });

        return new Response(
            JSON.stringify({ 
                success: true,
                message: 'User information saved successfully',
                lastUpdated: new Date().toISOString()
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('API Error saving user info:', error);
        
        // Check if it's a specific database error
        let errorMessage = 'Failed to save user information';
        if (error.message?.includes('foreign key')) {
            errorMessage = 'User account not found';
        } else if (error.message?.includes('unique constraint')) {
            errorMessage = 'Data conflict occurred';
        }
        
        return new Response(
            JSON.stringify({ 
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// Export both GET and POST handlers wrapped with authentication
export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);