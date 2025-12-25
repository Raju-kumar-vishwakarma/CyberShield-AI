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
    const { ip } = await req.json();

    if (!ip) {
      throw new Error('IP address is required');
    }

    // Validate IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
      throw new Error('Invalid IP address format');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use AI to analyze the IP
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an IP intelligence analyst. Analyze IP addresses and provide threat assessments.
            
Return a JSON object with this exact structure:
{
  "ip": "the IP address",
  "country": "country name",
  "city": "city name or 'Unknown'",
  "isp": "ISP name or 'Unknown'",
  "risk_level": "low" | "medium" | "high",
  "is_vpn": boolean,
  "is_proxy": boolean,
  "is_tor": boolean,
  "threat_score": number between 0-100,
  "location": { "lat": number, "lon": number }
}

Analyze based on:
- IP ranges commonly associated with threats
- Known datacenter/VPN/proxy ranges
- Tor exit node indicators
- Geographic risk factors

Be realistic but informative. For well-known IPs like 8.8.8.8 (Google DNS), give low risk scores.`
          },
          {
            role: 'user',
            content: `Analyze this IP address: ${ip}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'API credits exhausted.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI analysis failed');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      // Fallback response
      result = {
        ip,
        country: "Unknown",
        city: "Unknown",
        isp: "Unknown",
        risk_level: "medium",
        is_vpn: false,
        is_proxy: false,
        is_tor: false,
        threat_score: 50,
        location: { lat: 0, lon: 0 }
      };
    }

    console.log('IP lookup result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in ip-lookup:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
