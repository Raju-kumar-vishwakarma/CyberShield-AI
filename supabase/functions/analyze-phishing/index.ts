import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limit content length for security
    const sanitizedContent = content.slice(0, 5000);

    console.log('Analyzing content for phishing:', sanitizedContent.slice(0, 100) + '...');

    // Call AI to analyze the content
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
            content: `You are an expert cybersecurity AI specializing in phishing detection and email security analysis.

Analyze the provided email/message content for phishing indicators and respond with ONLY a valid JSON object (no markdown, no code blocks) using this exact structure:
{
  "status": "safe" | "suspicious" | "phishing",
  "confidence": number (0-100),
  "threat_indicators": [
    {
      "type": "urgency" | "impersonation" | "suspicious_link" | "data_request" | "grammar_issues" | "spoofed_sender" | "malicious_attachment" | "social_engineering",
      "description": "Brief description of the indicator",
      "severity": "low" | "medium" | "high"
    }
  ],
  "detected_urls": ["list of URLs found in the content"],
  "analysis": "Detailed explanation of your findings and recommendations"
}

Evaluate for these phishing indicators:
- Urgency language (act now, limited time, account suspended)
- Impersonation attempts (fake brands, spoofed identities)
- Suspicious or malformed URLs
- Requests for sensitive data (passwords, SSN, credit cards)
- Grammar and spelling errors
- Suspicious sender addresses
- Threatening language
- Too-good-to-be-true offers
- Generic greetings
- Mismatched URLs and display text`
          },
          {
            role: 'user',
            content: `Analyze this email/message for phishing:\n\n${sanitizedContent}`
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
    
    console.log('AI phishing analysis result:', analysisContent);

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
        status: 'suspicious',
        confidence: 50,
        threat_indicators: [],
        detected_urls: [],
        analysis: 'Unable to fully analyze content. Please review manually.'
      };
    }

    // Store scan result in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: insertError } = await supabase
      .from('phishing_scans')
      .insert({
        content_preview: sanitizedContent.slice(0, 200),
        status: analysis.status,
        confidence: analysis.confidence,
        threat_indicators: analysis.threat_indicators,
        ai_analysis: analysis.analysis,
        detected_urls: analysis.detected_urls
      });

    if (insertError) {
      console.error('Failed to insert scan result:', insertError);
    }

    // Update analytics if it's a threat
    if (analysis.status !== 'safe') {
      const today = new Date().toISOString().split('T')[0];
      
      // Try to upsert analytics
      const { data: existing } = await supabase
        .from('threat_analytics')
        .select('*')
        .eq('date', today)
        .eq('threat_type', 'Phishing')
        .eq('severity', analysis.status === 'phishing' ? 'high' : 'medium')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('threat_analytics')
          .update({ count: existing.count + 1 })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('threat_analytics')
          .insert({
            date: today,
            threat_type: 'Phishing',
            count: 1,
            severity: analysis.status === 'phishing' ? 'high' : 'medium'
          });
      }
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-phishing function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
