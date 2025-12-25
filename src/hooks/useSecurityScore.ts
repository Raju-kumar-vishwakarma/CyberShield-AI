import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityMetrics {
  // Threat metrics
  totalThreats: number;
  criticalThreats: number;
  highThreats: number;
  mediumThreats: number;
  lowThreats: number;
  blockedIPs: number;
  
  // Phishing metrics
  phishingDetected: number;
  suspiciousScans: number;
  safeScans: number;
  totalPhishingScans: number;
  
  // SSL metrics
  sslChecks: number;
  validSSL: number;
  invalidSSL: number;
  
  // Email breach metrics
  emailChecks: number;
  breachedEmails: number;
  safeEmails: number;
  
  // Honeypot metrics
  honeypotEvents: number;
  criticalHoneypotEvents: number;
}

interface CategoryScore {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  details: string;
}

interface SecurityScoreData {
  overallScore: number;
  overallStatus: 'excellent' | 'good' | 'warning' | 'critical';
  metrics: SecurityMetrics;
  categories: CategoryScore[];
  recommendations: string[];
  lastUpdated: Date;
}

export const useSecurityScore = () => {
  const [data, setData] = useState<SecurityScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const calculateCategoryScore = (
    name: string,
    score: number,
    maxScore: number,
    details: string
  ): CategoryScore => {
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;
    let status: CategoryScore['status'] = 'excellent';
    
    if (percentage >= 80) status = 'excellent';
    else if (percentage >= 60) status = 'good';
    else if (percentage >= 40) status = 'warning';
    else status = 'critical';
    
    return { name, score, maxScore, percentage, status, details };
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      // Fetch all data in parallel
      const [
        { data: threats },
        { data: phishingScans },
        { data: suspiciousIPs },
        { data: sslChecks },
        { data: emailChecks },
        { data: honeypotLogs }
      ] = await Promise.all([
        supabase.from('network_threats').select('*').limit(500),
        supabase.from('phishing_scans').select('*').limit(500),
        supabase.from('suspicious_ips').select('*'),
        supabase.from('ssl_checks').select('*').limit(100),
        supabase.from('email_breach_checks').select('*').limit(100),
        supabase.from('honeypot_logs').select('*').limit(500)
      ]);

      const threatsList = threats || [];
      const scansList = phishingScans || [];
      const ipsList = suspiciousIPs || [];
      const sslList = sslChecks || [];
      const emailList = emailChecks || [];
      const honeypotList = honeypotLogs || [];

      // Calculate metrics
      const metrics: SecurityMetrics = {
        totalThreats: threatsList.length,
        criticalThreats: threatsList.filter(t => t.severity === 'critical').length,
        highThreats: threatsList.filter(t => t.severity === 'high').length,
        mediumThreats: threatsList.filter(t => t.severity === 'medium').length,
        lowThreats: threatsList.filter(t => t.severity === 'low').length,
        blockedIPs: ipsList.filter(ip => ip.is_blocked).length,
        
        phishingDetected: scansList.filter(s => s.status === 'phishing').length,
        suspiciousScans: scansList.filter(s => s.status === 'suspicious').length,
        safeScans: scansList.filter(s => s.status === 'safe').length,
        totalPhishingScans: scansList.length,
        
        sslChecks: sslList.length,
        validSSL: sslList.filter(s => s.is_valid).length,
        invalidSSL: sslList.filter(s => !s.is_valid).length,
        
        emailChecks: emailList.length,
        breachedEmails: emailList.filter(e => e.is_breached).length,
        safeEmails: emailList.filter(e => !e.is_breached).length,
        
        honeypotEvents: honeypotList.length,
        criticalHoneypotEvents: honeypotList.filter(h => h.severity === 'critical').length
      };

      // Calculate category scores
      const categories: CategoryScore[] = [];

      // Threat Protection Score (based on blocked vs total threats)
      const threatScore = metrics.totalThreats > 0 
        ? Math.round(((metrics.blockedIPs / Math.max(1, metrics.totalThreats)) * 100))
        : 100;
      categories.push(calculateCategoryScore(
        'Threat Protection',
        threatScore,
        100,
        `${metrics.blockedIPs} IPs blocked, ${metrics.criticalThreats} critical threats`
      ));

      // Phishing Defense Score
      const phishingScore = metrics.totalPhishingScans > 0
        ? Math.round((metrics.safeScans / metrics.totalPhishingScans) * 100)
        : 100;
      categories.push(calculateCategoryScore(
        'Phishing Defense',
        phishingScore,
        100,
        `${metrics.safeScans} safe, ${metrics.phishingDetected} phishing detected`
      ));

      // SSL Health Score
      const sslScore = metrics.sslChecks > 0
        ? Math.round((metrics.validSSL / metrics.sslChecks) * 100)
        : 100;
      categories.push(calculateCategoryScore(
        'SSL/TLS Security',
        sslScore,
        100,
        `${metrics.validSSL}/${metrics.sslChecks} certificates valid`
      ));

      // Email Security Score
      const emailScore = metrics.emailChecks > 0
        ? Math.round((metrics.safeEmails / metrics.emailChecks) * 100)
        : 100;
      categories.push(calculateCategoryScore(
        'Email Security',
        emailScore,
        100,
        `${metrics.safeEmails} safe, ${metrics.breachedEmails} breached`
      ));

      // Intrusion Detection Score (honeypot)
      const intrusionScore = metrics.honeypotEvents > 0
        ? Math.max(0, 100 - (metrics.criticalHoneypotEvents * 10))
        : 100;
      categories.push(calculateCategoryScore(
        'Intrusion Detection',
        intrusionScore,
        100,
        `${metrics.honeypotEvents} events captured, ${metrics.criticalHoneypotEvents} critical`
      ));

      // Calculate overall score (weighted average)
      const weights = {
        'Threat Protection': 0.3,
        'Phishing Defense': 0.25,
        'SSL/TLS Security': 0.2,
        'Email Security': 0.15,
        'Intrusion Detection': 0.1
      };

      let overallScore = 0;
      categories.forEach(cat => {
        const weight = weights[cat.name as keyof typeof weights] || 0.2;
        overallScore += cat.percentage * weight;
      });
      overallScore = Math.round(overallScore);

      // Determine overall status
      let overallStatus: SecurityScoreData['overallStatus'] = 'excellent';
      if (overallScore >= 80) overallStatus = 'excellent';
      else if (overallScore >= 60) overallStatus = 'good';
      else if (overallScore >= 40) overallStatus = 'warning';
      else overallStatus = 'critical';

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (metrics.criticalThreats > 0) {
        recommendations.push(`Address ${metrics.criticalThreats} critical threat(s) immediately`);
      }
      if (metrics.phishingDetected > 0) {
        recommendations.push(`Review ${metrics.phishingDetected} detected phishing attempt(s)`);
      }
      if (metrics.invalidSSL > 0) {
        recommendations.push(`Fix ${metrics.invalidSSL} invalid SSL certificate(s)`);
      }
      if (metrics.breachedEmails > 0) {
        recommendations.push(`Update passwords for ${metrics.breachedEmails} breached email(s)`);
      }
      if (ipsList.filter(ip => !ip.is_blocked && ip.severity === 'high').length > 0) {
        recommendations.push('Block high-severity suspicious IPs');
      }
      if (recommendations.length === 0) {
        recommendations.push('Great job! Your security posture is excellent');
        recommendations.push('Continue monitoring for new threats');
      }

      setData({
        overallScore,
        overallStatus,
        metrics,
        categories,
        recommendations,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error fetching security score data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Set up realtime subscriptions for all relevant tables
    const channels = [
      supabase.channel('score-threats').on('postgres_changes', { event: '*', schema: 'public', table: 'network_threats' }, fetchData).subscribe(),
      supabase.channel('score-phishing').on('postgres_changes', { event: '*', schema: 'public', table: 'phishing_scans' }, fetchData).subscribe(),
      supabase.channel('score-ips').on('postgres_changes', { event: '*', schema: 'public', table: 'suspicious_ips' }, fetchData).subscribe(),
      supabase.channel('score-ssl').on('postgres_changes', { event: '*', schema: 'public', table: 'ssl_checks' }, fetchData).subscribe(),
      supabase.channel('score-email').on('postgres_changes', { event: '*', schema: 'public', table: 'email_breach_checks' }, fetchData).subscribe(),
      supabase.channel('score-honeypot').on('postgres_changes', { event: '*', schema: 'public', table: 'honeypot_logs' }, fetchData).subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [fetchData]);

  return {
    data,
    isLoading,
    refetch: fetchData
  };
};
