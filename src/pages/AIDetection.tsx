import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Image,
  Video,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ScanEye,
  Brain,
  Eye,
  Shield,
  Info,
  Zap,
  ShieldCheck,
  History,
  Trash2,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface GeminiDetails {
  aiScore: number;
  notAiScore: number;
}

interface MediaIndicator {
  type: string;
  description: string;
  weight: number;
}

interface MediaAnalysisResult {
  mediaType: "image" | "video";
  isAIGenerated: boolean;
  confidence: number;
  riskLevel: string;
  indicators: MediaIndicator[];
  analysis: string;
  recommendations: string[];
  geminiDetails?: GeminiDetails;
}

interface ScanHistoryItem {
  id: string;
  file_name: string;
  media_type: string;
  is_ai_generated: boolean;
  confidence: number;
  risk_level: string;
  ai_score: number;
  authentic_score: number;
  analysis: string | null;
  strict_mode: boolean;
  created_at: string;
}

const AIDetection = () => {
  const { user } = useAuth();
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaResult, setMediaResult] = useState<MediaAnalysisResult | null>(null);
  const [strictMode, setStrictMode] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch scan history
  const fetchScanHistory = async () => {
    if (!user) return;
    
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("ai_detection_scans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setScanHistory(data || []);
    } catch (error) {
      console.error("Failed to fetch scan history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchScanHistory();
  }, [user]);

  // Save scan to history
  const saveScanToHistory = async (fileName: string, result: MediaAnalysisResult) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("ai_detection_scans").insert({
        user_id: user.id,
        file_name: fileName,
        media_type: result.mediaType,
        is_ai_generated: result.isAIGenerated,
        confidence: result.confidence,
        risk_level: result.riskLevel,
        ai_score: result.geminiDetails?.aiScore || 0,
        authentic_score: result.geminiDetails?.notAiScore || 0,
        analysis: result.analysis,
        strict_mode: strictMode,
      });

      if (error) throw error;
      fetchScanHistory();
    } catch (error) {
      console.error("Failed to save scan to history:", error);
    }
  };

  // Delete scan from history
  const deleteScan = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ai_detection_scans")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setScanHistory((prev) => prev.filter((scan) => scan.id !== id));
      toast.success("Scan deleted");
    } catch (error) {
      console.error("Failed to delete scan:", error);
      toast.error("Failed to delete scan");
    }
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Please upload an image or video file");
      return;
    }

    setMediaType(isImage ? "image" : "video");
    setCurrentFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsAnalyzing(true);
    setMediaResult(null);

    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("analyze-media", {
        body: {
          fileContent: base64,
          mediaType: isImage ? "image" : "video",
          fileName: file.name,
          fileSize: file.size,
          strictMode,
        },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setMediaResult(data.data);
        await saveScanToHistory(file.name, data.data);

        if (data.data.isAIGenerated) {
          toast.warning("Potential AI-generated content", {
            description: `Confidence: ${data.data.confidence}% (estimate)`,
          });
        } else {
          toast.success("Likely authentic content", {
            description: `Confidence: ${data.data.confidence}% (estimate)`,
          });
        }
      } else {
        throw new Error(data?.error || "Analysis failed");
      }
    } catch (error) {
      console.error("Media analysis error:", error);
      toast.error("Failed to analyze media", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "ai_generated":
      case "high":
        return "text-red-500";
      case "likely_ai":
      case "medium":
        return "text-orange-500";
      case "uncertain":
        return "text-yellow-500";
      case "likely_authentic":
        return "text-blue-500";
      case "authentic":
      case "low":
        return "text-green-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getRiskBadgeVariant = (level?: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (level?.toLowerCase()) {
      case "ai_generated":
      case "high":
        return "destructive";
      case "likely_ai":
      case "medium":
      case "uncertain":
        return "secondary";
      case "likely_authentic":
      case "authentic":
      case "low":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatRiskLevel = (level?: string) => {
    if (!level) return "Unknown";
    return level.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Layout>
      <main className="space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <ScanEye className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-mono font-bold text-foreground">AI Content Detection</h1>
              <p className="text-muted-foreground">
                Powered by <span className="font-semibold text-primary">Google Gemini</span> (heuristic estimates)
              </p>
            </div>
          </div>

          {/* Strict Mode Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`h-4 w-4 ${strictMode ? "text-muted-foreground" : "text-primary"}`} />
              <span className={`text-sm font-medium ${strictMode ? "text-muted-foreground" : "text-foreground"}`}>
                Conservative
              </span>
            </div>
            <Switch
              id="strict-mode"
              checked={strictMode}
              onCheckedChange={setStrictMode}
            />
            <div className="flex items-center gap-2">
              <Zap className={`h-4 w-4 ${strictMode ? "text-orange-500" : "text-muted-foreground"}`} />
              <span className={`text-sm font-medium ${strictMode ? "text-orange-500" : "text-muted-foreground"}`}>
                Strict
              </span>
            </div>
          </div>
        </header>

        {/* Mode Description */}
        <div className={`p-3 rounded-lg border text-sm ${
          strictMode 
            ? "bg-orange-500/10 border-orange-500/30 text-orange-200" 
            : "bg-primary/10 border-primary/30 text-muted-foreground"
        }`}>
          {strictMode ? (
            <p><strong>Strict Mode:</strong> More aggressive detection — flags content with even minor AI indicators. May produce more false positives.</p>
          ) : (
            <p><strong>Conservative Mode:</strong> Balanced detection — only flags content with clear AI indicators. Fewer false positives.</p>
          )}
        </div>

        {/* Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Detection overview">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Brain className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">Google Gemini</p>
                <p className="text-sm text-muted-foreground">Vision classifier</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Image className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">Images</p>
                <p className="text-sm text-muted-foreground">JPEG, PNG, WebP</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Video className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">Videos</p>
                <p className="text-sm text-muted-foreground">(Coming soon)</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Main Detection Area */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="AI content detection">
          {/* Upload Section */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono">
                <Upload className="h-5 w-5 text-primary" />
                Upload Media
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="image" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="image" className="gap-2">
                    <Image className="h-4 w-4" />
                    Image
                  </TabsTrigger>
                  <TabsTrigger value="video" className="gap-2">
                    <Video className="h-4 w-4" />
                    Video
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="image" className="mt-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    role="button"
                    tabIndex={0}
                  >
                    <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">Click to upload an image</p>
                    <p className="text-xs text-muted-foreground">Supports JPEG, PNG, WebP</p>
                  </div>
                </TabsContent>
                <TabsContent value="video" className="mt-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    role="button"
                    tabIndex={0}
                  >
                    <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">Click to upload a video</p>
                    <p className="text-xs text-muted-foreground">Video analysis is currently not supported</p>
                  </div>
                </TabsContent>
              </Tabs>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="hidden"
              />

              {/* Preview */}
              {mediaPreview && (
                <div className="mt-4 rounded-lg overflow-hidden border border-border/50">
                  {mediaType === "image" ? (
                    <img src={mediaPreview} alt="Uploaded image preview" className="w-full h-48 object-cover" loading="lazy" />
                  ) : (
                    <video src={mediaPreview} controls className="w-full h-48 object-cover" />
                  )}
                </div>
              )}

              {isAnalyzing && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Analyzing with Google Gemini...</span>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-secondary/20 p-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 text-primary" />
                <p>
                  Scores are <span className="font-medium">heuristic estimates</span>, not proof. Use this tool as a signal and
                  verify important media with source checks.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono">
                <Eye className="h-5 w-5 text-primary" />
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mediaResult ? (
                <div className="space-y-4">
                  {/* Detection Status */}
                  <div
                    className={`p-4 rounded-lg border ${
                      mediaResult.isAIGenerated ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {mediaResult.isAIGenerated ? (
                        <XCircle className="h-8 w-8 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      )}
                      <div>
                        <p className="font-bold text-foreground">
                          {mediaResult.isAIGenerated ? "Potential AI-generated content" : "Likely authentic content"}
                        </p>
                        <p className="text-sm text-muted-foreground">Result is a heuristic estimate from Google Gemini.</p>
                      </div>
                    </div>
                  </div>

                  {/* Confidence Score */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Confidence (estimate)</span>
                      <span className="font-mono text-foreground">{mediaResult.confidence}%</span>
                    </div>
                    <Progress value={mediaResult.confidence} className="h-2" />
                  </div>

                  {/* Gemini Scores */}
                  {mediaResult.geminiDetails && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-muted-foreground">AI likelihood (bucket)</p>
                        <p className="text-xl font-bold text-red-500">{mediaResult.geminiDetails.aiScore}%</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-xs text-muted-foreground">Authentic likelihood (bucket)</p>
                        <p className="text-xl font-bold text-green-500">{mediaResult.geminiDetails.notAiScore}%</p>
                      </div>
                    </div>
                  )}

                  {/* Risk Level */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Risk Level</span>
                    <Badge
                      variant={getRiskBadgeVariant(mediaResult.riskLevel)}
                      className={getRiskColor(mediaResult.riskLevel)}
                    >
                      {formatRiskLevel(mediaResult.riskLevel)}
                    </Badge>
                  </div>

                  {/* Indicators */}
                  {mediaResult.indicators && mediaResult.indicators.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Detection Indicators</p>
                      <div className="space-y-1">
                        {mediaResult.indicators.map((indicator, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm p-2 rounded bg-secondary/30">
                            <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                            <span className="text-muted-foreground">{indicator.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Analysis */}
                  {mediaResult.analysis && (
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <p className="text-sm text-muted-foreground">{mediaResult.analysis}</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {mediaResult.recommendations && mediaResult.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Recommendations
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {mediaResult.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ScanEye className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Upload an image or video to analyze</p>
                  <p className="text-xs text-muted-foreground mt-2">Google Gemini will classify whether content looks AI-generated</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Scan History Section */}
        <section aria-label="Scan history">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono">
                <History className="h-5 w-5 text-primary" />
                Scan History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!user ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Login to view your scan history</p>
                </div>
              ) : isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : scanHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No scans yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Your scan history will appear here</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {scanHistory.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg ${scan.is_ai_generated ? "bg-red-500/20" : "bg-green-500/20"}`}>
                            {scan.is_ai_generated ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{scan.file_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(scan.created_at), "MMM d, yyyy HH:mm")}</span>
                              {scan.strict_mode && (
                                <Badge variant="outline" className="text-orange-500 border-orange-500/50 text-[10px] px-1 py-0">
                                  Strict
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <Badge
                              variant={getRiskBadgeVariant(scan.risk_level)}
                              className={`${getRiskColor(scan.risk_level)} text-xs`}
                            >
                              {formatRiskLevel(scan.risk_level)}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              AI: {scan.ai_score}% / Auth: {scan.authentic_score}%
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => deleteScan(scan.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Info Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="How it works">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <h2 className="font-mono font-bold text-foreground mb-2 flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                Image Detection
              </h2>
              <p className="text-sm text-muted-foreground">
                Google Gemini looks for visual artifacts (hands/text/edges/lighting consistency). Results are a helpful signal, not
                a guarantee.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <h2 className="font-mono font-bold text-foreground mb-2 flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                Deepfake Detection
              </h2>
              <p className="text-sm text-muted-foreground">
                Video deepfake detection requires temporal analysis. We can add this as a separate backend pipeline.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </Layout>
  );
};

export default AIDetection;
