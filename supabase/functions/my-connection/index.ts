const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Getting client connection info...');

    // Get the client's real IP from headers
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || req.headers.get('cf-connecting-ip')
      || 'Unknown';

    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Get geolocation and network info for the client IP
    let geoData: any = null;
    
    if (clientIP && clientIP !== 'Unknown') {
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,countryCode,region,city,lat,lon,isp,org,as,timezone,proxy,hosting`);
        if (geoResponse.ok) {
          geoData = await geoResponse.json();
        }
      } catch (e) {
        console.error('Geo lookup failed:', e);
      }
    }

    // Get additional network stats
    const connectionInfo = {
      ip: clientIP,
      userAgent,
      timestamp: new Date().toISOString(),
      location: geoData ? {
        country: geoData.country,
        countryCode: geoData.countryCode,
        region: geoData.region,
        city: geoData.city,
        lat: geoData.lat,
        lon: geoData.lon,
        timezone: geoData.timezone,
      } : null,
      network: geoData ? {
        isp: geoData.isp,
        org: geoData.org,
        asn: geoData.as,
        isProxy: geoData.proxy,
        isHosting: geoData.hosting,
      } : null,
      security: {
        isSecure: true, // Edge function is always HTTPS
        protocol: 'HTTPS',
        tlsVersion: 'TLS 1.3',
      },
    };

    console.log('Connection info:', connectionInfo);

    return new Response(
      JSON.stringify({ success: true, data: connectionInfo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting connection info:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to get connection info' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
