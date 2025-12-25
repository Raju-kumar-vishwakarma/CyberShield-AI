import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  Key,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Globe,
  Server,
  RefreshCw,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Password Strength Checker Component
export const PasswordSecurityTool = () => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const checkPasswordStrength = (pwd: string) => {
    let score = 0;
    const checks = {
      length: pwd.length >= 12,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      numbers: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      noCommon: !/(password|123456|qwerty|admin)/i.test(pwd),
    };

    Object.values(checks).forEach((passed) => {
      if (passed) score += 1;
    });

    return {
      score: Math.round((score / 6) * 100),
      checks,
      level: score <= 2 ? "weak" : score <= 4 ? "medium" : "strong",
    };
  };

  const generatePassword = (length = 16) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let pwd = "";
    for (let i = 0; i < length; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(pwd);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = checkPasswordStrength(password);

  return (
    <Card variant="cyber" className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Password Security Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Password Checker */}
        <div className="space-y-4">
          <h4 className="text-sm font-mono text-muted-foreground">Check Password Strength</h4>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to check..."
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {password && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono">Strength:</span>
                <Badge
                  variant={
                    strength.level === "weak"
                      ? "danger"
                      : strength.level === "medium"
                      ? "warning"
                      : "success"
                  }
                >
                  {strength.level.toUpperCase()} ({strength.score}%)
                </Badge>
              </div>
              <Progress
                value={strength.score}
                className={`h-2 ${
                  strength.level === "weak"
                    ? "[&>div]:bg-destructive"
                    : strength.level === "medium"
                    ? "[&>div]:bg-warning"
                    : "[&>div]:bg-success"
                }`}
              />

              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(strength.checks).map(([key, passed]) => (
                  <div
                    key={key}
                    className={`flex items-center gap-1 ${
                      passed ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {passed ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Password Generator */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <h4 className="text-sm font-mono text-muted-foreground">Generate Secure Password</h4>
          <div className="flex gap-2">
            <Button onClick={() => generatePassword(16)} variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate (16 chars)
            </Button>
            <Button onClick={() => generatePassword(24)} variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate (24 chars)
            </Button>
          </div>

          {generatedPassword && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border/50">
              <code className="flex-1 font-mono text-sm text-foreground break-all">
                {generatedPassword}
              </code>
              <Button size="sm" variant="ghost" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// IP Geolocation Lookup Component
export const IPGeolocationTool = () => {
  const [ip, setIp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    ip: string;
    country: string;
    city: string;
    isp: string;
    risk_level: string;
    is_vpn: boolean;
    is_proxy: boolean;
    is_tor: boolean;
    threat_score: number;
    location: { lat: number; lon: number };
  } | null>(null);
  const { toast } = useToast();

  const lookupIP = async () => {
    if (!ip.trim()) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ip-lookup", {
        body: { ip: ip.trim() },
      });

      if (error) throw error;
      setResult(data);

      toast({
        title: "IP Lookup Complete",
        description: `Location: ${data.city}, ${data.country}`,
      });
    } catch (error: any) {
      toast({
        title: "Lookup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="cyber" className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          IP Geolocation & Threat Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="Enter IP address (e.g., 8.8.8.8)"
            className="flex-1"
          />
          <Button onClick={lookupIP} disabled={!ip.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
            {!isLoading && "Lookup"}
          </Button>
        </div>

        {result && (
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-mono">IP Address</p>
                <p className="text-sm text-foreground font-mono">{result.ip}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono">Location</p>
                <p className="text-sm text-foreground">{result.city}, {result.country}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono">ISP</p>
                <p className="text-sm text-foreground">{result.isp}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono">Risk Level</p>
                <Badge variant={
                  result.risk_level === "low" ? "success" :
                  result.risk_level === "medium" ? "warning" : "danger"
                }>
                  {result.risk_level.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={result.is_vpn ? "warning" : "success"} className="text-xs">
                {result.is_vpn ? "VPN Detected" : "No VPN"}
              </Badge>
              <Badge variant={result.is_proxy ? "warning" : "success"} className="text-xs">
                {result.is_proxy ? "Proxy Detected" : "No Proxy"}
              </Badge>
              <Badge variant={result.is_tor ? "danger" : "success"} className="text-xs">
                {result.is_tor ? "Tor Exit Node" : "No Tor"}
              </Badge>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">Threat Score</p>
              <div className="flex items-center gap-2">
                <Progress
                  value={100 - result.threat_score}
                  className={`flex-1 h-2 ${
                    result.threat_score < 30
                      ? "[&>div]:bg-success"
                      : result.threat_score < 60
                      ? "[&>div]:bg-warning"
                      : "[&>div]:bg-destructive"
                  }`}
                />
                <span className="text-sm font-mono">{result.threat_score}%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// AI Threat Intelligence Component
export const AIThreatIntelligence = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    threat_type: string;
    severity: string;
    description: string;
    indicators: string[];
    mitigations: string[];
    recent_activity: string;
  } | null>(null);
  const { toast } = useToast();

  const analyzeThreat = async () => {
    if (!query.trim()) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("threat-intelligence", {
        body: { query: query.trim() },
      });

      if (error) throw error;
      setResult(data);

      toast({
        title: "Analysis Complete",
        description: `Threat: ${data.threat_type}`,
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="cyber" className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          AI Threat Intelligence
          <Badge variant="info" className="text-xs">Powered by AI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe threat (e.g., 'ransomware attack', 'suspicious IP 203.0.113.42')"
            className="flex-1"
          />
          <Button onClick={analyzeThreat} disabled={!query.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
            {!isLoading && "Analyze"}
          </Button>
        </div>

        {result && (
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">Threat Type</p>
                <p className="text-lg font-mono text-foreground">{result.threat_type}</p>
              </div>
              <Badge variant={
                result.severity === "low" ? "success" :
                result.severity === "medium" ? "warning" :
                result.severity === "high" ? "danger" : "danger"
              }>
                {result.severity.toUpperCase()}
              </Badge>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">Description</p>
              <p className="text-sm text-foreground">{result.description}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">Indicators of Compromise</p>
              <div className="space-y-1">
                {result.indicators.map((indicator, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-3 w-3 text-warning" />
                    <span>{indicator}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">Mitigations</p>
              <div className="space-y-1">
                {result.mitigations.map((mitigation, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Shield className="h-3 w-3 text-success" />
                    <span>{mitigation}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">Recent Activity</p>
              <p className="text-sm text-muted-foreground">{result.recent_activity}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
