import { useState } from "react";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Loader2, Eye, EyeOff, Shield, ShieldAlert, Search, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

interface DarkWebResult {
  email: string;
  is_exposed: boolean;
  exposure_count: number;
  risk_level: string;
  exposed_data_types: string[];
  breach_sources: string[];
  first_seen: string | null;
  last_seen: string | null;
  recommendations: string[];
  analysis: string;
}

const DarkWebMonitor = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DarkWebResult | null>(null);

  const handleCheck = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("dark-web-monitor", {
        body: { email: email.trim() },
      });

      if (error) throw error;

      if (data.success) {
        setResult(data.data);
        if (data.data.is_exposed) {
          toast.warning("Email found in dark web databases!");
        } else {
          toast.success("No exposures found!");
        }
      } else {
        toast.error(data.error || "Failed to check dark web");
      }
    } catch (error: any) {
      console.error("Dark web check error:", error);
      toast.error(error.message || "Failed to check dark web");
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "safe":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "low":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <EyeOff className="h-6 w-6 text-primary" />
            Dark Web Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Check if your credentials have been exposed on the dark web
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Check Email Exposure
            </CardTitle>
            <CardDescription>
              Enter your email to check for dark web exposures and data breaches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                className="flex-1"
              />
              <Button onClick={handleCheck} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Check Dark Web
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Status Card */}
            <Card className={`bg-card/50 backdrop-blur border-border/50 ${result.is_exposed ? 'border-red-500/30' : 'border-green-500/30'}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {result.is_exposed ? (
                      <ShieldAlert className="h-5 w-5 text-red-400" />
                    ) : (
                      <Shield className="h-5 w-5 text-green-400" />
                    )}
                    Exposure Status
                  </span>
                  <Badge className={getRiskColor(result.risk_level)}>
                    {result.risk_level} Risk
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  {result.is_exposed ? (
                    <>
                      <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-red-400">Exposure Detected!</h3>
                      <p className="text-muted-foreground mt-2">
                        Found in {result.exposure_count} breach{result.exposure_count > 1 ? "es" : ""}
                      </p>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-green-400">No Exposures Found</h3>
                      <p className="text-muted-foreground mt-2">
                        Your email appears to be safe
                      </p>
                    </>
                  )}
                </div>

                {result.is_exposed && (
                  <div className="space-y-3 mt-4">
                    {result.first_seen && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <span className="text-sm text-muted-foreground">First Seen</span>
                        <span className="text-sm">{result.first_seen}</span>
                      </div>
                    )}
                    {result.last_seen && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <span className="text-sm text-muted-foreground">Last Seen</span>
                        <span className="text-sm">{result.last_seen}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exposed Data Card */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Exposed Data Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.exposed_data_types?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.exposed_data_types.map((type, i) => (
                      <Badge key={i} variant="destructive" className="capitalize">
                        {type}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No exposed data types detected
                  </p>
                )}

                {result.breach_sources?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Breach Sources</h4>
                    <div className="space-y-2">
                      {result.breach_sources.map((source, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded bg-secondary/30">
                          <ShieldAlert className="h-4 w-4 text-red-400" />
                          <span className="text-sm">{source}</span>
                        </div>
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
                  <Shield className="h-5 w-5" />
                  Security Analysis & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{result.analysis}</p>
                
                {result.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommended Actions:</h4>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
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

export default DarkWebMonitor;
