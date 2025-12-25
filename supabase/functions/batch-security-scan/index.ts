import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanResult {
  url: string;
  finalUrl: string;
  pageTitle: string;
  sslValid: boolean;
  riskScore: number;
  riskLevel: string;
  hasLoginForm: boolean;
  hasPasswordField: boolean;
  threatCount: number;
  status: 'completed' | 'failed';
  error?: string;
  screenshot?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls, includeScreenshots = false } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'URLs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit batch size
    const maxBatchSize = 10;
    const urlsToScan = urls.slice(0, maxBatchSize);

    console.log(`Starting batch scan for ${urlsToScan.length} URLs`);

    const results: ScanResult[] = [];
    const screenshotOneAccessKey = Deno.env.get('SCREENSHOTONE_ACCESS_KEY');

    for (const url of urlsToScan) {
      try {
        // Format URL
        let formattedUrl = url.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
          formattedUrl = `https://${formattedUrl}`;
        }

        console.log(`Scanning: ${formattedUrl}`);

        // Fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(formattedUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          },
          redirect: 'follow',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const finalUrl = response.url;
        const html = await response.text();

        // Extract basic info
        const pageTitle = extractTitle(html);
        const analysis = analyzePageContent(html, formattedUrl);
        const { riskScore, riskLevel, threatIndicators } = calculateRiskScore(analysis, formattedUrl, finalUrl);

        let screenshot: string | undefined;
        
        // Get screenshot if requested and API key is available
        if (includeScreenshots && screenshotOneAccessKey) {
          try {
            const screenshotUrl = `https://api.screenshotone.com/take?access_key=${screenshotOneAccessKey}&url=${encodeURIComponent(formattedUrl)}&viewport_width=1280&viewport_height=800&format=jpg&quality=80&block_ads=true&timeout=30`;
            
            const screenshotResponse = await fetch(screenshotUrl);
            if (screenshotResponse.ok) {
              const buffer = await screenshotResponse.arrayBuffer();
              screenshot = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            }
          } catch (screenshotError) {
            console.error(`Screenshot error for ${formattedUrl}:`, screenshotError);
          }
        }

        results.push({
          url: formattedUrl,
          finalUrl,
          pageTitle,
          sslValid: finalUrl.startsWith('https://'),
          riskScore,
          riskLevel,
          hasLoginForm: analysis.hasLoginForm,
          hasPasswordField: analysis.hasPasswordField,
          threatCount: threatIndicators.length,
          status: 'completed',
          screenshot,
        });

      } catch (error) {
        console.error(`Error scanning ${url}:`, error);
        results.push({
          url,
          finalUrl: url,
          pageTitle: 'Unknown',
          sslValid: false,
          riskScore: 50,
          riskLevel: 'medium',
          hasLoginForm: false,
          hasPasswordField: false,
          threatCount: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Scan failed',
        });
      }
    }

    // Store batch results
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store successful scans in database
    for (const result of results.filter(r => r.status === 'completed')) {
      await supabase.from('steel_security_scans').insert({
        url: result.url,
        final_url: result.finalUrl,
        page_title: result.pageTitle,
        ssl_valid: result.sslValid,
        risk_score: result.riskScore,
        risk_level: result.riskLevel,
        has_login_form: result.hasLoginForm,
        has_password_field: result.hasPasswordField,
        screenshot_base64: result.screenshot || null,
      });
    }

    console.log(`Batch scan complete. ${results.filter(r => r.status === 'completed').length}/${results.length} successful`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          results,
          summary: {
            total: results.length,
            completed: results.filter(r => r.status === 'completed').length,
            failed: results.filter(r => r.status === 'failed').length,
            highRisk: results.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length,
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch scan error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Batch scan failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : 'Unknown';
}

function analyzePageContent(html: string, originalUrl: string) {
  const hasLoginForm = /type\s*=\s*["']?(password|email)["']?/i.test(html) || 
                       /(login|signin|sign-in)/i.test(html);
  const hasPasswordField = /type\s*=\s*["']?password["']?/i.test(html);
  const hasCreditCardField = /(credit.?card|card.?number|cvv)/i.test(html);
  
  const suspiciousPatterns = ['eval(', 'document.write', 'unescape(', 'fromCharCode'];
  const suspiciousScripts = suspiciousPatterns.filter(p => html.toLowerCase().includes(p.toLowerCase()));
  
  return { hasLoginForm, hasPasswordField, hasCreditCardField, suspiciousScripts };
}

function calculateRiskScore(
  analysis: ReturnType<typeof analyzePageContent>,
  originalUrl: string,
  finalUrl: string
) {
  let score = 0;
  const threatIndicators: Array<{ type: string; severity: string }> = [];
  
  if (!finalUrl.startsWith('https://')) {
    score += 30;
    threatIndicators.push({ type: 'no_ssl', severity: 'high' });
  }
  
  if (analysis.hasLoginForm && analysis.hasPasswordField) {
    score += 10;
    threatIndicators.push({ type: 'credential_form', severity: 'medium' });
  }
  
  if (analysis.hasCreditCardField) {
    score += 15;
    threatIndicators.push({ type: 'payment_form', severity: 'medium' });
  }
  
  if (analysis.suspiciousScripts.length > 0) {
    score += analysis.suspiciousScripts.length * 5;
    threatIndicators.push({ type: 'suspicious_scripts', severity: 'medium' });
  }
  
  // Check for typosquatting
  const popularDomains = ['google', 'facebook', 'apple', 'microsoft', 'amazon', 'paypal'];
  const urlLower = finalUrl.toLowerCase();
  for (const domain of popularDomains) {
    if (urlLower.includes(domain.replace(/o/g, '0')) || 
        urlLower.includes(domain + '-login') ||
        urlLower.includes('secure-' + domain)) {
      score += 30;
      threatIndicators.push({ type: 'typosquatting', severity: 'critical' });
      break;
    }
  }
  
  score = Math.min(score, 100);
  
  let riskLevel: string;
  if (score < 15) riskLevel = 'safe';
  else if (score < 35) riskLevel = 'low';
  else if (score < 55) riskLevel = 'medium';
  else if (score < 75) riskLevel = 'high';
  else riskLevel = 'critical';
  
  return { riskScore: score, riskLevel, threatIndicators };
}
