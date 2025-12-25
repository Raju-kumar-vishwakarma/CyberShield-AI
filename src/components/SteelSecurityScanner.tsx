import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSteelScan } from '@/hooks/useSteelScan';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Globe,
  Lock,
  Unlock,
  Eye,
  Code,
  Link2,
  FileSearch,
  Brain,
  Loader2,
  ExternalLink,
  Camera,
  List,
  Image,
  Clock
} from 'lucide-react';

const riskColors = {
  safe: 'bg-green-500',
  low: 'bg-green-400',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const riskTextColors = {
  safe: 'text-green-500',
  low: 'text-green-400',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
};

const severityBadgeVariants = {
  low: 'outline' as const,
  medium: 'secondary' as const,
  high: 'destructive' as const,
  critical: 'destructive' as const,
};

// Average completion times in seconds
const SCAN_ESTIMATE_SECONDS = 4;
const SCREENSHOT_ESTIMATE_SECONDS = 8;

export const SteelSecurityScanner = () => {
  const [url, setUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [includeScreenshots, setIncludeScreenshots] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'single' | 'batch' | 'screenshot'>('single');
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
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
    performFullScan,
    performBatchScan,
    takeScreenshot,
    analyzeScreenshotWithAI,
    clearBatchResults 
  } = useSteelScan();

  const isScanningOrCapturing = isScanning || isCapturingScreenshot;

  // Timer effect for elapsed time
  useEffect(() => {
    if (isScanningOrCapturing) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 0.1);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isScanningOrCapturing]);

  // Reset timer when switching between scan and screenshot phase
  useEffect(() => {
    if (isCapturingScreenshot && !isScanning) {
      setElapsedTime(0);
    }
  }, [isCapturingScreenshot, isScanning]);

  // Calculate time estimates
  const getCurrentEstimate = () => {
    if (isScanning) return SCAN_ESTIMATE_SECONDS;
    if (isCapturingScreenshot) return SCREENSHOT_ESTIMATE_SECONDS;
    return 0;
  };

  const getTimeRemaining = () => {
    const estimate = getCurrentEstimate();
    const remaining = Math.max(0, estimate - elapsedTime);
    return remaining;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 1) return '<1s';
    return `~${Math.ceil(seconds)}s`;
  };

  const getProgressPercentage = () => {
    const estimate = getCurrentEstimate();
    if (estimate === 0) return 0;
    return Math.min(95, (elapsedTime / estimate) * 100);
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    await performFullScan(url);
  };

  const handleBatchScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = batchUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);
    
    if (urls.length > 0) {
      await performBatchScan(urls, includeScreenshots);
    }
  };

  const handleTakeScreenshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const screenshot = await takeScreenshot(screenshotUrl);
    if (screenshot) {
      setCapturedScreenshot(screenshot);
    }
  };

  const handleAnalyzeScreenshot = async () => {
    if (currentScan?.screenshot) {
      await analyzeScreenshotWithAI(currentScan.screenshot, currentScan.url);
    }
  };

  const handleAnalyzeCapturedScreenshot = async () => {
    if (capturedScreenshot && screenshotUrl) {
      await analyzeScreenshotWithAI(capturedScreenshot, screenshotUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection Tabs */}
      <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as 'single' | 'batch' | 'screenshot')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Single Scan
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Batch Scan
          </TabsTrigger>
          <TabsTrigger value="screenshot" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Screenshot
          </TabsTrigger>
        </TabsList>

        {/* Single Scan Mode */}
        <TabsContent value="single">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Deep Security Scan
              </CardTitle>
              <CardDescription>
                Comprehensive security analysis with threat detection and AI-powered phishing analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScan} className="flex gap-3">
                <Input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter URL to scan (e.g., https://example.com)"
                  className="flex-1"
                  disabled={isScanningOrCapturing}
                />
                <Button type="submit" disabled={isScanningOrCapturing || !url.trim()}>
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : isCapturingScreenshot ? (
                    <>
                      <Camera className="h-4 w-4 mr-2 animate-pulse" />
                      Capturing...
                    </>
                  ) : (
                    <>
                      <FileSearch className="h-4 w-4 mr-2" />
                      Deep Scan
                    </>
                  )}
                </Button>
              </form>
              
              {/* Scan Progress Indicator */}
              {isScanningOrCapturing && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isScanning ? (
                        <>
                          <div className="relative">
                            <Shield className="h-6 w-6 text-primary" />
                            <Loader2 className="h-3 w-3 animate-spin absolute -bottom-1 -right-1 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Step 1/2: Analyzing Security...</p>
                            <p className="text-xs text-muted-foreground">Checking SSL, headers, forms, and scripts</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="relative">
                            <Camera className="h-6 w-6 text-primary" />
                            <Loader2 className="h-3 w-3 animate-spin absolute -bottom-1 -right-1 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Step 2/2: Capturing Screenshot...</p>
                            <p className="text-xs text-muted-foreground">Taking real browser screenshot with ScreenshotOne</p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Time Estimate */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-mono">
                        {formatTime(getTimeRemaining())} remaining
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-1">
                    <Progress value={getProgressPercentage()} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{elapsedTime.toFixed(1)}s elapsed</span>
                      <span>Est. {isScanning ? SCAN_ESTIMATE_SECONDS : SCREENSHOT_ESTIMATE_SECONDS}s total</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Scan Mode */}
        <TabsContent value="batch">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5 text-primary" />
                Batch URL Scanner
              </CardTitle>
              <CardDescription>
                Scan multiple suspicious URLs at once (max 10 URLs per batch)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleBatchScan} className="space-y-4">
                <Textarea
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  placeholder="Enter URLs (one per line):&#10;https://suspicious-site1.com&#10;https://phishing-attempt.xyz&#10;https://check-this-domain.net"
                  className="min-h-[150px] font-mono text-sm"
                  disabled={isBatchScanning}
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-screenshots"
                      checked={includeScreenshots}
                      onCheckedChange={setIncludeScreenshots}
                      disabled={isBatchScanning}
                    />
                    <Label htmlFor="include-screenshots" className="text-sm">
                      Include browser screenshots (slower)
                    </Label>
                  </div>
                  
                  <Button type="submit" disabled={isBatchScanning || !batchUrls.trim()}>
                    {isBatchScanning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Scan All URLs
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Batch Results */}
          {batchResults && batchSummary && (
            <Card className="mt-4 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5" />
                    Batch Scan Results
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={clearBatchResults}>
                    Clear Results
                  </Button>
                </div>
                <CardDescription>
                  Scanned {batchSummary.completed}/{batchSummary.total} URLs • 
                  {batchSummary.highRisk > 0 && (
                    <span className="text-destructive ml-1">
                      {batchSummary.highRisk} high-risk detected
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {batchResults.map((result, idx) => (
                      <div 
                        key={idx}
                        className={`p-4 rounded-lg border ${
                          result.status === 'failed' ? 'border-destructive/50 bg-destructive/5' :
                          result.riskLevel === 'critical' || result.riskLevel === 'high' 
                            ? 'border-destructive/50 bg-destructive/5' 
                            : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {result.status === 'completed' ? (
                                result.sslValid ? (
                                  <Lock className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Unlock className="h-4 w-4 text-red-500" />
                                )
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                              <span className="font-medium text-sm truncate">
                                {result.pageTitle !== 'Unknown' ? result.pageTitle : result.url}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{result.url}</div>
                            {result.finalUrl !== result.url && (
                              <div className="text-xs text-yellow-500 mt-1">
                                → Redirects to: {result.finalUrl}
                              </div>
                            )}
                            {result.error && (
                              <div className="text-xs text-destructive mt-1">{result.error}</div>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`${riskColors[result.riskLevel as keyof typeof riskColors] || 'bg-gray-500'} text-white`}>
                              {result.riskLevel.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Score: {result.riskScore}/100
                            </span>
                            {result.threatCount > 0 && (
                              <span className="text-xs text-destructive">
                                {result.threatCount} threats
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {result.screenshot && (
                          <div className="mt-3">
                            <img 
                              src={`data:image/jpeg;base64,${result.screenshot}`}
                              alt={`Screenshot of ${result.url}`}
                              className="rounded border max-h-32 w-auto"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Screenshot Mode */}
        <TabsContent value="screenshot">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Browser Screenshot
              </CardTitle>
              <CardDescription>
                Capture real browser screenshots using ScreenshotOne API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTakeScreenshot} className="flex gap-3">
                <Input
                  type="text"
                  value={screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                  placeholder="Enter URL to screenshot"
                  className="flex-1"
                />
                <Button type="submit" disabled={!screenshotUrl.trim()}>
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              </form>
            </CardContent>
          </Card>

          {capturedScreenshot && (
            <Card className="mt-4 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Captured Screenshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg overflow-hidden border">
                  <img 
                    src={`data:image/png;base64,${capturedScreenshot}`}
                    alt="Captured screenshot"
                    className="w-full h-auto"
                  />
                </div>
                
                <Button 
                  onClick={handleAnalyzeCapturedScreenshot}
                  disabled={isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Analyze for Phishing with AI
                    </>
                  )}
                </Button>

                {visualAnalysis && (
                  <Card className={visualAnalysis.isPhishing ? 'border-destructive' : 'border-green-500'}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {visualAnalysis.isPhishing ? (
                          <XCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        AI Visual Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Confidence</span>
                        <Badge variant={visualAnalysis.isPhishing ? 'destructive' : 'default'}>
                          {visualAnalysis.confidence}%
                        </Badge>
                      </div>
                      
                      {visualAnalysis.brandTargeted && (
                        <div className="flex items-center justify-between">
                          <span>Brand Targeted</span>
                          <Badge variant="outline">{visualAnalysis.brandTargeted}</Badge>
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground">
                        {visualAnalysis.overallAssessment}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Current Scan Result (for single scan) */}
      {scanMode === 'single' && currentScan && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {currentScan.pageTitle || 'Scan Result'}
              </CardTitle>
              <Badge className={`${riskColors[currentScan.riskLevel]} text-white`}>
                {currentScan.riskLevel.toUpperCase()} RISK
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-2">
              <a 
                href={currentScan.finalUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                {currentScan.finalUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="screenshot">Screenshot</TabsTrigger>
                <TabsTrigger value="threats">Threats</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Risk Score</span>
                    <span className={`text-lg font-bold ${riskTextColors[currentScan.riskLevel]}`}>
                      {currentScan.riskScore}/100
                    </span>
                  </div>
                  <Progress value={currentScan.riskScore} className="h-2" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    {currentScan.sslValid ? (
                      <Lock className="h-5 w-5 text-green-500" />
                    ) : (
                      <Unlock className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-sm">{currentScan.sslValid ? 'HTTPS' : 'No SSL'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    {currentScan.hasLoginForm ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <span className="text-sm">{currentScan.hasLoginForm ? 'Login Form' : 'No Forms'}</span>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Code className="h-5 w-5 text-primary" />
                    <span className="text-sm">{currentScan.suspiciousScripts.length} Suspicious</span>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Link2 className="h-5 w-5 text-primary" />
                    <span className="text-sm">{currentScan.externalLinks.length} External</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <h4 className="font-medium text-sm">DOM Analysis</h4>
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    <div>
                      <div className="text-lg font-bold">{currentScan.domAnalysis.forms}</div>
                      <div className="text-muted-foreground">Forms</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{currentScan.domAnalysis.inputs}</div>
                      <div className="text-muted-foreground">Inputs</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{currentScan.domAnalysis.scripts}</div>
                      <div className="text-muted-foreground">Scripts</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{currentScan.domAnalysis.iframes}</div>
                      <div className="text-muted-foreground">Iframes</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{currentScan.domAnalysis.externalScripts}</div>
                      <div className="text-muted-foreground">External JS</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="screenshot" className="space-y-4">
                {currentScan.screenshot ? (
                  <>
                    <div className="relative rounded-lg overflow-hidden border">
                      <img 
                        src={`data:image/png;base64,${currentScan.screenshot}`}
                        alt="Page screenshot"
                        className="w-full h-auto"
                      />
                    </div>

                    <Button 
                      onClick={handleAnalyzeScreenshot}
                      disabled={isAnalyzing}
                      className="w-full"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing with AI...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Analyze with AI for Phishing
                        </>
                      )}
                    </Button>

                    {visualAnalysis && (
                      <Card className={visualAnalysis.isPhishing ? 'border-destructive' : 'border-green-500'}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {visualAnalysis.isPhishing ? (
                              <XCircle className="h-5 w-5 text-destructive" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            AI Visual Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span>Confidence</span>
                            <Badge variant={visualAnalysis.isPhishing ? 'destructive' : 'default'}>
                              {visualAnalysis.confidence}%
                            </Badge>
                          </div>
                          
                          {visualAnalysis.brandTargeted && (
                            <div className="flex items-center justify-between">
                              <span>Brand Targeted</span>
                              <Badge variant="outline">{visualAnalysis.brandTargeted}</Badge>
                            </div>
                          )}

                          <p className="text-sm text-muted-foreground">
                            {visualAnalysis.overallAssessment}
                          </p>

                          {visualAnalysis.phishingIndicators.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium">Phishing Indicators:</h5>
                              {visualAnalysis.phishingIndicators.map((indicator, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                  <Badge variant={severityBadgeVariants[indicator.severity]} className="text-xs">
                                    {indicator.severity}
                                  </Badge>
                                  <span>{indicator.description}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Camera className="h-12 w-12 mb-2" />
                    <p>No screenshot available</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="threats" className="space-y-4">
                {currentScan.threatIndicators.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {currentScan.threatIndicators.map((threat, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={severityBadgeVariants[threat.severity as keyof typeof severityBadgeVariants] || 'outline'}>
                              {threat.severity}
                            </Badge>
                            <span className="font-medium text-sm">{threat.type.replace(/_/g, ' ')}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{threat.description}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-green-500">
                    <CheckCircle className="h-12 w-12 mb-2" />
                    <p>No threat indicators detected</p>
                  </div>
                )}

                {currentScan.suspiciousScripts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Suspicious Script Patterns:</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentScan.suspiciousScripts.map((script, idx) => (
                        <Badge key={idx} variant="destructive" className="font-mono text-xs">
                          {script}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                {currentScan.redirectChain.length > 1 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Redirect Chain:</h4>
                    <div className="space-y-1">
                      {currentScan.redirectChain.map((redirect, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">{idx + 1}.</span>
                          <span className="font-mono text-xs truncate">{redirect}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentScan.externalLinks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">External Links ({currentScan.externalLinks.length}):</h4>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {currentScan.externalLinks.map((link, idx) => (
                          <div key={idx} className="font-mono text-xs text-muted-foreground truncate">
                            {link}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    {currentScan.hasPasswordField ? (
                      <XCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm">Password Field</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentScan.hasCreditCardField ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm">Credit Card Field</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Scans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recentScans.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {recentScans.map((scan) => (
                  <div 
                    key={scan.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{scan.page_title || scan.url}</div>
                      <div className="text-xs text-muted-foreground truncate">{scan.url}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge className={`${riskColors[scan.risk_level as keyof typeof riskColors] || 'bg-gray-500'} text-white text-xs`}>
                        {scan.risk_score}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(scan.scanned_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileSearch className="h-12 w-12 mb-2" />
              <p>No scans yet. Start by scanning a URL above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
