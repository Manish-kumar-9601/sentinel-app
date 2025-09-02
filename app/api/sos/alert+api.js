// This is your server-side API route. It runs in a Node.js environment.
import { Twilio } from 'twilio';

export async function POST(request) {
  try {
    // --- 1. Get Location Data from the Request ---
    const body = await request.json();
    const { latitude, longitude } = body.location;

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ error: 'Location is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- 2. Mock User and Contact Data ---
    // TODO: In a real app, you would get the logged-in user and their
    // emergency contacts from your database here.
    const currentUser = { fullName: "Nevil Modi" };
    const emergencyContacts = [
      { phone_number: '+919999999999' }, // Replace with a real test number
      { phone_number: '+918888888888' }, // Replace with another real test number
    ];

    // --- 3. Initialize Twilio Client ---
    // These credentials come from your .env file
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const client = new Twilio(accountSid, authToken);

    // --- 4. Create the Message ---
    const mapsLink = `http://maps.google.com/maps?q=${latitude},${longitude}`;
    const messageBody = `Emergency SOS from ${currentUser.fullName}. They need help! Location: ${mapsLink}`;

    // --- 5. Send SMS to all Contacts ---
    const messagePromises = emergencyContacts.map(contact => {
      return client.messages.create({
        body: messageBody,
        from: twilioPhoneNumber,
        to: contact.phone_number,
      });
    });

    await Promise.all(messagePromises);

    // --- 6. Return a Success Response ---
    return new Response(JSON.stringify({ message: 'SOS alerts sent successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('API Error sending SOS:', error);
    return new Response(JSON.stringify({ error: 'Failed to send SOS alert.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}