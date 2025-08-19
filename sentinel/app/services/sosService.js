// ... existing sendSosAlert function

/**
 * Sends a non-emergency check-in to a single selected contact.
 * @param {object} location - { latitude, longitude }
 * @param {object} contact - { id, name, phone }
 */
export const sendCheckIn = async (location, contact) => {
  try {
    const response = await fetch('/api/checkin', { // Note the new endpoint
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        contact: {
          phone: contact.phone,
          name: contact.name
        },
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'API request failed');
    return data;
  } catch (error) {
    console.error('API Error sending Check-In:', error.message);
    throw error;
  }
};