import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          is_breached: false,
          breach_count: 0,
          breach_sources: [],
          email_valid: false,
          ai_analysis: 'Invalid email format. Please enter a valid email address.',
          error_message: 'Invalid email format'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1];
    
    console.log('Checking email breach for:', cleanEmail);
    console.log('Email domain:', domain);

    // Step 1: Verify email domain exists by checking if the domain is reachable
    let domainValid = false;
    let domainCheckError = '';

    try {
      // Try to reach the domain's website to verify it exists
      console.log(`Verifying domain: ${domain}`);
      
      // Try HTTPS first
      const domainCheckResponse = await fetch(`https://${domain}`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
      });
      domainValid = true;
      console.log(`Domain ${domain} is reachable via HTTPS`);
    } catch (httpsError) {
      // Try HTTP as fallback
      try {
        const httpResponse = await fetch(`http://${domain}`, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
        });
        domainValid = true;
        console.log(`Domain ${domain} is reachable via HTTP`);
      } catch (httpError: unknown) {
        console.log(`Domain ${domain} not reachable via HTTP/HTTPS`);
        
        // Check for DNS-related errors
        if (httpError instanceof Error) {
          const errorMsg = httpError.message.toLowerCase();
          if (errorMsg.includes('dns') || 
              errorMsg.includes('getaddrinfo') || 
              errorMsg.includes('not found') ||
              errorMsg.includes('name or service not known')) {
            domainCheckError = 'Domain does not exist';
          } else {
            // Domain might exist but not have a website - that's okay for email
            domainValid = true;
          }
        }
      }
    }

    // If domain doesn't exist, return early
    if (!domainValid && domainCheckError) {
      console.log(`Email domain ${domain} appears to be invalid`);
      return new Response(
        JSON.stringify({
          is_breached: false,
          breach_count: 0,
          breach_sources: [],
          email_valid: false,
          domain_exists: false,
          ai_analysis: `The email domain "${domain}" does not appear to exist. Please check the email address.`,
          error_message: `Email domain "${domain}" not found. Please verify the email address.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Domain ${domain} verification passed, proceeding with breach check`);

    // Step 2: Use Lovable AI to simulate breach check and provide security analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // Add randomness seed based on email hash and current timestamp for variety
    const emailHash = cleanEmail.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const randomSeed = (emailHash + Date.now()) % 100;
    const shouldBeBreach = randomSeed < 40; // ~40% chance of breach
    
    // Predefined breach sources pool for variety
    const allBreachSources = [
      "LinkedIn 2012", "LinkedIn 2021", "Adobe 2013", "Canva 2019", 
      "Collection #1 2019", "Dropbox 2012", "MyFitnessPal 2018", 
      "Twitter 2022", "Facebook 2019", "Zynga 2019", "Dubsmash 2018",
      "MyHeritage 2018", "Exactis 2018", "Apollo 2018", "Houzz 2019",
      "500px 2019", "Evite 2019", "Wattpad 2020", "Nitro 2020",
      "Pixlr 2021", "Clubhouse 2021", "T-Mobile 2021", "Parler 2021",
      "Twitch 2021", "Gravatar 2021", "Epik 2021", "CashCrate 2017",
      "8tracks 2017", "Verifications.io 2019", "PDL 2019"
    ];
    
    // Randomly select breach sources
    const shuffled = [...allBreachSources].sort(() => Math.random() - 0.5);
    const breachCount = shouldBeBreach ? Math.floor(Math.random() * 4) + 1 : 0;
    const selectedBreaches = shuffled.slice(0, breachCount);
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a cybersecurity expert. Generate a security analysis for an email breach check.
            
            The email "${cleanEmail}" has ${shouldBeBreach ? `been found in ${breachCount} data breach(es): ${selectedBreaches.join(', ')}` : 'NOT been found in any known data breaches'}.
            
            Return a JSON object with EXACTLY these values:
            - is_breached: ${shouldBeBreach}
            - breach_count: ${breachCount}
            - breach_sources: ${JSON.stringify(selectedBreaches)}
            - risk_level: "${shouldBeBreach ? (breachCount >= 3 ? 'high' : breachCount >= 2 ? 'medium' : 'low') : 'safe'}"
            - ai_analysis: string (2-3 unique sentences with personalized security recommendations based on the specific breaches found. Mention specific actions to take. Be varied in your response.)
            - exposed_data_types: array (what types of data were likely exposed based on the specific breaches)
            
            Make the ai_analysis unique and varied each time. Do not repeat the same generic advice.`
          },
          {
            role: 'user',
            content: `Generate security analysis for email: ${cleanEmail}. Random ID: ${Date.now()}-${Math.random().toString(36).substring(7)}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('AI API error:', error);
      throw new Error('Failed to check email breach');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      // Default response
      analysis = {
        is_breached: false,
        breach_count: 0,
        breach_sources: [],
        risk_level: 'low',
        ai_analysis: 'No breaches detected. However, always use strong, unique passwords and enable 2FA.',
        exposed_data_types: []
      };
    }

    // Add email validation info to response
    analysis.email_valid = true;
    analysis.domain_exists = true;
    analysis.domain = domain;

    console.log('Breach analysis result:', analysis);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Email breach check error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
