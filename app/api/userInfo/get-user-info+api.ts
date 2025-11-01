import { db } from "@/db/client";
import { emergencyContacts, medicalInfo, users } from '@/db/schema';
import addCorsHeaders, { AuthUser, withAuth } from '@/utils/middleware';
import { eq } from 'drizzle-orm';
export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}
export const GET = withAuth(
    async (request: Request, user: AuthUser) => {
        try {
            const userId = user.id;
            console.log('📋 Fetching user info for:', userId);

            // Fetch user info with error handling
            let userData;
            try {
                userData = await db
                    .select({
                        name: users.name,
                        email: users.email,
                        phone: users.phone,
                    })
                    .from(users)
                    .where(eq(users.id, userId))
                    .limit(1);
            } catch (dbError: any) {
                console.error('❌ Database error fetching user:', dbError);
                throw new Error('Failed to fetch user data from database');
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
            let medicalData: any;
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
            let contactsData: any[];
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
                emergencyContacts: contactsData.map(contact => ({
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
    }
); 