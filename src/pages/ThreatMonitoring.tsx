import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Globe,
  Server,
  Wifi,
  AlertTriangle,
  Shield,
  Eye,
  Ban,
  TrendingUp,
  Clock,
  Loader2,
  Zap,
  RefreshCw,
  MapPin,
  Network,
  Lock,
  CheckCircle,
  Search,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useThreatDetection } from "@/hooks/useThreatDetection";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConnectionInfo {
  ip: string;
  userAgent: string;
  timestamp: string;
  location: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    lat: number;
    lon: number;
    timezone: string;
  } | null;
  network: {
    isp: string;
    org: string;
    asn: string;
    isProxy: boolean;
    isHosting: boolean;
  } | null;
  security: {
    isSecure: boolean;
    protocol: string;
    tlsVersion: string;
  };
}

interface ThreatIntelData {
  ip: string;
  isKnownAttacker: boolean;
  abuseScore: number;
  country: string;
  isp: string;
  reports: number;
  lastReported: string | null;
  categories: string[];
}

const ATTACK_TYPE_COLORS: Record<string, string> = {
  "SQL Injection": "hsl(0, 100%, 50%)",
  "XSS Attacks": "hsl(45, 100%, 50%)",
  "Brute Force": "hsl(187, 100%, 42%)",
  "DDoS": "hsl(155, 100%, 50%)",
  "Data Exfiltration": "hsl(300, 100%, 50%)",
  "Malware": "hsl(30, 100%, 50%)",
  "Phishing": "hsl(200, 100%, 50%)",
  "Port Scan": "hsl(120, 100%, 40%)",
  "Other": "hsl(270, 100%, 60%)",
};

const ThreatMonitoring = () => {
  const { threats, suspiciousIPs, isAnalyzing, isLoading, analyzeTraffic, blockIP, refetch } = useThreatDetection();
  const { toast } = useToast();

  // Calculate attack types from real threats data
  const attackTypes = useMemo(() => {
    if (!threats || threats.length === 0) {
      return [{ name: "No Data", value: 100, color: "hsl(215, 20%, 40%)" }];
    }

    const typeCounts: Record<string, number> = {};
    threats.forEach((threat) => {
      const type = threat.threat_type || "Other";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const total = threats.length;
    return Object.entries(typeCounts)
      .map(([name, count]) => ({
        name,
        value: Math.round((count / total) * 100),
        color: ATTACK_TYPE_COLORS[name] || ATTACK_TYPE_COLORS["Other"],
      }))
      .sort((a, b) => b.value - a.value);
  }, [threats]);
  
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [isLoadingConnection, setIsLoadingConnection] = useState(false);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelData | null>(null);
  const [isCheckingThreat, setIsCheckingThreat] = useState(false);
  const [ipToCheck, setIpToCheck] = useState('');
  
  const [scanForm, setScanForm] = useState({
    source_ip: '',
    destination: '',
    protocol: 'TCP',
    bytes: '1024',
    location: ''
  });

  // Fetch real connection info on mount
  useEffect(() => {
    fetchConnectionInfo();
  }, []);

  const fetchConnectionInfo = async () => {
    setIsLoadingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('my-connection');
      if (error) throw error;
      if (data?.success) {
        setConnectionInfo(data.data);
      }
    } catch (error) {
      console.error('Error fetching connection info:', error);
    } finally {
      setIsLoadingConnection(false);
    }
  };

  const checkThreatIntel = async (ip: string) => {
    if (!ip) return;
    setIsCheckingThreat(true);
    try {
      const { data, error } = await supabase.functions.invoke('threat-feed', {
        body: { ip }
      });
      if (error) throw error;
      if (data?.success) {
        setThreatIntel(data.data);
        toast({
          title: data.data.isKnownAttacker ? 'Threat Detected!' : 'IP Analysis Complete',
          description: `Abuse score: ${data.data.abuseScore}/100`,
          variant: data.data.isKnownAttacker ? 'destructive' : 'default',
        });
      }
    } catch (error) {
      console.error('Error checking threat intel:', error);
      toast({
        title: 'Error',
        description: 'Failed to check threat intelligence',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingThreat(false);
    }
  };

  const handleScan = async () => {
    if (!scanForm.source_ip || !scanForm.destination) return;
    await analyzeTraffic(scanForm);
    setScanForm({ source_ip: '', destination: '', protocol: 'TCP', bytes: '1024', location: '' });
  };

  const threatStats = {
    total: threats.length,
    critical: threats.filter(t => t.severity === 'critical').length,
    high: threats.filter(t => t.severity === 'high').length,
    blocked: suspiciousIPs.filter(ip => ip.is_blocked).length
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-destructive/10 rounded-2xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
          <div className="relative p-6 rounded-2xl border border-primary/20 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 animate-pulse">
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-4xl font-mono font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                  AI Threat Monitoring
                </h1>
                <p className="text-muted-foreground mt-1">
                  Real-time AI-powered network surveillance with live threat intelligence
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge variant="info" className="px-3 py-1">
                <Zap className="h-3 w-3 mr-1" /> Live Monitoring
              </Badge>
              <Badge variant="success" className="px-3 py-1">
                <Shield className="h-3 w-3 mr-1" /> AI Protected
              </Badge>
              <Badge variant="warning" className="px-3 py-1">
                <Eye className="h-3 w-3 mr-1" /> {threatStats.total} Threats Tracked
              </Badge>
            </div>
          </div>
        </div>

        {/* Your Real Connection Info */}
        <Card variant="cyber" className="animate-fade-in border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              Your Live Connection
              {isLoadingConnection && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectionInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span className="text-xs">Your IP</span>
                  </div>
                  <p className="font-mono text-lg text-foreground">{connectionInfo.ip}</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs">Location</span>
                  </div>
                  <p className="font-mono text-lg text-foreground">
                    {connectionInfo.location ? `${connectionInfo.location.city}, ${connectionInfo.location.country}` : 'Unknown'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <Server className="h-4 w-4" />
                    <span className="text-xs">ISP</span>
                  </div>
                  <p className="font-mono text-sm text-foreground truncate">
                    {connectionInfo.network?.isp || 'Unknown'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span className="text-xs">Security</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-mono text-sm text-green-500">{connectionInfo.security.tlsVersion}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading your connection info...</p>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={fetchConnectionInfo} disabled={isLoadingConnection}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingConnection ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {connectionInfo?.ip && (
                <Button 
                  onClick={() => checkThreatIntel(connectionInfo.ip)} 
                  disabled={isCheckingThreat}
                  variant="outline"
                  className="border-primary/50"
                >
                  {isCheckingThreat ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                  Check My IP Safety
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Threat Intelligence Check */}
        <Card variant="cyber" className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Real-Time Threat Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <Input
                placeholder="Enter IP address to check (e.g., 185.220.101.1)"
                value={ipToCheck}
                onChange={(e) => setIpToCheck(e.target.value)}
                className="flex-1 bg-background/50"
                onKeyDown={(e) => e.key === 'Enter' && checkThreatIntel(ipToCheck)}
              />
              <Button 
                onClick={() => checkThreatIntel(ipToCheck)} 
                disabled={isCheckingThreat || !ipToCheck}
              >
                {isCheckingThreat ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Check Threat
              </Button>
            </div>

            {threatIntel && (
              <div className={`p-4 rounded-lg border ${threatIntel.isKnownAttacker ? 'bg-destructive/10 border-destructive/50' : 'bg-green-500/10 border-green-500/50'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {threatIntel.isKnownAttacker ? (
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    )}
                    <div>
                      <p className="font-mono font-bold">{threatIntel.ip}</p>
                      <p className="text-sm text-muted-foreground">{threatIntel.country} • {threatIntel.isp}</p>
                    </div>
                  </div>
                  <Badge variant={threatIntel.abuseScore > 50 ? 'danger' : threatIntel.abuseScore > 20 ? 'warning' : 'success'}>
                    Risk: {threatIntel.abuseScore}/100
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className={threatIntel.isKnownAttacker ? 'text-destructive font-bold' : 'text-green-500 font-bold'}>
                      {threatIntel.isKnownAttacker ? 'MALICIOUS' : 'SAFE'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reports</span>
                    <p className="font-mono">{threatIntel.reports}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Reported</span>
                    <p className="font-mono">{threatIntel.lastReported ? formatDistanceToNow(new Date(threatIntel.lastReported), { addSuffix: true }) : 'Never'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Categories</span>
                    <p className="font-mono text-xs">{threatIntel.categories.length > 0 ? threatIntel.categories.join(', ') : 'None'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Scan Panel */}
        <Card variant="cyber" className="animate-fade-in border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary animate-pulse" />
              AI Traffic Analyzer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <Input
                placeholder="Source IP (e.g., 192.168.1.1)"
                value={scanForm.source_ip}
                onChange={(e) => setScanForm(prev => ({ ...prev, source_ip: e.target.value }))}
                className="bg-secondary/50"
              />
              <Input
                placeholder="Destination"
                value={scanForm.destination}
                onChange={(e) => setScanForm(prev => ({ ...prev, destination: e.target.value }))}
                className="bg-secondary/50"
              />
              <Input
                placeholder="Protocol"
                value={scanForm.protocol}
                onChange={(e) => setScanForm(prev => ({ ...prev, protocol: e.target.value }))}
                className="bg-secondary/50"
              />
              <Input
                placeholder="Location"
                value={scanForm.location}
                onChange={(e) => setScanForm(prev => ({ ...prev, location: e.target.value }))}
                className="bg-secondary/50"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleScan} 
                  disabled={isAnalyzing || !scanForm.source_ip || !scanForm.destination}
                  className="flex-1"
                >
                  {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Analyze
                </Button>
              </div>
            </div>
            <Button variant="ghost" onClick={refetch} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardContent className="p-4 text-center">
              <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-mono font-bold text-foreground">{threatStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Threats</p>
            </CardContent>
          </Card>
          <Card variant="danger" className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-2xl font-mono font-bold text-destructive">{threatStats.high}</p>
              <p className="text-xs text-muted-foreground">High Severity</p>
            </CardContent>
          </Card>
          <Card variant="success" className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <CardContent className="p-4 text-center">
              <Shield className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-2xl font-mono font-bold text-success">{threatStats.blocked}</p>
              <p className="text-xs text-muted-foreground">IPs Blocked</p>
            </CardContent>
          </Card>
          <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <CardContent className="p-4 text-center">
              <Globe className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-mono font-bold text-foreground">{suspiciousIPs.length}</p>
              <p className="text-xs text-muted-foreground">Suspicious IPs</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Real-time Threats */}
          <Card variant="cyber" className="lg:col-span-2 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" />
                Real-time Detected Threats
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {threats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No threats detected yet. Use the AI analyzer to scan traffic.</p>
                  </div>
                ) : (
                  threats.map((threat) => (
                    <div
                      key={threat.id}
                      className="p-4 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            threat.severity === "critical" || threat.severity === "high" 
                              ? "bg-destructive/10 border border-destructive/30" 
                              : threat.severity === "medium"
                              ? "bg-warning/10 border border-warning/30"
                              : "bg-success/10 border border-success/30"
                          }`}>
                            {threat.severity === "critical" || threat.severity === "high" ? (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            ) : threat.severity === "medium" ? (
                              <Eye className="h-4 w-4 text-warning" />
                            ) : (
                              <Server className="h-4 w-4 text-success" />
                            )}
                          </div>
                          <div>
                            <p className="font-mono text-sm text-foreground">{threat.threat_type}</p>
                            <p className="text-xs text-muted-foreground">{threat.protocol}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            threat.severity === "critical" ? "danger" :
                            threat.severity === "high" ? "danger" :
                            threat.severity === "medium" ? "warning" : "success"
                          }>
                            {threat.severity}
                          </Badge>
                          {threat.confidence && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {threat.confidence}% conf
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                        <div>
                          <span className="text-muted-foreground">Source:</span>
                          <p className="font-mono text-foreground">{threat.source_ip}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Destination:</span>
                          <p className="font-mono text-foreground">{threat.destination}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Detected:</span>
                          <p className="font-mono text-foreground text-xs">
                            {formatDistanceToNow(new Date(threat.detected_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {threat.ai_analysis && (
                        <p className="text-xs text-muted-foreground border-t border-border/30 pt-2 mt-2">
                          <span className="text-primary">AI Analysis:</span> {threat.ai_analysis}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attack Types Chart */}
          <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Attack Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                // Skeleton loading state
                <div className="space-y-4">
                  <div className="h-[200px] flex items-center justify-center">
                    <div className="relative">
                      <Skeleton className="w-40 h-40 rounded-full" />
                      <Skeleton className="w-24 h-24 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card" />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="w-3 h-3 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-4 w-10" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : attackTypes.length === 1 && attackTypes[0].name === "No Data" ? (
                // Empty state
                <div className="h-[280px] flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">No threat data available</p>
                  <p className="text-muted-foreground/70 text-xs">Analyze traffic to see attack types</p>
                </div>
              ) : (
                <>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attackTypes}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {attackTypes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(222, 40%, 12%)",
                            border: "1px solid hsl(187, 100%, 42%)",
                            borderRadius: "8px",
                            fontFamily: "JetBrains Mono",
                            color: "hsl(210, 40%, 98%)",
                          }}
                          itemStyle={{
                            color: "hsl(210, 40%, 98%)",
                          }}
                          labelStyle={{
                            color: "hsl(210, 40%, 98%)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {attackTypes.map((type, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                          <span className="text-muted-foreground">{type.name}</span>
                        </div>
                        <span className="font-mono text-foreground">{type.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Suspicious IPs */}
        <Card variant="danger" className="animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Suspicious IP Addresses
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-destructive/30">
                    <th className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Location
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Attempts
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Last Seen
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {suspiciousIPs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No suspicious IPs detected yet
                      </td>
                    </tr>
                  ) : (
                    suspiciousIPs.map((ip) => (
                      <tr key={ip.id} className="border-b border-border/30 hover:bg-destructive/5 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-foreground">{ip.ip_address}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-muted-foreground">{ip.location || 'Unknown'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-destructive">{ip.attempt_count}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(ip.last_seen_at), { addSuffix: true })}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={
                            ip.severity === "critical" || ip.severity === "high" ? "danger" :
                            ip.severity === "medium" ? "warning" : "info"
                          }>
                            {ip.severity}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => checkThreatIntel(ip.ip_address)}
                              disabled={isCheckingThreat}
                            >
                              <Search className="h-3 w-3 mr-1" />
                              Intel
                            </Button>
                            {ip.is_blocked ? (
                              <Badge variant="success">Blocked</Badge>
                            ) : (
                              <Button variant="danger" size="sm" onClick={() => blockIP(ip.ip_address)}>
                                <Ban className="h-3 w-3 mr-1" />
                                Block
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ThreatMonitoring;
