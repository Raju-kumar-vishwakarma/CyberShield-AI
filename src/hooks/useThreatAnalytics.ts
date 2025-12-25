import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NetworkThreat {
  id: string;
  source_ip: string;
  destination: string;
  protocol: string;
  threat_type: string | null;
  severity: string;
  confidence: number | null;
  ai_analysis: string | null;
  status: string;
  detected_at: string;
}

interface PhishingScan {
  id: string;
  status: string;
  confidence: number | null;
  scanned_at: string;
}

interface ThreatStats {
  totalThreats: number;
  criticalThreats: number;
  highThreats: number;
  mediumThreats: number;
  lowThreats: number;
  blockedIPs: number;
  phishingDetected: number;
  safeScans: number;
}

interface TrendDataPoint {
  date: string;
  threats: number;
  phishing: number;
  blocked: number;
}

interface ThreatTypeCount {
  name: string;
  value: number;
  color: string;
}

export const useThreatAnalytics = () => {
  const [threats, setThreats] = useState<NetworkThreat[]>([]);
  const [phishingScans, setPhishingScans] = useState<PhishingScan[]>([]);
  const [stats, setStats] = useState<ThreatStats>({
    totalThreats: 0,
    criticalThreats: 0,
    highThreats: 0,
    mediumThreats: 0,
    lowThreats: 0,
    blockedIPs: 0,
    phishingDetected: 0,
    safeScans: 0
  });
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [threatTypes, setThreatTypes] = useState<ThreatTypeCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // Fetch network threats
    const { data: threatsData } = await supabase
      .from('network_threats')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(100);

    // Fetch phishing scans
    const { data: scansData } = await supabase
      .from('phishing_scans')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(100);

    // Fetch blocked IPs
    const { data: ipsData } = await supabase
      .from('suspicious_ips')
      .select('*')
      .eq('is_blocked', true);

    const threatsList = threatsData || [];
    const scansList = scansData || [];
    const blockedIPs = ipsData || [];

    setThreats(threatsList);
    setPhishingScans(scansList);

    // Calculate stats
    const phishingDetected = scansList.filter(s => s.status === 'phishing').length;
    const suspiciousScans = scansList.filter(s => s.status === 'suspicious').length;

    setStats({
      totalThreats: threatsList.length,
      criticalThreats: threatsList.filter(t => t.severity === 'critical').length,
      highThreats: threatsList.filter(t => t.severity === 'high').length,
      mediumThreats: threatsList.filter(t => t.severity === 'medium').length,
      lowThreats: threatsList.filter(t => t.severity === 'low').length,
      blockedIPs: blockedIPs.length,
      phishingDetected: phishingDetected + suspiciousScans,
      safeScans: scansList.filter(s => s.status === 'safe').length
    });

    // Calculate threat types distribution
    const typeCounts: Record<string, number> = {};
    threatsList.forEach(t => {
      const type = t.threat_type || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const colors = [
      'hsl(0, 100%, 50%)',    // Red
      'hsl(45, 100%, 50%)',   // Orange
      'hsl(187, 100%, 42%)',  // Cyan
      'hsl(155, 100%, 50%)',  // Green
      'hsl(270, 100%, 60%)',  // Purple
      'hsl(200, 100%, 50%)',  // Blue
    ];

    const typeData = Object.entries(typeCounts)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    setThreatTypes(typeData);

    // Calculate trend data (last 7 days)
    const last7Days: TrendDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', { weekday: 'short' });

      const dayThreats = threatsList.filter(t => 
        t.detected_at.startsWith(dateStr)
      ).length;

      const dayPhishing = scansList.filter(s => 
        s.scanned_at.startsWith(dateStr) && s.status !== 'safe'
      ).length;

      last7Days.push({
        date: displayDate,
        threats: dayThreats,
        phishing: dayPhishing,
        blocked: Math.floor(dayThreats * 0.8) // Approximate blocked
      });
    }

    setTrendData(last7Days);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    // Set up realtime subscriptions
    const threatsChannel = supabase
      .channel('analytics-threats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'network_threats' }, () => {
        fetchData();
      })
      .subscribe();

    const scansChannel = supabase
      .channel('analytics-scans')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phishing_scans' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(threatsChannel);
      supabase.removeChannel(scansChannel);
    };
  }, [fetchData]);

  return {
    threats,
    phishingScans,
    stats,
    trendData,
    threatTypes,
    isLoading,
    refetch: fetchData
  };
};
