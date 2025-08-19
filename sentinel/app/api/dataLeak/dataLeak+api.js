
export async function POST(request) {
  try {
    const body = await request.json();
    const userEmail = body.email;

    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'Email is required.' }), { status: 400 });
    }

    // Call the public LeakCheck API
    const response = await fetch(`https://leakcheck.io/api/public?check=${encodeURIComponent(userEmail)}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SentinelApp-Safety-Check' // It's good practice to set a User-Agent
      }
    });

    if (!response.ok) {
      // Forward the error from the API if something goes wrong
      const errorData = await response.json();
      return new Response(JSON.stringify({ error: errorData.message || 'Could not check for leaks.' }), { status: response.status });
    }

    const result = await response.json();

    // The API returns { "found": boolean, "results": [] }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Data leak API route error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected server error occurred.' }), { status: 500 });
  }
}
