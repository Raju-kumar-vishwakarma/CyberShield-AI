import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ThreatIndicator {
  type: string;
  description: string;
  severity: string;
}

interface PhishingScan {
  id: string;
  content_preview: string | null;
  status: string;
  confidence: number | null;
  threat_indicators: ThreatIndicator[];
  ai_analysis: string | null;
  detected_urls: string[] | null;
  scanned_at: string;
  created_at: string;
}

interface PhishingAnalysisResult {
  status: 'safe' | 'suspicious' | 'phishing';
  confidence: number;
  threat_indicators: ThreatIndicator[];
  detected_urls: string[];
  analysis: string;
}

export const usePhishingDetection = () => {
  const [recentScans, setRecentScans] = useState<PhishingScan[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch recent scans
  const fetchRecentScans = useCallback(async () => {
    const { data, error } = await supabase
      .from('phishing_scans')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching scans:', error);
    } else {
      // Transform the data to ensure threat_indicators is properly typed
      const transformedData = (data || []).map(scan => ({
        ...scan,
        threat_indicators: Array.isArray(scan.threat_indicators) 
          ? (scan.threat_indicators as unknown as ThreatIndicator[])
          : []
      }));
      setRecentScans(transformedData);
    }
  }, []);

  // Analyze content for phishing
  const analyzeContent = useCallback(async (content: string): Promise<PhishingAnalysisResult | null> => {
    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter content to analyze',
        variant: 'destructive',
      });
      return null;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-phishing', {
        body: { content }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const result = data as PhishingAnalysisResult;

      if (result.status === 'phishing') {
        toast({
          title: '🚨 Phishing Detected!',
          description: `High confidence phishing attempt detected (${result.confidence}%)`,
          variant: 'destructive',
        });
      } else if (result.status === 'suspicious') {
        toast({
          title: '⚠️ Suspicious Content',
          description: `This content may be suspicious (${result.confidence}% confidence)`,
        });
      } else {
        toast({
          title: '✅ Content Appears Safe',
          description: 'No phishing indicators detected',
        });
      }

      // Refresh scans after analysis
      await fetchRecentScans();

      return result;
    } catch (error) {
      console.error('Error analyzing content:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze content',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast, fetchRecentScans]);

  // Set up realtime subscriptions
  useEffect(() => {
    setIsLoading(true);
    fetchRecentScans().finally(() => setIsLoading(false));

    const channel = supabase
      .channel('phishing-scans-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'phishing_scans'
        },
        (payload) => {
          console.log('New scan:', payload);
          const newScan = {
            ...payload.new as PhishingScan,
            threat_indicators: Array.isArray((payload.new as PhishingScan).threat_indicators)
              ? (payload.new as PhishingScan).threat_indicators
              : []
          };
          setRecentScans(prev => [newScan, ...prev.slice(0, 19)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecentScans]);

  return {
    recentScans,
    isAnalyzing,
    isLoading,
    analyzeContent,
    refetch: fetchRecentScans
  };
};
