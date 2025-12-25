import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertificateInfo {
  issuer: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  fingerprint: string;
}

// Parse X.509 certificate details from PEM or raw certificate
function parseCertificateInfo(cert: Uint8Array): CertificateInfo | null {
  try {
    // Convert to string to parse basic info
    const decoder = new TextDecoder();
    const certStr = decoder.decode(cert);
    
    // Try to extract common certificate fields using ASN.1/DER parsing patterns
    // This is a simplified parser - real certificates are complex
    return null; // We'll rely on the TLS connection info instead
  } catch {
    return null;
  }
}

// Get real SSL certificate info using external API
async function getRealCertificateInfo(domain: string): Promise<{
  issuer: string;
  validFrom: string;
  validTo: string;
  subject: string;
  serialNumber: string;
  protocol: string;
  cipher: string;
} | null> {
  try {
    // Use crt.sh API to get certificate transparency logs
    const crtShResponse = await fetch(
      `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    
    if (crtShResponse.ok) {
      const certs = await crtShResponse.json();
      if (Array.isArray(certs) && certs.length > 0) {
        // Get the most recent valid certificate
        const validCerts = certs
          .filter((c: any) => new Date(c.not_after) > new Date())
          .sort((a: any, b: any) => new Date(b.entry_timestamp).getTime() - new Date(a.entry_timestamp).getTime());
        
        if (validCerts.length > 0) {
          const cert = validCerts[0];
          return {
            issuer: cert.issuer_name || 'Unknown',
            validFrom: cert.not_before,
            validTo: cert.not_after,
            subject: cert.common_name || domain,
            serialNumber: cert.serial_number || 'Unknown',
            protocol: 'TLSv1.3',
            cipher: 'Unknown'
          };
        }
      }
    }
  } catch (error) {
    console.log('crt.sh API error:', error);
  }
  
  return null;
}

// Extract issuer organization from issuer string
function extractIssuerOrg(issuerString: string): string {
  // Common patterns in issuer strings
  const patterns = [
    /O=([^,]+)/i,           // O=Organization Name
    /CN=([^,]+)/i,          // CN=Common Name
    /organizationName=([^,]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = issuerString.match(pattern);
    if (match && match[1]) {
      // Clean up the organization name
      let org = match[1].trim();
      // Remove quotes if present
      org = org.replace(/^["']|["']$/g, '');
      
      // Map to friendly names
      const friendlyNames: Record<string, string> = {
        "Let's Encrypt": "Let's Encrypt",
        "DigiCert Inc": "DigiCert",
        "DigiCert": "DigiCert",
        "Cloudflare, Inc.": "Cloudflare",
        "Cloudflare": "Cloudflare",
        "Amazon": "Amazon",
        "Google Trust Services LLC": "Google Trust Services",
        "Google Trust Services": "Google Trust Services",
        "GlobalSign": "GlobalSign",
        "Sectigo Limited": "Sectigo",
        "Sectigo": "Sectigo",
        "GoDaddy.com, Inc.": "GoDaddy",
        "GoDaddy": "GoDaddy",
        "Microsoft Corporation": "Microsoft",
        "Entrust, Inc.": "Entrust",
        "Comodo CA Limited": "Comodo",
        "COMODO CA Limited": "Comodo",
        "ZeroSSL": "ZeroSSL",
        "R3": "Let's Encrypt", // R3 is Let's Encrypt intermediate
        "R10": "Let's Encrypt",
        "R11": "Let's Encrypt",
        "E1": "Let's Encrypt",
        "E5": "Let's Encrypt",
        "E6": "Let's Encrypt",
      };
      
      // Check for partial matches
      for (const [key, value] of Object.entries(friendlyNames)) {
        if (org.includes(key)) {
          return value;
        }
      }
      
      return org;
    }
  }
  
  return 'Unknown';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean domain
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim().toLowerCase();
    console.log('Checking SSL for domain:', cleanDomain);

    // Step 1: Try to connect and get real certificate info
    let connectionSuccessful = false;
    let connectionError = '';
    let responseHeaders: Headers | null = null;
    let statusCode = 0;
    let realCertInfo: {
      issuer: string;
      validFrom: string;
      validTo: string;
      subject: string;
      serialNumber: string;
      protocol: string;
      cipher: string;
    } | null = null;

    // First, try to get certificate info from Certificate Transparency logs
    console.log('Fetching certificate from CT logs...');
    realCertInfo = await getRealCertificateInfo(cleanDomain);
    
    if (realCertInfo) {
      console.log('Found certificate in CT logs:', {
        issuer: realCertInfo.issuer,
        validTo: realCertInfo.validTo,
        subject: realCertInfo.subject
      });
    }

    // Then verify the connection works
    try {
      console.log(`Attempting to connect to https://${cleanDomain}`);
      const response = await fetch(`https://${cleanDomain}`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });
      connectionSuccessful = true;
      statusCode = response.status;
      responseHeaders = response.headers;
      console.log(`Connection successful! Status: ${statusCode}`);
    } catch (fetchError: unknown) {
      console.error('Connection error:', fetchError);
      if (fetchError instanceof Error) {
        connectionError = fetchError.message;
        
        // Check for SSL-specific errors
        if (connectionError.includes('certificate') || 
            connectionError.includes('SSL') || 
            connectionError.includes('TLS')) {
          return new Response(
            JSON.stringify({
              is_valid: false,
              grade: 'F',
              issuer: null,
              expires_at: null,
              valid_from: null,
              subject: null,
              serial_number: null,
              vulnerabilities: ['SSL/TLS Certificate Error: ' + connectionError],
              recommendations: ['Fix SSL certificate configuration', 'Ensure certificate is not expired', 'Use a trusted certificate authority'],
              domain_exists: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Domain doesn't exist
        if (connectionError.includes('getaddrinfo') || 
            connectionError.includes('ENOTFOUND') ||
            connectionError.includes('dns') ||
            connectionError.includes('Name or service not known') ||
            connectionError.includes('lookup')) {
          return new Response(
            JSON.stringify({
              is_valid: false,
              grade: 'N/A',
              issuer: null,
              expires_at: null,
              valid_from: null,
              subject: null,
              serial_number: null,
              vulnerabilities: ['Domain does not exist or has no DNS records'],
              recommendations: ['Verify the domain name is correct', 'Check if DNS is properly configured'],
              domain_exists: false,
              error_message: `Domain "${cleanDomain}" could not be found.`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Timeout
        if (connectionError.includes('timeout') || connectionError.includes('TimeoutError')) {
          return new Response(
            JSON.stringify({
              is_valid: false,
              grade: 'N/A',
              issuer: null,
              expires_at: null,
              valid_from: null,
              subject: null,
              serial_number: null,
              vulnerabilities: ['Connection timeout - server may be slow or blocking'],
              recommendations: ['Try again later', 'Check if the domain is accessible'],
              domain_exists: true,
              error_message: `Connection to "${cleanDomain}" timed out.`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // Try HTTP fallback
      try {
        await fetch(`http://${cleanDomain}`, {
          method: 'HEAD',
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
        });
        
        return new Response(
          JSON.stringify({
            is_valid: false,
            grade: 'F',
            issuer: null,
            expires_at: null,
            valid_from: null,
            subject: null,
            serial_number: null,
            vulnerabilities: ['No valid HTTPS configuration', 'Site accessible only via HTTP'],
            recommendations: ['Install an SSL certificate', 'Use Let\'s Encrypt for free SSL'],
            domain_exists: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({
            is_valid: false,
            grade: 'N/A',
            issuer: null,
            expires_at: null,
            valid_from: null,
            subject: null,
            serial_number: null,
            vulnerabilities: ['Domain unreachable'],
            recommendations: ['Verify the domain name is correct'],
            domain_exists: false,
            error_message: `Cannot connect to "${cleanDomain}".`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 2: Gather security headers
    const securityHeaders = {
      hsts: responseHeaders?.get('strict-transport-security'),
      xFrameOptions: responseHeaders?.get('x-frame-options'),
      xContentTypeOptions: responseHeaders?.get('x-content-type-options'),
      xXssProtection: responseHeaders?.get('x-xss-protection'),
      contentSecurityPolicy: responseHeaders?.get('content-security-policy'),
    };

    console.log('Security headers found:', securityHeaders);

    // Step 3: Calculate grade based on security headers
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];
    let gradeScore = 100;

    if (!securityHeaders.hsts) {
      vulnerabilities.push('No HSTS header detected');
      recommendations.push('Implement HSTS to enforce HTTPS.');
      gradeScore -= 15;
    }

    if (!securityHeaders.xFrameOptions) {
      vulnerabilities.push('Missing X-Frame-Options header');
      recommendations.push('Add X-Frame-Options to prevent clickjacking.');
      gradeScore -= 10;
    }

    if (!securityHeaders.xContentTypeOptions) {
      vulnerabilities.push('Missing X-Content-Type-Options header');
      recommendations.push('Add X-Content-Type-Options: nosniff.');
      gradeScore -= 5;
    }

    if (!securityHeaders.contentSecurityPolicy) {
      vulnerabilities.push('No Content-Security-Policy header');
      recommendations.push('Implement CSP to prevent XSS attacks.');
      gradeScore -= 10;
    }

    // Check certificate expiration
    let certExpiresSoon = false;
    if (realCertInfo?.validTo) {
      const expiryDate = new Date(realCertInfo.validTo);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        vulnerabilities.push('Certificate has EXPIRED!');
        recommendations.push('Renew your SSL certificate immediately.');
        gradeScore -= 50;
      } else if (daysUntilExpiry < 30) {
        vulnerabilities.push(`Certificate expires in ${daysUntilExpiry} days`);
        recommendations.push('Renew your SSL certificate soon.');
        certExpiresSoon = true;
        gradeScore -= 10;
      } else if (daysUntilExpiry < 60) {
        vulnerabilities.push(`Certificate expires in ${daysUntilExpiry} days`);
        certExpiresSoon = true;
        gradeScore -= 5;
      }
    }

    // Calculate grade
    let grade: string;
    if (gradeScore >= 95) grade = 'A+';
    else if (gradeScore >= 90) grade = 'A';
    else if (gradeScore >= 80) grade = 'B';
    else if (gradeScore >= 70) grade = 'C';
    else if (gradeScore >= 60) grade = 'D';
    else grade = 'F';

    // Extract issuer organization name
    const issuerOrg = realCertInfo ? extractIssuerOrg(realCertInfo.issuer) : 'Unknown';

    const result = {
      is_valid: true,
      grade,
      issuer: issuerOrg,
      issuer_full: realCertInfo?.issuer || null,
      expires_at: realCertInfo?.validTo || null,
      valid_from: realCertInfo?.validFrom || null,
      subject: realCertInfo?.subject || cleanDomain,
      serial_number: realCertInfo?.serialNumber || null,
      days_until_expiry: realCertInfo?.validTo 
        ? Math.floor((new Date(realCertInfo.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
      vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : null,
      recommendations: recommendations.length > 0 ? recommendations : ['Your SSL configuration looks good!'],
      security_headers: {
        hsts: !!securityHeaders.hsts,
        xFrameOptions: !!securityHeaders.xFrameOptions,
        xContentTypeOptions: !!securityHeaders.xContentTypeOptions,
        contentSecurityPolicy: !!securityHeaders.contentSecurityPolicy
      }
    };

    console.log('SSL analysis result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('SSL check error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});