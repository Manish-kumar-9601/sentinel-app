import addCorsHeaders from "@/utils/middleware";

export async function OPTIONS() {
    return addCorsHeaders(new Response(null, { status: 204 }));
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const RAPIDAPI_KEY_Param = searchParams.get('apiKey');
        const userEmail = searchParams.get('email');

        console.log('🔍 Data leak check for:', userEmail);

        if (!userEmail) {
            console.error('❌ Email parameter missing');
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'Email is required.' }), 
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'Invalid email format.' }), 
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        const RAPIDAPI_KEY = RAPIDAPI_KEY_Param?.length === 50 
            ? RAPIDAPI_KEY_Param 
            : process.env.RAPIDAPI_KEY;

        if (!RAPIDAPI_KEY) {
            console.error('❌ RapidAPI Key not configured');
            return addCorsHeaders(new Response(
                JSON.stringify({ error: 'API key configuration error.' }), 
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            ));
        }

        const url = `https://breachdirectory.p.rapidapi.com/?func=auto&term=${encodeURIComponent(userEmail)}`;
        const options = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': 'breachdirectory.p.rapidapi.com'
            }
        };

        console.log('🌐 Calling breach directory API...');
        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            const result = await response.json();

            if (!response.ok) {
                console.error('❌ API error:', result);
                return addCorsHeaders(new Response(
                    JSON.stringify({ 
                        error: result.error || 'Could not check for leaks.' 
                    }), 
                    { status: response.status, headers: { 'Content-Type': 'application/json' } }
                ));
            }

            const formattedResult = {
                found: result.found > 0,
                count: result.found || 0,
                results: (result.result || []).map((breach: any) => {
                    const sourceText = breach.sources 
                        ? String(breach.sources).replace(/,/g, ', ') 
                        : 'Unknown Source';

                    const passwordText = breach.password !== undefined
                        ? String(breach.password)
                        : 'Not available';

                    return {
                        source: sourceText,
                        email: breach.email,
                        password: passwordText,
                        hash: breach.hash || null
                    };
                })
            };

            console.log(`✅ Data leak check complete. Found: ${formattedResult.found}`);

            return addCorsHeaders(new Response(
                JSON.stringify(formattedResult), 
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }
            ));
        } else {
            const textError = await response.text();
            console.error('❌ Non-JSON response:', textError);
            return addCorsHeaders(new Response(
                JSON.stringify({ 
                    error: 'External service unavailable or quota exceeded.' 
                }), 
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            ));
        }

    } catch (error: any) {
        console.error('💥 Data leak API error:', error);
        return addCorsHeaders(new Response(
            JSON.stringify({ 
                error: 'An unexpected server error occurred.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        ));
    }
}
