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
    const { networkData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing network data:', networkData);

    // Call AI to analyze the network traffic pattern
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
            content: `You are a cybersecurity AI analyst specializing in network threat detection. Analyze network traffic patterns and identify potential threats.
            
For each analysis, you must respond with ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "is_threat": boolean,
  "threat_type": "SQL Injection" | "XSS Attack" | "Brute Force" | "DDoS" | "Port Scan" | "Data Exfiltration" | "Malware Communication" | "Normal Traffic",
  "severity": "low" | "medium" | "high" | "critical",
  "confidence": number (0-100),
  "analysis": "Brief explanation of the threat or why traffic is normal"
}

Consider these factors:
- Unusual port access patterns
- High request volumes from single IPs
- Suspicious payload patterns
- Known malicious IP ranges
- Unusual protocols or destinations
- Time-based anomalies`
          },
          {
            role: 'user',
            content: `Analyze this network traffic data for potential threats:\n${JSON.stringify(networkData, null, 2)}`
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
    
    console.log('AI analysis result:', analysisContent);

    // Parse the AI response
    let analysis;
    try {
      // Clean the response in case it has markdown code blocks
      const cleanedContent = analysisContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysis = {
        is_threat: false,
        threat_type: 'Normal Traffic',
        severity: 'low',
        confidence: 50,
        analysis: 'Unable to parse AI response'
      };
    }

    // Store threat in database if it's a threat
    if (analysis.is_threat) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: insertError } = await supabase
        .from('network_threats')
        .insert({
          source_ip: networkData.source_ip || 'Unknown',
          destination: networkData.destination || 'Unknown',
          protocol: networkData.protocol || 'Unknown',
          bytes_transferred: networkData.bytes || '0',
          threat_type: analysis.threat_type,
          severity: analysis.severity,
          confidence: analysis.confidence,
          ai_analysis: analysis.analysis,
          status: 'detected'
        });

      if (insertError) {
        console.error('Failed to insert threat:', insertError);
      }

      // Also track suspicious IP
      if (networkData.source_ip) {
        const { data: existingIP } = await supabase
          .from('suspicious_ips')
          .select('*')
          .eq('ip_address', networkData.source_ip)
          .maybeSingle();

        if (existingIP) {
          await supabase
            .from('suspicious_ips')
            .update({
              attempt_count: existingIP.attempt_count + 1,
              severity: analysis.severity,
              last_seen_at: new Date().toISOString()
            })
            .eq('ip_address', networkData.source_ip);
        } else {
          await supabase
            .from('suspicious_ips')
            .insert({
              ip_address: networkData.source_ip,
              location: networkData.location || 'Unknown',
              severity: analysis.severity,
              attempt_count: 1
            });
        }
      }
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-threat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
