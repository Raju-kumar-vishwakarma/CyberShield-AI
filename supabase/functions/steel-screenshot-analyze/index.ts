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
    const { screenshot, url } = await req.json();

    if (!screenshot) {
      return new Response(
        JSON.stringify({ success: false, error: 'Screenshot is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing screenshot with AI for:', url);

    // Prepare the image URL for Gemini Vision
    const imageUrl = screenshot.startsWith('data:') 
      ? screenshot 
      : `data:image/png;base64,${screenshot}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a cybersecurity expert specializing in phishing detection and website security analysis.
Analyze the provided website screenshot and identify any phishing indicators or security concerns.

Focus on:
1. Brand impersonation (fake logos, incorrect branding)
2. Urgency tactics (limited time offers, account suspension warnings)
3. Poor design quality (unprofessional layout, spelling errors, low-quality images)
4. Suspicious form elements (login forms, payment forms)
5. Trust indicators (or lack thereof - missing padlock, security badges)
6. Visual anomalies that indicate phishing

Respond in JSON format:
{
  "isPhishing": boolean,
  "confidence": number (0-100),
  "brandTargeted": string or null,
  "phishingIndicators": [
    { "indicator": string, "severity": "low"|"medium"|"high"|"critical", "description": string }
  ],
  "legitimacyFactors": string[],
  "overallAssessment": string (1-2 sentences)
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this screenshot from ${url} for phishing indicators:`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI analysis received');

    // Parse the JSON response
    let analysisResult;
    try {
      // Extract JSON from the response (in case it's wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysisResult = {
        isPhishing: false,
        confidence: 50,
        brandTargeted: null,
        phishingIndicators: [],
        legitimacyFactors: [],
        overallAssessment: content.slice(0, 200)
      };
    }

    return new Response(
      JSON.stringify({ success: true, data: analysisResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in steel-screenshot-analyze:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
