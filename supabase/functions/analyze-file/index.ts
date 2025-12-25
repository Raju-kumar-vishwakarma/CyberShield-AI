import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FileAnalysisResult {
  fileName: string;
  fileType: string;
  fileSize: number;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  threats: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
  indicators: string[];
  recommendations: string[];
  aiAnalysis: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileType, fileSize, fileContent } = await req.json();

    if (!fileName || !fileContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'File name and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing file: ${fileName}, type: ${fileType}, size: ${fileSize}`);

    // Analyze file content
    const threats: Array<{ type: string; description: string; severity: string }> = [];
    const indicators: string[] = [];
    let riskScore = 0;

    // Decode base64 content for text-based analysis
    let textContent = '';
    try {
      textContent = atob(fileContent);
    } catch {
      textContent = fileContent;
    }

    const textLower = textContent.toLowerCase();

    // Check for suspicious patterns in text content
    const suspiciousPatterns = [
      { pattern: /password|credential|login|account/gi, type: 'credential_harvesting', description: 'Contains credential-related keywords', severity: 'medium', score: 15 },
      { pattern: /urgent|immediately|action required|verify now/gi, type: 'urgency_manipulation', description: 'Uses urgency tactics commonly seen in phishing', severity: 'medium', score: 15 },
      { pattern: /click here|click below|click now/gi, type: 'call_to_action', description: 'Contains suspicious call-to-action phrases', severity: 'low', score: 10 },
      { pattern: /bank|paypal|amazon|microsoft|google|apple/gi, type: 'brand_impersonation', description: 'References major brands (potential impersonation)', severity: 'medium', score: 10 },
      { pattern: /suspend|terminate|deactivate|expire/gi, type: 'fear_tactics', description: 'Uses fear-based language', severity: 'medium', score: 15 },
      { pattern: /\$[\d,]+|usd|bitcoin|crypto|wallet/gi, type: 'financial_lure', description: 'Contains financial references or cryptocurrency terms', severity: 'medium', score: 15 },
      { pattern: /javascript:|data:|vbscript:/gi, type: 'code_injection', description: 'Contains potential code injection patterns', severity: 'critical', score: 30 },
      { pattern: /<script|onerror|onload|onclick/gi, type: 'malicious_script', description: 'Contains embedded script patterns', severity: 'critical', score: 30 },
      { pattern: /powershell|cmd\.exe|bash|exec\(/gi, type: 'command_execution', description: 'Contains command execution patterns', severity: 'critical', score: 35 },
      { pattern: /\.exe|\.bat|\.ps1|\.vbs|\.scr|\.dll/gi, type: 'executable_reference', description: 'References executable file types', severity: 'high', score: 25 },
      { pattern: /base64|decode|encode|eval\(/gi, type: 'obfuscation', description: 'Contains encoding/obfuscation patterns', severity: 'high', score: 20 },
    ];

    for (const { pattern, type, description, severity, score } of suspiciousPatterns) {
      const matches = textContent.match(pattern);
      if (matches && matches.length > 0) {
        threats.push({ type, description: `${description} (${matches.length} occurrences)`, severity });
        indicators.push(`Found ${matches.length}x ${type.replace(/_/g, ' ')}`);
        riskScore += Math.min(score * Math.log2(matches.length + 1), score * 2);
      }
    }

    // Check for URLs
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = textContent.match(urlPattern) || [];
    if (urls.length > 0) {
      indicators.push(`Contains ${urls.length} URL(s)`);
      
      // Check for suspicious URL patterns
      const suspiciousUrlPatterns = ['.xyz', '.tk', '.ml', '.ga', '.cf', 'bit.ly', 'tinyurl', 'goo.gl'];
      const suspiciousUrls = urls.filter(url => 
        suspiciousUrlPatterns.some(p => url.toLowerCase().includes(p))
      );
      
      if (suspiciousUrls.length > 0) {
        threats.push({
          type: 'suspicious_urls',
          description: `Contains ${suspiciousUrls.length} URL(s) with suspicious TLDs or shorteners`,
          severity: 'high'
        });
        riskScore += 20;
      }
    }

    // Check file type risks
    const highRiskExtensions = ['.exe', '.bat', '.ps1', '.vbs', '.scr', '.dll', '.jar', '.msi'];
    const mediumRiskExtensions = ['.doc', '.docm', '.xls', '.xlsm', '.ppt', '.pptm', '.js', '.hta'];
    const fileExt = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));

    if (highRiskExtensions.includes(fileExt)) {
      threats.push({
        type: 'dangerous_file_type',
        description: `File type ${fileExt} is commonly used for malware distribution`,
        severity: 'critical'
      });
      riskScore += 40;
    } else if (mediumRiskExtensions.includes(fileExt)) {
      threats.push({
        type: 'risky_file_type',
        description: `File type ${fileExt} can contain macros or scripts`,
        severity: 'medium'
      });
      riskScore += 15;
    }

    // Check for macro indicators in Office documents
    if (textLower.includes('vbaproject') || textLower.includes('macro') || textLower.includes('auto_open')) {
      threats.push({
        type: 'macro_detected',
        description: 'File may contain macros which can be malicious',
        severity: 'high'
      });
      riskScore += 25;
    }

    // Cap risk score
    riskScore = Math.min(riskScore, 100);

    // Determine risk level
    let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
    if (riskScore < 10) riskLevel = 'safe';
    else if (riskScore < 30) riskLevel = 'low';
    else if (riskScore < 50) riskLevel = 'medium';
    else if (riskScore < 75) riskLevel = 'high';
    else riskLevel = 'critical';

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskScore > 0) {
      recommendations.push('Do not open this file if you did not expect it');
      if (threats.some(t => t.type === 'macro_detected')) {
        recommendations.push('Disable macros in your document viewer');
      }
      if (threats.some(t => t.type === 'suspicious_urls')) {
        recommendations.push('Do not click any links in this document');
      }
      if (riskScore >= 50) {
        recommendations.push('Consider scanning with multiple antivirus solutions');
        recommendations.push('Report this file to your IT security team');
      }
    } else {
      recommendations.push('File appears safe, but always exercise caution');
    }

    // AI Analysis using Lovable AI
    let aiAnalysis = '';
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY) {
      try {
        const analysisPrompt = `Analyze this file for potential security threats:
File Name: ${fileName}
File Type: ${fileType}
File Size: ${fileSize} bytes
Detected Threats: ${threats.map(t => t.type).join(', ') || 'None'}
Risk Score: ${riskScore}/100

Content preview (first 1000 chars):
${textContent.slice(0, 1000)}

Provide a brief security assessment in 2-3 sentences.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a cybersecurity expert analyzing files for potential threats. Be concise and actionable.' },
              { role: 'user', content: analysisPrompt }
            ],
            max_tokens: 200,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiAnalysis = data.choices?.[0]?.message?.content || '';
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
      }
    }

    const result: FileAnalysisResult = {
      fileName,
      fileType: fileType || 'unknown',
      fileSize,
      riskLevel,
      riskScore: Math.round(riskScore),
      threats,
      indicators,
      recommendations,
      aiAnalysis: aiAnalysis || `File analyzed. Risk level: ${riskLevel}. ${threats.length} potential threats detected.`,
    };

    console.log(`Analysis complete: ${riskLevel} risk (${riskScore}/100)`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('File analysis error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
