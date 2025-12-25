import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanResult {
  url: string;
  finalUrl: string;
  redirectChain: string[];
  pageTitle: string;
  hasLoginForm: boolean;
  hasPasswordField: boolean;
  hasCreditCardField: boolean;
  suspiciousScripts: string[];
  externalLinks: string[];
  sslValid: boolean;
  domAnalysis: {
    forms: number;
    inputs: number;
    iframes: number;
    scripts: number;
    externalScripts: number;
  };
  riskScore: number;
  riskLevel: string;
  threatIndicators: Array<{ type: string; description: string; severity: string }>;
  headers: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Starting security scan for:', formattedUrl);

    // Track redirects
    const redirectChain: string[] = [formattedUrl];
    let finalUrl = formattedUrl;
    let html = '';
    let responseHeaders: Record<string, string> = {};

    try {
      // Fetch with redirect tracking
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(formattedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      finalUrl = response.url;
      if (finalUrl !== formattedUrl) {
        redirectChain.push(finalUrl);
      }

      // Capture response headers
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      html = await response.text();
      console.log('Page fetched successfully, HTML length:', html.length);

    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch URL: ${fetchError instanceof Error ? fetchError.message : 'Network error'}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract page title
    const pageTitle = extractTitle(html);
    console.log('Page title:', pageTitle);

    // Analyze the page content
    const analysis = analyzePageContent(html, formattedUrl);
    console.log('Analysis complete:', JSON.stringify(analysis.domAnalysis));
    
    // Analyze security headers
    const headerAnalysis = analyzeSecurityHeaders(responseHeaders);
    
    // Calculate risk score
    const { riskScore, riskLevel, threatIndicators } = calculateRiskScore(
      analysis, 
      formattedUrl, 
      finalUrl, 
      redirectChain,
      headerAnalysis
    );

    const result: ScanResult = {
      url: formattedUrl,
      finalUrl,
      redirectChain,
      pageTitle,
      hasLoginForm: analysis.hasLoginForm,
      hasPasswordField: analysis.hasPasswordField,
      hasCreditCardField: analysis.hasCreditCardField,
      suspiciousScripts: analysis.suspiciousScripts,
      externalLinks: analysis.externalLinks,
      sslValid: finalUrl.startsWith('https://'),
      domAnalysis: analysis.domAnalysis,
      riskScore,
      riskLevel,
      threatIndicators,
      headers: responseHeaders,
    };

    // Store in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase.from('steel_security_scans').insert({
      url: result.url,
      final_url: result.finalUrl,
      redirect_chain: result.redirectChain,
      page_title: result.pageTitle,
      has_login_form: result.hasLoginForm,
      has_password_field: result.hasPasswordField,
      has_credit_card_field: result.hasCreditCardField,
      suspicious_scripts: result.suspiciousScripts,
      external_links: result.externalLinks,
      ssl_valid: result.sslValid,
      risk_score: result.riskScore,
      risk_level: result.riskLevel,
      threat_indicators: result.threatIndicators,
      dom_analysis: result.domAnalysis,
    });

    if (dbError) {
      console.error('Database insert error:', dbError);
    } else {
      console.log('Scan result stored in database');
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in security-scan:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Scan failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : 'Unknown';
}

function analyzeSecurityHeaders(headers: Record<string, string>) {
  const issues: string[] = [];
  
  // Check for important security headers
  const securityHeaders = {
    'strict-transport-security': 'HSTS',
    'content-security-policy': 'CSP',
    'x-frame-options': 'X-Frame-Options',
    'x-content-type-options': 'X-Content-Type-Options',
    'x-xss-protection': 'X-XSS-Protection',
  };
  
  for (const [header, name] of Object.entries(securityHeaders)) {
    const headerLower = Object.keys(headers).find(h => h.toLowerCase() === header);
    if (!headerLower) {
      issues.push(`Missing ${name} header`);
    }
  }
  
  return { issues, hasHSTS: !!headers['strict-transport-security'] };
}

function analyzePageContent(html: string, originalUrl: string) {
  const lowerHtml = html.toLowerCase();
  
  // Detect forms and inputs
  const formCount = (html.match(/<form/gi) || []).length;
  const inputCount = (html.match(/<input/gi) || []).length;
  const iframeCount = (html.match(/<iframe/gi) || []).length;
  const scriptCount = (html.match(/<script/gi) || []).length;
  
  // Check for login/password fields
  const hasLoginForm = /type\s*=\s*["']?(password|email)["']?/i.test(html) || 
                       /(login|signin|sign-in|log-in)/i.test(html);
  const hasPasswordField = /type\s*=\s*["']?password["']?/i.test(html);
  const hasCreditCardField = /(credit.?card|card.?number|cvv|cvc|expir)/i.test(html) ||
                              /type\s*=\s*["']?(tel|number)["']?.*(?:card|credit|payment)/i.test(html);
  
  // Extract external links
  let domain = '';
  try {
    domain = new URL(originalUrl).hostname;
  } catch {
    domain = originalUrl;
  }
  
  const linkMatches = html.match(/href\s*=\s*["']?(https?:\/\/[^"'\s>]+)/gi) || [];
  const externalLinks = linkMatches
    .map(link => link.replace(/href\s*=\s*["']?/i, ''))
    .filter(link => {
      try {
        return new URL(link).hostname !== domain;
      } catch {
        return false;
      }
    })
    .slice(0, 20);
  
  // Detect suspicious scripts
  const suspiciousPatterns = [
    { pattern: /eval\s*\(/i, name: 'eval()' },
    { pattern: /document\.write/i, name: 'document.write' },
    { pattern: /unescape\s*\(/i, name: 'unescape()' },
    { pattern: /fromCharCode/i, name: 'fromCharCode' },
    { pattern: /\.createElement\s*\(\s*["']script/i, name: 'dynamic script creation' },
    { pattern: /window\.location\s*=|location\.href\s*=/i, name: 'redirect script' },
    { pattern: /document\.cookie/i, name: 'cookie access' },
    { pattern: /localStorage|sessionStorage/i, name: 'storage access' },
    { pattern: /keydown|keyup|keypress/i, name: 'keyboard event listener' },
    { pattern: /XMLHttpRequest|fetch\s*\(/i, name: 'AJAX request' },
  ];
  
  const suspiciousScripts: string[] = [];
  for (const { pattern, name } of suspiciousPatterns) {
    if (pattern.test(html)) {
      suspiciousScripts.push(name);
    }
  }
  
  // Count external scripts
  const scriptSrcMatches = html.match(/src\s*=\s*["']?(https?:\/\/[^"'\s>]+\.js)/gi) || [];
  const externalScriptCount = scriptSrcMatches.filter(src => {
    try {
      return !src.toLowerCase().includes(domain);
    } catch {
      return false;
    }
  }).length;
  
  return {
    hasLoginForm,
    hasPasswordField,
    hasCreditCardField,
    externalLinks,
    suspiciousScripts,
    domAnalysis: {
      forms: formCount,
      inputs: inputCount,
      iframes: iframeCount,
      scripts: scriptCount,
      externalScripts: externalScriptCount,
    },
  };
}

function calculateRiskScore(
  analysis: ReturnType<typeof analyzePageContent>, 
  originalUrl: string,
  finalUrl: string,
  redirectChain: string[],
  headerAnalysis: { issues: string[]; hasHSTS: boolean }
) {
  let score = 0;
  const threatIndicators: Array<{ type: string; description: string; severity: string }> = [];
  
  // Check SSL
  if (!finalUrl.startsWith('https://')) {
    score += 30;
    threatIndicators.push({
      type: 'no_ssl',
      description: 'Website does not use HTTPS encryption',
      severity: 'high',
    });
  }
  
  // Check for suspicious redirects
  if (redirectChain.length > 2) {
    score += 15;
    threatIndicators.push({
      type: 'multiple_redirects',
      description: `Page redirects through ${redirectChain.length - 1} intermediate URLs`,
      severity: 'medium',
    });
  }
  
  // Check if domain changed during redirect
  try {
    const originalDomain = new URL(originalUrl).hostname;
    const finalDomain = new URL(finalUrl).hostname;
    if (originalDomain !== finalDomain) {
      score += 20;
      threatIndicators.push({
        type: 'domain_redirect',
        description: `URL redirects to different domain: ${finalDomain}`,
        severity: 'high',
      });
    }
  } catch {}
  
  // Check security headers
  if (headerAnalysis.issues.length > 3) {
    score += 10;
    threatIndicators.push({
      type: 'missing_security_headers',
      description: `Missing ${headerAnalysis.issues.length} security headers`,
      severity: 'low',
    });
  }
  
  // Check for credential harvesting indicators
  if (analysis.hasLoginForm && analysis.hasPasswordField) {
    score += 10;
    threatIndicators.push({
      type: 'credential_form',
      description: 'Page contains login/password form',
      severity: 'info',
    });
  }
  
  if (analysis.hasCreditCardField) {
    score += 15;
    threatIndicators.push({
      type: 'payment_form',
      description: 'Page contains credit card/payment fields',
      severity: 'medium',
    });
  }
  
  // Check for suspicious scripts
  if (analysis.suspiciousScripts.length > 0) {
    const severityScore = Math.min(analysis.suspiciousScripts.length * 5, 25);
    score += severityScore;
    threatIndicators.push({
      type: 'suspicious_scripts',
      description: `Detected suspicious patterns: ${analysis.suspiciousScripts.join(', ')}`,
      severity: analysis.suspiciousScripts.length > 3 ? 'high' : 'medium',
    });
  }
  
  // Check for excessive iframes
  if (analysis.domAnalysis.iframes > 3) {
    score += 10;
    threatIndicators.push({
      type: 'excessive_iframes',
      description: `Page contains ${analysis.domAnalysis.iframes} iframes`,
      severity: 'medium',
    });
  }
  
  // Check for many external scripts
  if (analysis.domAnalysis.externalScripts > 10) {
    score += 5;
    threatIndicators.push({
      type: 'many_external_scripts',
      description: `Page loads ${analysis.domAnalysis.externalScripts} external scripts`,
      severity: 'low',
    });
  }
  
  // Check domain for typosquatting patterns
  const popularDomains = ['google', 'facebook', 'apple', 'microsoft', 'amazon', 'paypal', 'netflix', 'instagram', 'twitter', 'linkedin', 'bank', 'secure'];
  const urlLower = finalUrl.toLowerCase();
  
  for (const domain of popularDomains) {
    // Check for lookalike domains (e.g., g00gle, faceb00k)
    const lookalikes = [
      domain.replace(/o/g, '0'),
      domain.replace(/l/g, '1'),
      domain.replace(/e/g, '3'),
      domain.replace(/a/g, '4'),
      domain + '-login',
      domain + '-verify',
      domain + '-secure',
      'secure-' + domain,
      'login-' + domain,
      domain + '-account',
    ];
    
    for (const lookalike of lookalikes) {
      if (urlLower.includes(lookalike) && !urlLower.includes(domain + '.com') && !urlLower.includes(domain + '.org')) {
        score += 30;
        threatIndicators.push({
          type: 'typosquatting',
          description: `Domain may be impersonating ${domain}`,
          severity: 'critical',
        });
        break;
      }
    }
  }
  
  // Check for suspicious TLDs
  const suspiciousTlds = ['.xyz', '.top', '.club', '.work', '.click', '.link', '.tk', '.ml', '.ga', '.cf'];
  for (const tld of suspiciousTlds) {
    if (urlLower.includes(tld)) {
      score += 10;
      threatIndicators.push({
        type: 'suspicious_tld',
        description: `Uses potentially suspicious TLD: ${tld}`,
        severity: 'low',
      });
      break;
    }
  }
  
  // Cap score at 100
  score = Math.min(score, 100);
  
  // Determine risk level
  let riskLevel: string;
  if (score < 15) riskLevel = 'safe';
  else if (score < 35) riskLevel = 'low';
  else if (score < 55) riskLevel = 'medium';
  else if (score < 75) riskLevel = 'high';
  else riskLevel = 'critical';
  
  return { riskScore: score, riskLevel, threatIndicators };
}
