import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VirusTotalResult {
  fileHash: string;
  hashType: string;
  found: boolean;
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  totalEngines: number;
  threatLabels: string[];
  detectionDetails: Array<{ engine: string; category: string; result: string | null }>;
  scanDate: string | null;
  fileName: string | null;
  fileType: string | null;
}

async function computeHash(fileContent: string, algorithm: 'SHA-256' | 'SHA-1' | 'MD5'): Promise<string> {
  let binaryContent: ArrayBuffer;
  try {
    // Try to decode as base64
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    binaryContent = bytes.buffer as ArrayBuffer;
  } catch {
    // If not base64, use raw string
    const encoder = new TextEncoder();
    binaryContent = encoder.encode(fileContent).buffer as ArrayBuffer;
  }

  const hashBuffer = await crypto.subtle.digest(algorithm, binaryContent);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileHash, fileContent, fileName } = await req.json();
    const VIRUSTOTAL_API_KEY = Deno.env.get('VIRUSTOTAL_API_KEY');

    if (!VIRUSTOTAL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'VirusTotal API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let hashToLookup = fileHash;
    let hashType = 'provided';

    // If file content is provided, compute hashes
    if (!hashToLookup && fileContent) {
      console.log('Computing file hash from content...');
      hashToLookup = await computeHash(fileContent, 'SHA-256');
      hashType = 'SHA-256';
      console.log(`Computed SHA-256: ${hashToLookup}`);
    }

    if (!hashToLookup) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either fileHash or fileContent is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Looking up hash on VirusTotal: ${hashToLookup}`);

    // Query VirusTotal API
    const vtResponse = await fetch(`https://www.virustotal.com/api/v3/files/${hashToLookup}`, {
      method: 'GET',
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (vtResponse.status === 404) {
      // File not found in VirusTotal database
      console.log('Hash not found in VirusTotal database');
      const result: VirusTotalResult = {
        fileHash: hashToLookup,
        hashType,
        found: false,
        malicious: 0,
        suspicious: 0,
        harmless: 0,
        undetected: 0,
        totalEngines: 0,
        threatLabels: [],
        detectionDetails: [],
        scanDate: null,
        fileName: fileName || null,
        fileType: null,
      };

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!vtResponse.ok) {
      const errorText = await vtResponse.text();
      console.error('VirusTotal API error:', vtResponse.status, errorText);
      throw new Error(`VirusTotal API error: ${vtResponse.status}`);
    }

    const vtData = await vtResponse.json();
    const attributes = vtData.data?.attributes || {};
    const lastAnalysisStats = attributes.last_analysis_stats || {};
    const lastAnalysisResults = attributes.last_analysis_results || {};

    // Extract detection details from top engines
    const detectionDetails: Array<{ engine: string; category: string; result: string | null }> = [];
    const engines = Object.entries(lastAnalysisResults).slice(0, 20);
    for (const [engine, result] of engines) {
      const r = result as { category: string; result: string | null };
      if (r.category === 'malicious' || r.category === 'suspicious') {
        detectionDetails.push({
          engine,
          category: r.category,
          result: r.result,
        });
      }
    }

    // Get threat labels
    const threatLabels: string[] = [];
    if (attributes.popular_threat_classification) {
      const classification = attributes.popular_threat_classification;
      if (classification.suggested_threat_label) {
        threatLabels.push(classification.suggested_threat_label);
      }
      if (classification.popular_threat_category) {
        for (const cat of classification.popular_threat_category) {
          if (cat.value && !threatLabels.includes(cat.value)) {
            threatLabels.push(cat.value);
          }
        }
      }
    }

    const result: VirusTotalResult = {
      fileHash: hashToLookup,
      hashType,
      found: true,
      malicious: lastAnalysisStats.malicious || 0,
      suspicious: lastAnalysisStats.suspicious || 0,
      harmless: lastAnalysisStats.harmless || 0,
      undetected: lastAnalysisStats.undetected || 0,
      totalEngines: Object.keys(lastAnalysisResults).length,
      threatLabels,
      detectionDetails,
      scanDate: attributes.last_analysis_date 
        ? new Date(attributes.last_analysis_date * 1000).toISOString() 
        : null,
      fileName: attributes.meaningful_name || fileName || null,
      fileType: attributes.type_description || null,
    };

    console.log(`VirusTotal result: ${result.malicious} malicious, ${result.suspicious} suspicious`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('VirusTotal lookup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Lookup failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
