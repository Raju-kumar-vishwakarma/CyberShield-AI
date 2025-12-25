import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Mail, 
  Scan, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Check, 
  X, 
  Loader2,
  Clock,
  History,
  Zap,
  Link2,
  Globe,
  ExternalLink,
  ListPlus,
  Shield,
  Lock,
  AlertCircle,
  FileUp,
  FileWarning,
  File,
  Trash2,
  Paperclip,
  Bug,
  Hash
} from "lucide-react";
import { usePhishingDetection } from "@/hooks/usePhishingDetection";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DomainReputation {
  domain: string;
  reputation_score: number;
  risk_level: string;
  ssl_status: string;
  domain_age: string;
  registrar: string;
  risk_factors: Array<{ factor: string; description: string; severity: string }>;
  is_typosquatting: boolean;
  similar_to: string | null;
  category: string;
  recommendations: string[];
}

interface FileAnalysisResult {
  fileName: string;
  fileType: string;
  fileSize: number;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  threats: Array<{ type: string; description: string; severity: string }>;
  indicators: string[];
  recommendations: string[];
  aiAnalysis: string;
}

interface VirusTotalResult {
  fileHash: string;
  hashType: string;
  found: boolean;
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  totalEngines: number;
  threatLabels: string[];
  detectionDetails: Array<{ engine: string; category: string; result: string | null }>;
  scanDate: string | null;
  fileName: string | null;
  fileType: string | null;
}

interface ExtractedAttachment {
  filename: string;
  contentType: string;
  content: string;
  size: number;
}

const PhishingDetection = () => {
  const [emailContent, setEmailContent] = useState("");
  const [urlToScan, setUrlToScan] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [showBulkScanner, setShowBulkScanner] = useState(false);
  const { recentScans, isAnalyzing, isLoading, analyzeContent } = usePhishingDetection();
  const [scanResult, setScanResult] = useState<{
    status: "safe" | "suspicious" | "phishing";
    confidence: number;
    threat_indicators: Array<{ type: string; description: string; severity: string }>;
    detected_urls: string[];
    analysis: string;
  } | null>(null);
  const [domainResult, setDomainResult] = useState<DomainReputation | null>(null);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [bulkResults, setBulkResults] = useState<Array<{ url: string; status: string; score: number }>>([]);
  const [isBulkScanning, setIsBulkScanning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [fileAnalysisResult, setFileAnalysisResult] = useState<FileAnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [virusTotalResult, setVirusTotalResult] = useState<VirusTotalResult | null>(null);
  const [isCheckingVirusTotal, setIsCheckingVirusTotal] = useState(false);
  const [extractedAttachments, setExtractedAttachments] = useState<ExtractedAttachment[]>([]);
  const [isExtractingAttachments, setIsExtractingAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleScan = async () => {
    if (!emailContent.trim()) return;
    setDomainResult(null);
    const result = await analyzeContent(emailContent);
    if (result) {
      setScanResult(result);
    }
  };

  const handleUrlScan = async () => {
    if (!urlToScan.trim()) return;
    const content = `Please analyze this URL for phishing: ${urlToScan}`;
    const result = await analyzeContent(content);
    if (result) {
      setScanResult(result);
    }
    setUrlToScan("");
  };

  const handleDomainCheck = async () => {
    if (!urlToScan.trim()) return;
    setIsCheckingDomain(true);
    setScanResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-domain', {
        body: { url: urlToScan }
      });

      if (error) throw error;
      setDomainResult(data);
      
      toast({
        title: "Domain Analysis Complete",
        description: `Risk Level: ${data.risk_level.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCheckingDomain(false);
    }
  };

  const handleBulkScan = async () => {
    const urls = bulkUrls.split('\n').filter(url => url.trim());
    if (urls.length === 0) return;

    setIsBulkScanning(true);
    setBulkResults([]);

    const results: Array<{ url: string; status: string; score: number }> = [];

    for (const url of urls.slice(0, 10)) { // Limit to 10 URLs
      try {
        const { data } = await supabase.functions.invoke('check-domain', {
          body: { url: url.trim() }
        });
        
        results.push({
          url: url.trim(),
          status: data?.risk_level || 'unknown',
          score: data?.reputation_score || 0
        });
        setBulkResults([...results]);
      } catch {
        results.push({
          url: url.trim(),
          status: 'error',
          score: 0
        });
        setBulkResults([...results]);
      }
    }

    setIsBulkScanning(false);
    toast({
      title: "Bulk Scan Complete",
      description: `Scanned ${results.length} URLs`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe":
      case "legitimate":
      case "low":
        return "success";
      case "suspicious":
      case "medium":
        return "warning";
      case "phishing":
      case "high":
      case "critical":
        return "danger";
      default:
        return "default";
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-green-500';
      case 'low': return 'bg-green-400';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setFileAnalysisResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setFileAnalysisResult(null);
    }
  };

  const handleFileAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzingFile(true);
    setFileAnalysisResult(null);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = (reader.result as string).split(',')[1] || reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('analyze-file', {
          body: {
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            fileContent: base64Content,
          }
        });

        if (error) throw error;

        if (data.success) {
          setFileAnalysisResult(data.data);
          toast({
            title: "File Analysis Complete",
            description: `Risk Level: ${data.data.riskLevel.toUpperCase()}`,
            variant: data.data.riskLevel === 'high' || data.data.riskLevel === 'critical' ? 'destructive' : 'default',
          });
        } else {
          throw new Error(data.error || 'Analysis failed');
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
      setIsAnalyzingFile(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileAnalysisResult(null);
    setVirusTotalResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Extract attachments from pasted email content
  const extractAttachments = async () => {
    if (!emailContent.trim()) return;
    
    setIsExtractingAttachments(true);
    setExtractedAttachments([]);

    try {
      const attachments: ExtractedAttachment[] = [];
      
      // Parse MIME-encoded attachments
      // Look for Content-Disposition: attachment patterns
      const mimePattern = /Content-Disposition:\s*attachment[^]*?filename=["']?([^"'\r\n]+)["']?[^]*?Content-Type:\s*([^\r\n;]+)[^]*?(?:Content-Transfer-Encoding:\s*base64[^]*?)?\r?\n\r?\n([A-Za-z0-9+/=\r\n]+)/gi;
      
      let match;
      while ((match = mimePattern.exec(emailContent)) !== null) {
        const [, filename, contentType, content] = match;
        const cleanContent = content.replace(/[\r\n\s]/g, '');
        attachments.push({
          filename: filename.trim(),
          contentType: contentType.trim(),
          content: cleanContent,
          size: Math.round((cleanContent.length * 3) / 4), // Approximate decoded size
        });
      }

      // Also look for UUEncoded attachments
      const uuPattern = /begin\s+\d+\s+([^\r\n]+)\r?\n([^`]+)\r?\nend/gi;
      while ((match = uuPattern.exec(emailContent)) !== null) {
        const [, filename, content] = match;
        attachments.push({
          filename: filename.trim(),
          contentType: 'application/octet-stream',
          content: content.replace(/[\r\n]/g, ''),
          size: content.length,
        });
      }

      // Look for base64 encoded content blocks
      const base64BlockPattern = /--[^\r\n]+\r?\nContent-Type:\s*([^\r\n;]+)[^]*?name=["']?([^"'\r\n;]+)["']?[^]*?\r?\n\r?\n([A-Za-z0-9+/=\r\n]{100,})/gi;
      while ((match = base64BlockPattern.exec(emailContent)) !== null) {
        const [, contentType, filename, content] = match;
        const cleanContent = content.replace(/[\r\n\s]/g, '');
        // Avoid duplicates
        if (!attachments.some(a => a.filename === filename.trim())) {
          attachments.push({
            filename: filename.trim(),
            contentType: contentType.trim(),
            content: cleanContent,
            size: Math.round((cleanContent.length * 3) / 4),
          });
        }
      }

      setExtractedAttachments(attachments);
      
      if (attachments.length > 0) {
        toast({
          title: "Attachments Extracted",
          description: `Found ${attachments.length} attachment(s) in email content`,
        });
      } else {
        toast({
          title: "No Attachments Found",
          description: "No MIME or UUEncoded attachments detected in the content",
          variant: "default",
        });
      }
    } catch (error: any) {
      toast({
        title: "Extraction Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsExtractingAttachments(false);
    }
  };

  // VirusTotal hash lookup
  const checkVirusTotal = async () => {
    if (!selectedFile) return;

    setIsCheckingVirusTotal(true);
    setVirusTotalResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = (reader.result as string).split(',')[1] || reader.result as string;

        const { data, error } = await supabase.functions.invoke('virustotal-lookup', {
          body: {
            fileContent: base64Content,
            fileName: selectedFile.name,
          }
        });

        if (error) throw error;

        if (data.success) {
          setVirusTotalResult(data.data);
          
          const vtData = data.data as VirusTotalResult;
          if (!vtData.found) {
            toast({
              title: "File Not Found in VirusTotal",
              description: "This file hash is not in the VirusTotal database",
            });
          } else if (vtData.malicious > 0) {
            toast({
              title: "⚠️ Malware Detected!",
              description: `${vtData.malicious} security vendors flagged this file as malicious`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "File Appears Clean",
              description: `Scanned by ${vtData.totalEngines} engines, no threats detected`,
            });
          }
        } else {
          throw new Error(data.error || 'VirusTotal lookup failed');
        }
        setIsCheckingVirusTotal(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      toast({
        title: "VirusTotal Lookup Failed",
        description: error.message,
        variant: "destructive"
      });
      setIsCheckingVirusTotal(false);
    }
  };

  // Scan extracted attachment with VirusTotal
  const scanAttachmentWithVirusTotal = async (attachment: ExtractedAttachment) => {
    setIsCheckingVirusTotal(true);
    setVirusTotalResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('virustotal-lookup', {
        body: {
          fileContent: attachment.content,
          fileName: attachment.filename,
        }
      });

      if (error) throw error;

      if (data.success) {
        setVirusTotalResult(data.data);
        
        const vtData = data.data as VirusTotalResult;
        if (!vtData.found) {
          toast({
            title: "Attachment Not in VirusTotal",
            description: `${attachment.filename} hash not found in database`,
          });
        } else if (vtData.malicious > 0) {
          toast({
            title: "⚠️ Malicious Attachment!",
            description: `${vtData.malicious} vendors flagged ${attachment.filename}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Attachment Clean",
            description: `${attachment.filename} passed ${vtData.totalEngines} scans`,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCheckingVirusTotal(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl lg:text-3xl font-mono font-bold text-foreground mb-2">
            AI Phishing & URL Detection
          </h1>
          <p className="text-muted-foreground">
            AI-powered analysis with domain reputation, bulk scanning, and phishing detection
          </p>
        </div>

        {/* URL Scanner with Domain Check */}
        <Card variant="cyber" className="animate-fade-in border-primary/50" style={{ animationDelay: "0.05s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Quick URL Scanner
              <Zap className="h-4 w-4 text-primary animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Input
                value={urlToScan}
                onChange={(e) => setUrlToScan(e.target.value)}
                placeholder="Enter URL to scan (e.g., https://suspicious-site.com)"
                className="flex-1 min-w-[250px] bg-secondary/50"
              />
              <Button
                onClick={handleUrlScan}
                disabled={!urlToScan.trim() || isAnalyzing}
                variant="default"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Scan className="h-4 w-4 mr-2" />
                    Phishing Scan
                  </>
                )}
              </Button>
              <Button
                onClick={handleDomainCheck}
                disabled={!urlToScan.trim() || isCheckingDomain}
                variant="outline"
              >
                {isCheckingDomain ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Domain Reputation
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowBulkScanner(!showBulkScanner)}
                variant="ghost"
              >
                <ListPlus className="h-4 w-4 mr-2" />
                Bulk Scan
              </Button>
            </div>

            {/* Bulk Scanner */}
            {showBulkScanner && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Enter up to 10 URLs, one per line</span>
                </div>
                <textarea
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  placeholder="https://example1.com&#10;https://example2.com&#10;https://suspicious-site.net"
                  className="w-full h-32 p-4 rounded-lg bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground/60 font-mono text-sm resize-none focus:outline-none focus:border-primary transition-all"
                />
                <Button
                  onClick={handleBulkScan}
                  disabled={!bulkUrls.trim() || isBulkScanning}
                  className="w-full"
                >
                  {isBulkScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Scanning {bulkResults.length} / {bulkUrls.split('\n').filter(u => u.trim()).length}...
                    </>
                  ) : (
                    <>
                      <Scan className="h-4 w-4 mr-2" />
                      Scan All URLs
                    </>
                  )}
                </Button>

                {/* Bulk Results */}
                {bulkResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-mono text-sm text-muted-foreground">Scan Results</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {bulkResults.map((result, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/50"
                        >
                          <span className="font-mono text-xs text-foreground truncate flex-1 mr-2">
                            {result.url}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs ${getRiskColor(result.score)}`}>
                              {result.score}%
                            </span>
                            <Badge variant={getStatusColor(result.status)} className="text-xs">
                              {result.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Checker */}
        <Card variant="cyber" className="animate-fade-in border-primary/50" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-primary" />
              File Security Scanner
              <Zap className="h-4 w-4 text-primary animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                ${isDragging 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border/50 hover:border-primary/50 hover:bg-secondary/30'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.html,.js,.exe,.bat,.ps1,.vbs"
              />
              <FileUp className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-sm text-muted-foreground mb-1">
                {isDragging ? 'Drop file here' : 'Drag & drop a file or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground/60">
                Supports: PDF, DOC, XLS, TXT, HTML, JS, EXE, BAT, PS1, VBS (Max 10MB)
              </p>
            </div>

            {/* Selected File */}
            {selectedFile && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-mono text-sm text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'unknown type'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={handleFileAnalyze}
                    disabled={isAnalyzingFile}
                    size="sm"
                  >
                    {isAnalyzingFile ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Scan className="h-4 w-4 mr-2" />
                        Analyze
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={checkVirusTotal}
                    disabled={isCheckingVirusTotal}
                    size="sm"
                    variant="outline"
                  >
                    {isCheckingVirusTotal ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Bug className="h-4 w-4 mr-2" />
                        VirusTotal
                      </>
                    )}
                  </Button>
                  <Button onClick={clearFile} variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Analysis Result */}
            {fileAnalysisResult && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                {/* Risk Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1 font-mono">Risk Score</p>
                    <p className={`text-3xl font-mono font-bold ${
                      fileAnalysisResult.riskScore < 30 ? 'text-success' :
                      fileAnalysisResult.riskScore < 60 ? 'text-warning' : 'text-destructive'
                    }`}>
                      {fileAnalysisResult.riskScore}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1 font-mono">Risk Level</p>
                    <Badge className={`${getRiskLevelColor(fileAnalysisResult.riskLevel)} text-white`}>
                      {fileAnalysisResult.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1 font-mono">Threats Found</p>
                    <p className={`text-2xl font-mono font-bold ${
                      fileAnalysisResult.threats.length === 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {fileAnalysisResult.threats.length}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1 font-mono">File Size</p>
                    <p className="text-sm font-mono text-foreground">
                      {formatFileSize(fileAnalysisResult.fileSize)}
                    </p>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="font-mono text-sm text-primary">AI Analysis</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{fileAnalysisResult.aiAnalysis}</p>
                </div>

                {/* Threats */}
                {fileAnalysisResult.threats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-mono text-sm text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Detected Threats
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {fileAnalysisResult.threats.map((threat, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-destructive/10 border border-destructive/30"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-sm text-destructive">
                              {threat.type.replace(/_/g, ' ')}
                            </span>
                            <Badge variant={getStatusColor(threat.severity)} className="text-xs">
                              {threat.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{threat.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Indicators */}
                {fileAnalysisResult.indicators.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-mono text-sm text-warning flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Indicators Found
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {fileAnalysisResult.indicators.map((indicator, index) => (
                        <Badge key={index} variant="warning" className="text-xs">
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {fileAnalysisResult.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-mono text-sm text-primary flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {fileAnalysisResult.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* VirusTotal Results */}
        {virusTotalResult && (
          <Card variant={virusTotalResult.malicious > 0 ? "danger" : "cyber"} className="animate-scale-in border-primary/50" style={{ animationDelay: "0.15s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-primary" />
                VirusTotal Scan Results
                {virusTotalResult.malicious > 0 && (
                  <Badge variant="danger" className="ml-2">MALWARE DETECTED</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!virusTotalResult.found ? (
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                  <Hash className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">File hash not found in VirusTotal database</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">This could be a new or unknown file</p>
                </div>
              ) : (
                <>
                  {/* Detection Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1 font-mono">Malicious</p>
                      <p className={`text-3xl font-mono font-bold ${virusTotalResult.malicious > 0 ? 'text-destructive' : 'text-success'}`}>
                        {virusTotalResult.malicious}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1 font-mono">Suspicious</p>
                      <p className={`text-2xl font-mono font-bold ${virusTotalResult.suspicious > 0 ? 'text-warning' : 'text-success'}`}>
                        {virusTotalResult.suspicious}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1 font-mono">Harmless</p>
                      <p className="text-2xl font-mono font-bold text-success">
                        {virusTotalResult.harmless}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1 font-mono">Total Engines</p>
                      <p className="text-2xl font-mono font-bold text-foreground">
                        {virusTotalResult.totalEngines}
                      </p>
                    </div>
                  </div>

                  {/* File Hash */}
                  <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                    <p className="text-xs text-muted-foreground font-mono">SHA-256 Hash</p>
                    <p className="text-xs text-foreground font-mono break-all">{virusTotalResult.fileHash}</p>
                  </div>

                  {/* Threat Labels */}
                  {virusTotalResult.threatLabels.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-sm text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Threat Labels
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {virusTotalResult.threatLabels.map((label, index) => (
                          <Badge key={index} variant="danger" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detection Details */}
                  {virusTotalResult.detectionDetails.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-sm text-destructive flex items-center gap-2">
                        <Bug className="h-4 w-4" />
                        Detection Details ({virusTotalResult.detectionDetails.length} engines)
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {virusTotalResult.detectionDetails.map((detail, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 rounded-lg bg-destructive/10 border border-destructive/30"
                          >
                            <span className="font-mono text-xs text-foreground">{detail.engine}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={detail.category === 'malicious' ? 'danger' : 'warning'} className="text-xs">
                                {detail.category}
                              </Badge>
                              {detail.result && (
                                <span className="text-xs text-muted-foreground">{detail.result}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scan Date */}
                  {virusTotalResult.scanDate && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Last scanned: {new Date(virusTotalResult.scanDate).toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {domainResult && (
          <Card variant="cyber" className="animate-scale-in border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Domain Reputation: {domainResult.domain}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score & Risk Level */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground mb-1 font-mono">Reputation Score</p>
                  <p className={`text-3xl font-mono font-bold ${getRiskColor(domainResult.reputation_score)}`}>
                    {domainResult.reputation_score}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground mb-1 font-mono">Risk Level</p>
                  <Badge variant={getStatusColor(domainResult.risk_level)} className="text-sm">
                    {domainResult.risk_level.toUpperCase()}
                  </Badge>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground mb-1 font-mono">SSL Status</p>
                  <div className="flex items-center justify-center gap-1">
                    <Lock className={`h-4 w-4 ${domainResult.ssl_status === 'valid' ? 'text-success' : 'text-destructive'}`} />
                    <span className="text-sm font-mono">{domainResult.ssl_status}</span>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground mb-1 font-mono">Category</p>
                  <Badge variant={domainResult.category === 'legitimate' ? 'success' : 'warning'} className="text-sm">
                    {domainResult.category}
                  </Badge>
                </div>
              </div>

              {/* Domain Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                  <p className="text-xs text-muted-foreground font-mono">Domain Age</p>
                  <p className="text-sm text-foreground">{domainResult.domain_age}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                  <p className="text-xs text-muted-foreground font-mono">Registrar</p>
                  <p className="text-sm text-foreground">{domainResult.registrar}</p>
                </div>
              </div>

              {/* Typosquatting Warning */}
              {domainResult.is_typosquatting && domainResult.similar_to && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <div className="flex items-center gap-2 text-warning mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-mono font-bold">Typosquatting Detected!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This domain appears to be imitating: <strong className="text-foreground">{domainResult.similar_to}</strong>
                  </p>
                </div>
              )}

              {/* Risk Factors */}
              {domainResult.risk_factors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-mono text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Risk Factors
                  </h4>
                  <div className="space-y-2">
                    {domainResult.risk_factors.map((factor, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-destructive/10 border border-destructive/30"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm text-destructive">{factor.factor}</span>
                          <Badge variant={getStatusColor(factor.severity)} className="text-xs">
                            {factor.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {domainResult.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-mono text-sm text-primary flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {domainResult.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card variant="cyber" className="animate-fade-in border-primary/50" style={{ animationDelay: "0.1s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email / Message Content
                <Zap className="h-4 w-4 text-primary animate-pulse" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Paste the email or message content here (including raw email source with MIME attachments) to analyze for phishing indicators..."
                className="w-full h-64 p-4 rounded-lg bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground/60 font-mono text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleScan}
                  disabled={!emailContent.trim() || isAnalyzing}
                  className="flex-1"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>AI Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="h-5 w-5" />
                      <span>Analyze with AI</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={extractAttachments}
                  disabled={!emailContent.trim() || isExtractingAttachments}
                  variant="outline"
                  size="lg"
                >
                  {isExtractingAttachments ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <Paperclip className="h-5 w-5" />
                      <span>Extract Attachments</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Extracted Attachments */}
              {extractedAttachments.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border/50">
                  <h4 className="font-mono text-sm text-primary flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Extracted Attachments ({extractedAttachments.length})
                  </h4>
                  <div className="space-y-2">
                    {extractedAttachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <File className="h-6 w-6 text-primary" />
                          <div>
                            <p className="font-mono text-sm text-foreground">{attachment.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.size)} • {attachment.contentType}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => scanAttachmentWithVirusTotal(attachment)}
                          disabled={isCheckingVirusTotal}
                          size="sm"
                          variant="outline"
                        >
                          {isCheckingVirusTotal ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Bug className="h-4 w-4 mr-1" />
                              Scan
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Scan Result Card */}
            {scanResult && (
              <Card
                variant={scanResult.status === "safe" ? "success" : scanResult.status === "suspicious" ? "cyber" : "danger"}
                className="animate-scale-in"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {scanResult.status === "safe" ? (
                      <ShieldCheck className="h-5 w-5 text-success" />
                    ) : scanResult.status === "suspicious" ? (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-destructive" />
                    )}
                    AI Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Status Badge */}
                  <div className="text-center">
                    <Badge variant={getStatusColor(scanResult.status)} className="text-lg px-6 py-2">
                      {scanResult.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Confidence Meter */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-mono">
                      <span className="text-muted-foreground">AI Confidence</span>
                      <span className={`${
                        scanResult.status === "safe" ? "text-success" :
                        scanResult.status === "suspicious" ? "text-warning" : "text-destructive"
                      }`}>
                        {scanResult.confidence}%
                      </span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          scanResult.status === "safe" ? "bg-success" :
                          scanResult.status === "suspicious" ? "bg-warning" : "bg-destructive"
                        }`}
                        style={{ width: `${scanResult.confidence}%` }}
                      />
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <div className="space-y-2">
                    <h4 className="font-mono text-sm text-primary">AI Analysis</h4>
                    <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg border border-border/50">
                      {scanResult.analysis}
                    </p>
                  </div>

                  {/* Detected URLs */}
                  {scanResult.detected_urls.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-sm text-warning flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Detected URLs ({scanResult.detected_urls.length})
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {scanResult.detected_urls.map((url, index) => (
                          <div
                            key={index}
                            className="p-2 rounded-lg bg-warning/10 border border-warning/30 flex items-center justify-between"
                          >
                            <span className="font-mono text-xs text-foreground truncate flex-1 mr-2">
                              {url}
                            </span>
                            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Threat Indicators */}
            {scanResult && scanResult.threat_indicators.length > 0 && (
              <Card variant="danger" className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Threat Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scanResult.threat_indicators.map((indicator, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-destructive/10 border border-destructive/30"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm text-destructive capitalize">
                            {indicator.type.replace(/_/g, ' ')}
                          </span>
                          <Badge variant={
                            indicator.severity === 'high' ? 'danger' :
                            indicator.severity === 'medium' ? 'warning' : 'info'
                          } className="text-xs">
                            {indicator.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{indicator.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No scan result - show tips */}
            {!scanResult && !domainResult && (
              <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Detection Capabilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Domain reputation & age verification</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>SSL certificate validation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Typosquatting detection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Bulk URL scanning (up to 10 at once)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>AI-powered phishing content analysis</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Scans */}
        <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Scan History
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scans yet. Analyze some content to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase">
                        Content Preview
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase">
                        Confidence
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase">
                        URLs
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase">
                        Scanned
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScans.slice(0, 10).map((scan) => (
                      <tr key={scan.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 max-w-[200px]">
                          <span className="font-mono text-sm text-foreground truncate block">
                            {scan.content_preview?.slice(0, 50)}...
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={getStatusColor(scan.status)}>
                            {scan.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-foreground">
                            {scan.confidence}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-muted-foreground flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            {scan.detected_urls?.length || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(scan.scanned_at), { addSuffix: true })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PhishingDetection;
