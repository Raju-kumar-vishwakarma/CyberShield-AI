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
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      throw new Error('Query is required');
    }

    const sanitizedQuery = query.slice(0, 1000);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
            content: `You are a cybersecurity threat intelligence analyst. Analyze security threats and provide detailed intelligence reports.

Return a JSON object with this exact structure:
{
  "threat_type": "Type of threat (e.g., Ransomware, Phishing, DDoS, Malware, APT, etc.)",
  "severity": "low" | "medium" | "high" | "critical",
  "description": "Detailed description of the threat (2-3 sentences)",
  "indicators": ["Array of 3-5 indicators of compromise or warning signs"],
  "mitigations": ["Array of 3-5 recommended mitigations or defenses"],
  "recent_activity": "Brief note about recent activity or trends related to this threat"
}

Provide accurate, actionable intelligence based on current cybersecurity knowledge. Be specific and practical in your recommendations.`
          },
          {
            role: 'user',
            content: `Provide threat intelligence analysis for: ${sanitizedQuery}`
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
      result = {
        threat_type: "Unknown Threat",
        severity: "medium",
        description: "Unable to analyze the provided threat information. Please provide more specific details about the security concern.",
        indicators: ["Unusual network activity", "Suspicious file behavior", "Unauthorized access attempts"],
        mitigations: ["Monitor network traffic", "Update security software", "Review access logs"],
        recent_activity: "Analysis inconclusive. Consider providing more context."
      };
    }

    console.log('Threat intelligence result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in threat-intelligence:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
