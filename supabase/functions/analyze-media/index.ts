import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RiskLevel = "authentic" | "likely_authentic" | "uncertain" | "likely_ai" | "ai_generated";

interface ModelOutput {
  riskLevel: RiskLevel;
  indicators: Array<{ type: string; description: string; weight: number }>;
  analysis: string;
  recommendations: string[];
}

interface MediaAnalysisResult {
  mediaType: "image" | "video";
  isAIGenerated: boolean;
  confidence: number;
  riskLevel: RiskLevel;
  indicators: Array<{ type: string; description: string; weight: number }>;
  analysis: string;
  recommendations: string[];
  geminiDetails?: {
    aiScore: number;
    notAiScore: number;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function scoresFromRisk(riskLevel: RiskLevel) {
  // Deterministic mapping so we don't present "made-up" precise percentages.
  switch (riskLevel) {
    case "authentic":
      return { aiScore: 5, notAiScore: 95 };
    case "likely_authentic":
      return { aiScore: 20, notAiScore: 80 };
    case "uncertain":
      return { aiScore: 50, notAiScore: 50 };
    case "likely_ai":
      return { aiScore: 75, notAiScore: 25 };
    case "ai_generated":
      return { aiScore: 95, notAiScore: 5 };
  }
}

function parseModelJson(content: string): ModelOutput {
  // Extract JSON from possible markdown code blocks
  let jsonStr = content ?? "";
  if (jsonStr.includes("```json")) {
    jsonStr = jsonStr.split("```json")[1]?.split("```")[0]?.trim() ?? "";
  } else if (jsonStr.includes("```")) {
    jsonStr = jsonStr.split("```")[1]?.split("```")[0]?.trim() ?? "";
  }

  const parsed = JSON.parse(jsonStr);
  return parsed as ModelOutput;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mediaType, fileName, fileContent, strictMode = false } = await req.json();

    if (!mediaType || !fileName) throw new Error("Media type and file name are required");
    if (!fileContent) throw new Error("File content is required");

    // NOTE: Gemini vision supports images; for videos we currently return an error.
    if (mediaType !== "image") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Video analysis is not supported yet with the current Google Gemini setup. Please upload an image.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log("Starting Google Gemini analysis for:", fileName, "Type:", mediaType, "Strict mode:", strictMode);

    // Parse data URL for MIME + base64
    const match = /^data:(.+?);base64,(.+)$/.exec(fileContent);
    const mimeType = match?.[1] || "image/png";
    const base64Data = match?.[2] || (fileContent.includes(",") ? fileContent.split(",")[1] : fileContent);

    const modeGuidance = strictMode
      ? `MODE: STRICT
- Be VERY aggressive in detection. Flag content even with minor or subtle AI indicators.
- When uncertain, classify as "likely_ai" or "ai_generated".
- Look for ANY artifacts: texture inconsistencies, lighting issues, blending errors, unnatural smoothness.
- Images with "too perfect" aesthetics, hyper-realistic rendering, or dreamlike quality are likely AI.
- Prioritize catching AI content over avoiding false positives.`
      : `MODE: CONSERVATIVE
- Be balanced but still vigilant in detection.
- Flag obvious AI-generated content clearly.
- When genuinely uncertain, use "uncertain".
- Avoid false positives but don't miss obvious AI content.`;

    const systemPrompt = `You are an expert AI-generated image detector with deep knowledge of generative AI outputs.

CRITICAL TASK:
Determine if this image was created by AI generators (Midjourney, DALL-E, Stable Diffusion, Gemini, Adobe Firefly, etc.) or is an authentic photograph/human-created artwork.

${modeGuidance}

KEY AI-GENERATED IMAGE INDICATORS (look for these carefully):
1. TEXTURE: Overly smooth skin, plastic-like surfaces, waxy appearance, lack of natural grain
2. LIGHTING: Inconsistent light sources, impossible reflections, uniform ambient lighting
3. DETAILS: Blurred/merged fingers, malformed hands, asymmetric features, teeth anomalies
4. BACKGROUND: Repetitive patterns, melting/morphing objects, impossible architecture
5. STYLE: Hyper-saturated colors, dreamlike aesthetic, "too perfect" composition
6. TEXT: Garbled letters, nonsense words, inconsistent fonts
7. EDGES: Artifacts where objects meet, halos, unnatural blending
8. PATTERNS: Repeating textures, clone-stamp-like repetition, neural network artifacts

REAL PHOTOGRAPH INDICATORS:
1. Natural sensor noise/grain
2. Authentic lens aberrations (chromatic, distortion)
3. Realistic motion blur and depth of field
4. Genuine EXIF-like imperfections
5. Natural skin texture with pores and fine details

Return ONLY valid JSON with EXACT structure:
{
  "riskLevel": "authentic" | "likely_authentic" | "uncertain" | "likely_ai" | "ai_generated",
  "indicators": [{"type":"string","description":"string","weight": 1-10}],
  "analysis": "string",
  "recommendations": ["string"]
}

BE DECISIVE: If the image shows clear signs of AI generation (smooth textures, perfect lighting, artistic/dreamlike quality), classify as "likely_ai" or "ai_generated". Real photos have imperfections.`;

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
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image and return the JSON." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            ],
          },
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
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again in a moment." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse?.choices?.[0]?.message?.content ?? "";
    console.log("Gemini raw response:", content);

    let modelOut: ModelOutput;
    try {
      modelOut = parseModelJson(content);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", e);
      modelOut = {
        riskLevel: "uncertain",
        indicators: [
          {
            type: "parse_error",
            description: "Model response could not be parsed as JSON; returning uncertain.",
            weight: 5,
          },
        ],
        analysis: "We could not parse the model output reliably. Please try again.",
        recommendations: ["Try uploading the image again", "Test with a different image"],
      };
    }

    const riskLevel: RiskLevel = modelOut.riskLevel ?? "uncertain";
    const scores = scoresFromRisk(riskLevel);
    const confidence = clamp(Math.max(scores.aiScore, scores.notAiScore), 0, 100);
    const isAIGenerated = riskLevel === "likely_ai" || riskLevel === "ai_generated";

    const result: MediaAnalysisResult = {
      mediaType: "image",
      isAIGenerated,
      confidence,
      riskLevel,
      indicators: Array.isArray(modelOut.indicators) ? modelOut.indicators : [],
      analysis: modelOut.analysis ?? "",
      recommendations: Array.isArray(modelOut.recommendations) ? modelOut.recommendations : [],
      geminiDetails: scores,
    };

    console.log("Media analysis result:", result);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in analyze-media:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
