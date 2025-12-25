import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NetworkThreat {
  id: string;
  source_ip: string;
  destination: string;
  protocol: string;
  bytes_transferred: string | null;
  threat_type: string | null;
  severity: string;
  confidence: number | null;
  ai_analysis: string | null;
  status: string;
  detected_at: string;
  created_at: string;
}

interface SuspiciousIP {
  id: string;
  ip_address: string;
  location: string | null;
  attempt_count: number;
  severity: string;
  is_blocked: boolean;
  last_seen_at: string;
  created_at: string;
}

interface ThreatAnalysisResult {
  is_threat: boolean;
  threat_type: string;
  severity: string;
  confidence: number;
  analysis: string;
}

export const useThreatDetection = () => {
  const [threats, setThreats] = useState<NetworkThreat[]>([]);
  const [suspiciousIPs, setSuspiciousIPs] = useState<SuspiciousIP[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch initial data
  const fetchThreats = useCallback(async () => {
    const { data, error } = await supabase
      .from('network_threats')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching threats:', error);
    } else {
      setThreats(data || []);
    }
  }, []);

  const fetchSuspiciousIPs = useCallback(async () => {
    const { data, error } = await supabase
      .from('suspicious_ips')
      .select('*')
      .order('last_seen_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching suspicious IPs:', error);
    } else {
      setSuspiciousIPs(data || []);
    }
  }, []);

  // Analyze network traffic
  const analyzeTraffic = useCallback(async (networkData: {
    source_ip: string;
    destination: string;
    protocol: string;
    bytes?: string;
    location?: string;
  }): Promise<ThreatAnalysisResult | null> => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-threat', {
        body: { networkData }
      });

      if (error) {
        throw error;
      }

      if (data.is_threat) {
        toast({
          title: '⚠️ Threat Detected!',
          description: `${data.threat_type} from ${networkData.source_ip} - Severity: ${data.severity}`,
          variant: 'destructive',
        });
      }

      return data as ThreatAnalysisResult;
    } catch (error) {
      console.error('Error analyzing traffic:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze network traffic',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  // Block an IP
  const blockIP = useCallback(async (ipAddress: string) => {
    const { error } = await supabase
      .from('suspicious_ips')
      .update({ is_blocked: true })
      .eq('ip_address', ipAddress);

    if (error) {
      console.error('Error blocking IP:', error);
      toast({
        title: 'Error',
        description: 'Failed to block IP address',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'IP Blocked',
        description: `${ipAddress} has been blocked`,
      });
    }
  }, [toast]);

  // Set up realtime subscriptions
  useEffect(() => {
    setIsLoading(true);
    
    // Fetch initial data
    Promise.all([fetchThreats(), fetchSuspiciousIPs()]).finally(() => {
      setIsLoading(false);
    });

    // Subscribe to realtime updates for threats
    const threatsChannel = supabase
      .channel('network-threats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'network_threats'
        },
        (payload) => {
          console.log('Threat update:', payload);
          if (payload.eventType === 'INSERT') {
            setThreats(prev => [payload.new as NetworkThreat, ...prev.slice(0, 49)]);
          } else if (payload.eventType === 'UPDATE') {
            setThreats(prev => prev.map(t => 
              t.id === (payload.new as NetworkThreat).id ? payload.new as NetworkThreat : t
            ));
          }
        }
      )
      .subscribe();

    // Subscribe to realtime updates for suspicious IPs
    const ipsChannel = supabase
      .channel('suspicious-ips-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suspicious_ips'
        },
        (payload) => {
          console.log('Suspicious IP update:', payload);
          if (payload.eventType === 'INSERT') {
            setSuspiciousIPs(prev => [payload.new as SuspiciousIP, ...prev.slice(0, 19)]);
          } else if (payload.eventType === 'UPDATE') {
            setSuspiciousIPs(prev => prev.map(ip => 
              ip.id === (payload.new as SuspiciousIP).id ? payload.new as SuspiciousIP : ip
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(threatsChannel);
      supabase.removeChannel(ipsChannel);
    };
  }, [fetchThreats, fetchSuspiciousIPs]);

  return {
    threats,
    suspiciousIPs,
    isAnalyzing,
    isLoading,
    analyzeTraffic,
    blockIP,
    refetch: () => Promise.all([fetchThreats(), fetchSuspiciousIPs()])
  };
};
