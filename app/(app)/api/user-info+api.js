import { db } from '../../../../db/client';
import { userInfo, medicalInfo } from '../../../../db/schema';
import { withAuth, AuthUser } from '../../../../utils/middleware';
import { v4 as uuidv4 } from 'uuid';
import { and, eq } from 'drizzle-orm';

// The main handler for the POST request
const handler = async (request: Request, user: AuthUser) =>
{
    try
    {
        const { userInfo: userInfoData, medicalInfo: medicalInfoData } = await request.json();
        const userId = user.id; // The user ID comes from the authenticated middleware

        // Use a transaction to ensure both updates succeed or fail together
        await db.transaction(async (tx) =>
        {
            // Use 'onConflict' to either insert a new record or update an existing one for the user
            await tx.insert(userInfo).values({
                id: uuidv4(),
                ...userInfoData,
                userId: userId,
            }).onConflictDoUpdate({
                target: userInfo.userId,
                set: { ...userInfoData, email: userInfoData.email || null, phone: userInfoData.phone || null },
            });

            await tx.insert(medicalInfo).values({
                id: uuidv4(),
                ...medicalInfoData,
                userId: userId,
            }).onConflictDoUpdate({
                target: medicalInfo.userId,
                set: { ...medicalInfoData },
            });
        });

        return new Response(
            JSON.stringify({ message: 'User information saved successfully' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error)
    {
        console.error('API Error saving user info:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to save user information' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// Wrap the handler with the authentication middleware
export const POST = withAuth(handler);
