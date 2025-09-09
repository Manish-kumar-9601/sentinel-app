import { db } from '../../../db/client';
import { users, medicalInfo } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

// Mock user ID - in a real app, this would come from an authentication context
const MOCK_USER_ID = 'user_12345'; // Replace with actual user ID from auth

export async function GET (request: Request)
{
    try
    {
        const userResult = await db.select().from(users).where(eq(users.id, MOCK_USER_ID)).limit(1);
        const medicalResult = await db.select().from(medicalInfo).where(eq(medicalInfo.userId, MOCK_USER_ID)).limit(1);

        const userInfo = userResult[0] || {};
        const medInfo = medicalResult[0] || {};

        return new Response(JSON.stringify({
            userInfo: {
                name: userInfo.name || '',
                email: userInfo.email || '',
                phone: userInfo.phone || '',
            },
            medicalInfo: {
                bloodGroup: medInfo.bloodGroup || '',
                allergies: medInfo.allergies || '',
                medications: medInfo.medications || '',
                emergencyContactName: medInfo.emergencyContactName || '',
                emergencyContactPhone: medInfo.emergencyContactPhone || '',
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error)
    {
        console.error('API Error getting user info:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch user information.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}


export async function POST (request: Request)
{
    try
    {
        const body = await request.json();
        const { userInfo, medicalInfo: medInfo } = body;

        // Use a transaction to ensure both inserts/updates happen together
        await db.transaction(async (tx) =>
        {
            // Upsert user information
            await tx.insert(users).values({
                id: MOCK_USER_ID,
                name: userInfo.name,
                email: userInfo.email,
                phone: userInfo.phone,
                updatedAt: new Date(),
            }).onConflictDoUpdate({
                target: users.id,
                set: {
                    name: userInfo.name,
                    email: userInfo.email,
                    phone: userInfo.phone,
                    updatedAt: new Date(),
                }
            });

            // Upsert medical information
            await tx.insert(medicalInfo).values({
                userId: MOCK_USER_ID,
                bloodGroup: medInfo.bloodGroup,
                allergies: medInfo.allergies,
                medications: medInfo.medications,
                emergencyContactName: medInfo.emergencyContactName,
                emergencyContactPhone: medInfo.emergencyContactPhone,
                updatedAt: new Date(),
            }).onConflictDoUpdate({
                target: medicalInfo.userId,
                set: {
                    bloodGroup: medInfo.bloodGroup,
                    allergies: medInfo.allergies,
                    medications: medInfo.medications,
                    emergencyContactName: medInfo.emergencyContactName,
                    emergencyContactPhone: medInfo.emergencyContactPhone,
                    updatedAt: new Date(),
                }
            });
        });


        return new Response(JSON.stringify({ message: 'User information saved successfully!' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error)
    {
        console.error('API Error saving user info:', error);
        return new Response(JSON.stringify({ error: 'Failed to save user information.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
