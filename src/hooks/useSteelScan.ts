import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { steelApi, SteelScanResult, ScreenshotAnalysis, BatchScanResult, BatchScanSummary } from '@/lib/api/steel';

interface SteelSecurityScan {
  id: string;
  url: string;
  final_url: string | null;
  redirect_chain: string[];
  screenshot_base64: string | null;
  page_title: string | null;
  has_login_form: boolean;
  has_password_field: boolean;
  has_credit_card_field: boolean;
  suspicious_scripts: string[];
  external_links: string[];
  ssl_valid: boolean | null;
  risk_score: number | null;
  risk_level: string | null;
  ai_analysis: string | null;
  threat_indicators: Array<{ type: string; description: string; severity: string }>;
  dom_analysis: Record<string, unknown>;
  scanned_at: string;
  created_at: string;
}

export const useSteelScan = () => {
  const [recentScans, setRecentScans] = useState<SteelSecurityScan[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchScanning, setIsBatchScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScan, setCurrentScan] = useState<SteelScanResult | null>(null);
  const [visualAnalysis, setVisualAnalysis] = useState<ScreenshotAnalysis | null>(null);
  const [batchResults, setBatchResults] = useState<BatchScanResult[] | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchScanSummary | null>(null);
  const { toast } = useToast();

  // Fetch recent scans
  const fetchRecentScans = useCallback(async () => {
    const { data, error } = await supabase
      .from('steel_security_scans')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching Steel scans:', error);
    } else {
      const transformedData = (data || []).map(scan => ({
        ...scan,
        redirect_chain: Array.isArray(scan.redirect_chain) ? scan.redirect_chain as string[] : [],
        suspicious_scripts: Array.isArray(scan.suspicious_scripts) ? scan.suspicious_scripts as string[] : [],
        external_links: Array.isArray(scan.external_links) ? scan.external_links as string[] : [],
        threat_indicators: Array.isArray(scan.threat_indicators) 
          ? scan.threat_indicators as Array<{ type: string; description: string; severity: string }>
          : [],
        dom_analysis: typeof scan.dom_analysis === 'object' && scan.dom_analysis !== null
          ? scan.dom_analysis as Record<string, unknown>
          : {},
      }));
      setRecentScans(transformedData);
    }
  }, []);

  // Perform single URL scan
  const performScan = useCallback(async (url: string): Promise<SteelScanResult | null> => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL to scan',
        variant: 'destructive',
      });
      return null;
    }

    setIsScanning(true);
    setCurrentScan(null);
    setVisualAnalysis(null);

    try {
      toast({
        title: '🔍 Starting Deep Scan',
        description: 'Analyzing website security...',
      });

      const result = await steelApi.deepScan(url);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Scan failed');
      }

      // Automatically capture screenshot
      let screenshot: string | undefined;
      try {
        setIsCapturingScreenshot(true);
        toast({
          title: '📸 Capturing Screenshot',
          description: 'Taking browser screenshot...',
        });
        const screenshotResult = await steelApi.takeScreenshot(url);
        if (screenshotResult.success && screenshotResult.data?.screenshot) {
          screenshot = screenshotResult.data.screenshot;
        }
      } catch (screenshotError) {
        console.log('Screenshot capture failed:', screenshotError);
      } finally {
        setIsCapturingScreenshot(false);
      }

      const scanData = {
        ...result.data,
        screenshot: screenshot || result.data.screenshot,
      };

      setCurrentScan(scanData);

      const riskEmoji = {
        safe: '✅',
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴',
      };

      toast({
        title: `${riskEmoji[scanData.riskLevel]} Scan Complete`,
        description: `Risk Level: ${scanData.riskLevel.toUpperCase()} (Score: ${scanData.riskScore}/100)`,
        variant: scanData.riskLevel === 'critical' || scanData.riskLevel === 'high' ? 'destructive' : 'default',
      });

      await fetchRecentScans();
      return scanData;
    } catch (error) {
      console.error('Error performing scan:', error);
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Failed to scan URL',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [toast, fetchRecentScans]);

  // Perform batch URL scan
  const performBatchScan = useCallback(async (urls: string[], includeScreenshots = false): Promise<BatchScanResult[] | null> => {
    if (!urls || urls.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter URLs to scan',
        variant: 'destructive',
      });
      return null;
    }

    setIsBatchScanning(true);
    setBatchResults(null);
    setBatchSummary(null);

    try {
      toast({
        title: '🔍 Starting Batch Scan',
        description: `Scanning ${urls.length} URLs...`,
      });

      const result = await steelApi.batchScan(urls, includeScreenshots);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Batch scan failed');
      }

      setBatchResults(result.data.results);
      setBatchSummary(result.data.summary);

      const highRiskCount = result.data.summary.highRisk;
      toast({
        title: highRiskCount > 0 ? '⚠️ Batch Scan Complete' : '✅ Batch Scan Complete',
        description: `${result.data.summary.completed}/${result.data.summary.total} scanned. ${highRiskCount} high-risk URLs found.`,
        variant: highRiskCount > 0 ? 'destructive' : 'default',
      });

      await fetchRecentScans();
      return result.data.results;
    } catch (error) {
      console.error('Error performing batch scan:', error);
      toast({
        title: 'Batch Scan Failed',
        description: error instanceof Error ? error.message : 'Failed to scan URLs',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsBatchScanning(false);
    }
  }, [toast, fetchRecentScans]);

  // Take screenshot of URL
  const takeScreenshot = useCallback(async (url: string, options?: { fullPage?: boolean; device?: 'desktop' | 'mobile' }): Promise<string | null> => {
    try {
      toast({
        title: '📸 Taking Screenshot',
        description: 'Capturing page in real browser...',
      });

      const result = await steelApi.takeScreenshot(url, options);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Screenshot failed');
      }

      toast({
        title: '✅ Screenshot Captured',
        description: 'Page screenshot ready',
      });

      return result.data.screenshot;
    } catch (error) {
      console.error('Error taking screenshot:', error);
      toast({
        title: 'Screenshot Failed',
        description: error instanceof Error ? error.message : 'Failed to take screenshot',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Analyze screenshot with AI
  const analyzeScreenshotWithAI = useCallback(async (screenshot: string, url: string): Promise<ScreenshotAnalysis | null> => {
    setIsAnalyzing(true);

    try {
      toast({
        title: '🤖 AI Analysis',
        description: 'Analyzing screenshot for phishing indicators...',
      });

      const result = await steelApi.analyzeScreenshot(screenshot, url);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Analysis failed');
      }

      setVisualAnalysis(result.data);

      toast({
        title: result.data.isPhishing ? '⚠️ Phishing Detected' : '✅ Analysis Complete',
        description: result.data.overallAssessment.slice(0, 100),
        variant: result.data.isPhishing ? 'destructive' : 'default',
      });

      return result.data;
    } catch (error) {
      console.error('Error analyzing screenshot:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze screenshot',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  // Full scan with AI analysis
  const performFullScan = useCallback(async (url: string) => {
    const scanResult = await performScan(url);
    
    if (scanResult?.screenshot) {
      await analyzeScreenshotWithAI(scanResult.screenshot, url);
    }
    
    return scanResult;
  }, [performScan, analyzeScreenshotWithAI]);

  // Clear batch results
  const clearBatchResults = useCallback(() => {
    setBatchResults(null);
    setBatchSummary(null);
  }, []);

  // Set up realtime subscriptions
  useEffect(() => {
    setIsLoading(true);
    fetchRecentScans().finally(() => setIsLoading(false));

    const channel = supabase
      .channel('steel-scans-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'steel_security_scans'
        },
        (payload) => {
          console.log('New Steel scan:', payload);
          const newScan = payload.new as SteelSecurityScan;
          setRecentScans(prev => [
            {
              ...newScan,
              redirect_chain: Array.isArray(newScan.redirect_chain) ? newScan.redirect_chain : [],
              suspicious_scripts: Array.isArray(newScan.suspicious_scripts) ? newScan.suspicious_scripts : [],
              external_links: Array.isArray(newScan.external_links) ? newScan.external_links : [],
              threat_indicators: Array.isArray(newScan.threat_indicators) ? newScan.threat_indicators : [],
              dom_analysis: typeof newScan.dom_analysis === 'object' && newScan.dom_analysis !== null
                ? newScan.dom_analysis as Record<string, unknown>
                : {},
            },
            ...prev.slice(0, 19)
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecentScans]);

  return {
    recentScans,
    isScanning,
    isCapturingScreenshot,
    isAnalyzing,
    isBatchScanning,
    isLoading,
    currentScan,
    visualAnalysis,
    batchResults,
    batchSummary,
    performScan,
    performFullScan,
    performBatchScan,
    takeScreenshot,
    analyzeScreenshotWithAI,
    clearBatchResults,
    refetch: fetchRecentScans,
  };
};
