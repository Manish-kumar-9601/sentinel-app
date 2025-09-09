// This is a server-side file. It runs in a Node.js environment.

export async function GET (request)
{

  try
  {
    const { searchParams } = new URL(request.url);
    const RAPIDAPI_KEY_Param =  searchParams.get('apiKey');
    const userEmail = searchParams.get('email');
    if (!userEmail)
    {

      console.error("Email parameter is missing.");
      return new Response(JSON.stringify({ error: 'Email is required.' }), { status: 400 });
    }
    const RAPIDAPI_KEY = RAPIDAPI_KEY_Param.length ==50  ? RAPIDAPI_KEY_Param : process.env.RAPIDAPI_KEY;
    if (!RAPIDAPI_KEY)
    {
      console.error("RapidAPI Key is not configured.");
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), { status: 500 });
    }
    console.log('encodeURIComponent(userEmail)', encodeURIComponent(userEmail))
    const url = `https://breachdirectory.p.rapidapi.com/?func=auto&term=${encodeURIComponent(userEmail)}`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'breachdirectory.p.rapidapi.com'
      }
    };

    const response = await fetch(url, options);
    console.log(response)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json'))
    {
      const result = await response.json();
      if (!response.ok)
      {
        return new Response(JSON.stringify({ error: result.error || 'Could not check for leaks.' }), { status: response.status });
      }

      const formattedResult = {
        found: result.found > 0,
        results: (result.result || []).map(breach =>
        {
          const sourceText = breach.sources ? String(breach.sources).replace(/,/g, ', ') : 'Unknown Source';

          const passwordText = typeof breach.password === undefined
            ? JSON.stringify(breach.password)
            : breach.password;

          return {
            source: sourceText,
            // hash: breach.hash,
            email: breach.email,
            details: `${passwordText}`
          };
        })
      };
      return new Response(JSON.stringify(formattedResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else
    {
      const textError = await response.text();
      console.error("Non-JSON response from RapidAPI:", textError);
      return new Response(JSON.stringify({ error: 'The external service is currently unavailable or quota has been exceeded.' }), { status: 503 });
    }

  } catch (error)
  {
    console.error('Data leak API route error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected server error occurred.' }), { status: 500 });
  }
}
