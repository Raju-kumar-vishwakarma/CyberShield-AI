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
    const { url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Checking domain reputation for:', url);

    // Extract domain from URL
    let domain = url;
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      domain = urlObj.hostname;
    } catch {
      domain = url.split('/')[0];
    }

    // Call AI to analyze the domain
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
            content: `You are an expert cybersecurity AI specializing in domain reputation analysis and URL security assessment.

Analyze the provided domain/URL and respond with ONLY a valid JSON object (no markdown, no code blocks) using this exact structure:
{
  "domain": "the domain being analyzed",
  "reputation_score": number (0-100, higher is safer),
  "risk_level": "safe" | "low" | "medium" | "high" | "critical",
  "ssl_status": "valid" | "invalid" | "unknown",
  "domain_age": "estimated age or 'unknown'",
  "registrar": "registrar name or 'unknown'",
  "risk_factors": [
    {
      "factor": "name of the risk factor",
      "description": "brief description",
      "severity": "low" | "medium" | "high"
    }
  ],
  "is_typosquatting": boolean,
  "similar_to": "legitimate domain it might be imitating or null",
  "category": "business" | "phishing" | "malware" | "spam" | "legitimate" | "unknown",
  "recommendations": ["list of security recommendations"]
}

Evaluate for these risk factors:
- Known phishing/malware domains
- Typosquatting (similar to legitimate domains)
- Recently registered domains
- Suspicious TLDs
- IP addresses instead of domains
- Unusual subdomains
- Known brand impersonation
- Blacklisted domains`
          },
          {
            role: 'user',
            content: `Analyze this domain/URL for security risks:\n\nDomain: ${domain}\nFull URL: ${url}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const analysisContent = aiData.choices?.[0]?.message?.content;
    
    console.log('Domain reputation result:', analysisContent);

    // Parse the AI response
    let analysis;
    try {
      const cleanedContent = analysisContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysis = {
        domain: domain,
        reputation_score: 50,
        risk_level: 'unknown',
        ssl_status: 'unknown',
        domain_age: 'unknown',
        registrar: 'unknown',
        risk_factors: [],
        is_typosquatting: false,
        similar_to: null,
        category: 'unknown',
        recommendations: ['Unable to fully analyze. Please verify manually.']
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in check-domain function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
