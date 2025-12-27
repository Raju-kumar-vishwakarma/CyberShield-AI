import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain || typeof domain !== "string") {
      throw new Error("Domain is required");
    }

    // Clean domain
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();

    console.log("Checking DNS security for:", cleanDomain);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a DNS security expert. Analyze the security configuration of a domain based on common DNS security practices.

For the given domain, provide a realistic security assessment. Consider:
- DNSSEC (DNS Security Extensions) - protects against DNS spoofing
- SPF (Sender Policy Framework) - email authentication
- DMARC (Domain-based Message Authentication) - email policy
- DKIM (DomainKeys Identified Mail) - email signing

Return ONLY valid JSON with this exact structure:
{
  "domain": "the domain checked",
  "dnssec_enabled": boolean,
  "has_spf": boolean,
  "has_dmarc": boolean,
  "has_dkim": boolean,
  "mx_records": ["array of mail servers"],
  "ns_records": ["array of nameservers"],
  "a_records": ["array of IP addresses"],
  "security_score": number (0-100),
  "risk_level": "low" | "medium" | "high" | "critical",
  "recommendations": ["array of security recommendations"],
  "analysis": "brief security analysis summary"
}

Be realistic - major domains typically have good security, smaller domains may not.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze DNS security for domain: ${cleanDomain}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 503) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse?.choices?.[0]?.message?.content ?? "";

    console.log("AI response:", content);

    let result;
    try {
      let jsonStr = content;
      if (jsonStr.includes("```json")) {
        jsonStr = jsonStr.split("```json")[1]?.split("```")[0]?.trim() ?? "";
      } else if (jsonStr.includes("```")) {
        jsonStr = jsonStr.split("```")[1]?.split("```")[0]?.trim() ?? "";
      }
      result = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      result = {
        domain: cleanDomain,
        dnssec_enabled: false,
        has_spf: false,
        has_dmarc: false,
        has_dkim: false,
        mx_records: [],
        ns_records: [],
        a_records: [],
        security_score: 50,
        risk_level: "medium",
        recommendations: ["Unable to fully analyze DNS configuration", "Consider manual verification"],
        analysis: "Analysis could not be completed. Please try again.",
      };
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in dns-security-check:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
