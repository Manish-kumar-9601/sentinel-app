import { db } from "@/db/client";
import { users, medicalInfo, emergencyContacts } from '@/db/schema';
import addCorsHeaders, { withAuth, AuthUser } from '@/utils/middleware';
import { eq } from 'drizzle-orm';
export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}
export const GET = withAuth(
    async (request: Request, user: AuthUser) => {
        try {
            const userId = user.id;
            console.log('📋 Fetching user info for:', userId);

            // Fetch user info
            const userData = await db
                .select({
                    name: users.name,
                    email: users.email,
                    phone: users.phone,
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
    }
) 