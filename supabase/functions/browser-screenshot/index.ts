import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, fullPage = false, device = 'desktop' } = await req.json();

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

    console.log('Taking screenshot of:', formattedUrl);

    const accessKey = Deno.env.get('SCREENSHOTONE_ACCESS_KEY');
    
    if (!accessKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Screenshot API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configure viewport based on device
    const viewportConfig = device === 'mobile' 
      ? { width: 375, height: 812 }
      : { width: 1920, height: 1080 };

    // Build ScreenshotOne API URL
    const params = new URLSearchParams({
      access_key: accessKey,
      url: formattedUrl,
      viewport_width: viewportConfig.width.toString(),
      viewport_height: viewportConfig.height.toString(),
      full_page: fullPage.toString(),
      format: 'png',
      image_quality: '90',
      block_ads: 'true',
      block_cookie_banners: 'true',
      block_trackers: 'true',
      delay: '2',
      timeout: '60',
    });

    const screenshotUrl = `https://api.screenshotone.com/take?${params.toString()}`;

    console.log('Requesting screenshot from ScreenshotOne...');

    const response = await fetch(screenshotUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ScreenshotOne error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Screenshot failed: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to base64 using chunked approach to avoid stack overflow
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);

    console.log('Screenshot captured successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          screenshot: base64,
          url: formattedUrl,
          device,
          viewport: viewportConfig,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Screenshot error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Screenshot failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});