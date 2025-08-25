// This is a server-side file. It runs in a Node.js environment.

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'Email is required.' }), { status: 400 });
    }

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    // --- DEBUG: Check if the API key is loaded ---
    console.log("Using RapidAPI Key:", RAPIDAPI_KEY ? `${RAPIDAPI_KEY.substring(0, 5)}...` : "Not Found");

    if (!RAPIDAPI_KEY) {
        console.error("RapidAPI Key is not configured.");
        return new Response(JSON.stringify({ error: 'Server configuration error.' }), { status: 500 });
    }

    const url = `https://breachdirectory.p.rapidapi.com/?func=auto&term=${encodeURIComponent(userEmail)}`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'breachdirectory.p.rapidapi.com'
      }
    };

    const response = await fetch(url, options);
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        
        // --- DEBUG: Log the raw result from the API ---
        console.log("Raw API Result (JSON):", JSON.stringify(result, null, 2));

        if (!response.ok) {
            return new Response(JSON.stringify({ error: result.error || 'Could not check for leaks.' }), { status: response.status });
        }
        
        const formattedResult = {
            found: result.found > 0,
            results: (result.result || []).map(breach => {
                const sourceText = breach.sources ? String(breach.sources).replace(/,/g, ', ') : 'Unknown Source';
                return {
                    source: sourceText,
                    details: `Data leaked on ${breach.last_breach}`
                };
            })
        };
        return new Response(JSON.stringify(formattedResult), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } else {
        const textError = await response.text();
        // --- DEBUG: Log the non-JSON error response ---
        console.error("Non-JSON response from RapidAPI:", textError);
        return new Response(JSON.stringify({ error: 'The external service is currently unavailable or quota has been exceeded.' }), { status: 503 });
    }

  } catch (error) {
    console.error('Data leak API route error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected server error occurred.' }), { status: 500 });
  }
}
