import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Shield, ShieldAlert, ShieldCheck, Search, Server, Lock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DNSResult {
  domain: string;
  dnssec_enabled: boolean;
  has_spf: boolean;
  has_dmarc: boolean;
  has_dkim: boolean;
  mx_records: string[];
  ns_records: string[];
  a_records: string[];
  security_score: number;
  risk_level: string;
  recommendations: string[];
  analysis: string;
}

const DNSChecker = () => {
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DNSResult | null>(null);

  const handleCheck = async () => {
    if (!domain.trim()) {
      toast.error("Please enter a domain");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("dns-security-check", {
        body: { domain: domain.trim() },
      });

      if (error) throw error;

      if (data.success) {
        setResult(data.data);
        toast.success("DNS security check completed!");
      } else {
        toast.error(data.error || "Failed to check DNS security");
      }
    } catch (error: any) {
      console.error("DNS check error:", error);
      toast.error(error.message || "Failed to check DNS security");
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            DNS Security Checker
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze DNS configuration for security vulnerabilities
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Check Domain DNS Security
            </CardTitle>
            <CardDescription>
              Enter a domain to check DNSSEC, SPF, DMARC, and DKIM configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                className="flex-1"
              />
              <Button onClick={handleCheck} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Check DNS
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Security Score Card */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Security Score
                  </span>
                  <Badge className={getRiskColor(result.risk_level)}>
                    {result.risk_level} Risk
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className={`text-6xl font-bold ${getScoreColor(result.security_score)}`}>
                    {result.security_score}
                  </div>
                  <p className="text-muted-foreground mt-2">out of 100</p>
                </div>

                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      DNSSEC
                    </span>
                    <Badge variant={result.dnssec_enabled ? "default" : "destructive"}>
                      {result.dnssec_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      SPF Record
                    </span>
                    <Badge variant={result.has_spf ? "default" : "destructive"}>
                      {result.has_spf ? "Found" : "Missing"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4" />
                      DMARC Record
                    </span>
                    <Badge variant={result.has_dmarc ? "default" : "destructive"}>
                      {result.has_dmarc ? "Found" : "Missing"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      DKIM
                    </span>
                    <Badge variant={result.has_dkim ? "default" : "destructive"}>
                      {result.has_dkim ? "Configured" : "Not Found"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DNS Records Card */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  DNS Records
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.a_records?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">A Records</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.a_records.map((record, i) => (
                        <Badge key={i} variant="outline">{record}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {result.ns_records?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">NS Records</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.ns_records.map((record, i) => (
                        <Badge key={i} variant="outline">{record}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {result.mx_records?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">MX Records</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.mx_records.map((record, i) => (
                        <Badge key={i} variant="outline">{record}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Card */}
            <Card className="bg-card/50 backdrop-blur border-border/50 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Security Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{result.analysis}</p>
                
                {result.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommendations:</h4>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DNSChecker;
