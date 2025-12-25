import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge-custom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { SteelSecurityScanner } from '@/components/SteelSecurityScanner';
import { 
  Globe, 
  Loader2, 
  Link2, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Map,
  Shield,
  Scan,
  Layers,
  Clock,
  Eye
} from 'lucide-react';

interface ScanResult {
  url: string;
  title?: string;
  links?: string[];
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    statusCode?: number;
  };
}

interface CrawlPage {
  url: string;
  markdown?: string;
  title?: string;
}

interface SecurityAnalysis {
  hasHttps: boolean;
  externalLinks: number;
  internalLinks: number;
  suspiciousPatterns: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export default function WebScanner() {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [mapResult, setMapResult] = useState<string[]>([]);
  const [crawlResult, setCrawlResult] = useState<CrawlPage[]>([]);
  const [crawlStatus, setCrawlStatus] = useState<string>('');
  const [securityAnalysis, setSecurityAnalysis] = useState<SecurityAnalysis | null>(null);

  const analyzeSecuity = (result: ScanResult, baseUrl: string): SecurityAnalysis => {
    const links = result.links || [];
    const content = result.markdown || '';
    
    const hasHttps = baseUrl.startsWith('https://');
    let externalLinks = 0;
    let internalLinks = 0;
    
    try {
      const hostname = new URL(baseUrl).hostname;
      externalLinks = links.filter(l => !l.includes(hostname)).length;
      internalLinks = links.length - externalLinks;
    } catch {
      internalLinks = links.length;
    }
    
    const suspiciousPatterns: string[] = [];
    
    if (content.toLowerCase().includes('password')) {
      suspiciousPatterns.push('Contains password-related content');
    }
    if (content.toLowerCase().includes('login') && content.toLowerCase().includes('urgent')) {
      suspiciousPatterns.push('Urgent login request detected');
    }
    if (links.some(l => l.includes('bit.ly') || l.includes('tinyurl'))) {
      suspiciousPatterns.push('Contains shortened URLs');
    }
    if (!hasHttps) {
      suspiciousPatterns.push('No HTTPS encryption');
    }
    if (externalLinks > internalLinks * 2) {
      suspiciousPatterns.push('High ratio of external links');
    }

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (suspiciousPatterns.length >= 3) riskLevel = 'high';
    else if (suspiciousPatterns.length >= 1) riskLevel = 'medium';

    return {
      hasHttps,
      externalLinks,
      internalLinks,
      suspiciousPatterns,
      riskLevel,
    };
  };

  const handleScan = async () => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL to scan',
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setSecurityAnalysis(null);

    try {
      const response = await firecrawlApi.scrape(url, {
        formats: ['markdown', 'links'],
        onlyMainContent: false,
      });

      if (response.success) {
        const result = response.data || response;
        setScanResult({
          url,
          title: result.metadata?.title,
          links: result.links,
          markdown: result.markdown,
          metadata: result.metadata,
        });
        
        const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
        const analysis = analyzeSecuity({
          url,
          links: result.links,
          markdown: result.markdown,
        }, formattedUrl);
        
        setSecurityAnalysis(analysis);

        toast({
          title: 'Scan Complete',
          description: `Found ${result.links?.length || 0} links on the page`,
        });
      } else {
        toast({
          title: 'Scan Failed',
          description: response.error || 'Failed to scan website',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: 'Error',
        description: 'Failed to scan website. Please check the URL and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleMap = async () => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL to map',
        variant: 'destructive',
      });
      return;
    }

    setIsMapping(true);
    setMapResult([]);

    try {
      const response = await firecrawlApi.map(url, {
        limit: 50,
        includeSubdomains: true,
      });

      if (response.success) {
        const responseData = response.data || response;
        const links = (responseData as any).links || [];
        setMapResult(links);
        toast({
          title: 'Mapping Complete',
          description: `Discovered ${links.length} pages on the website`,
        });
      } else {
        toast({
          title: 'Mapping Failed',
          description: response.error || 'Failed to map website',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Map error:', error);
      toast({
        title: 'Error',
        description: 'Failed to map website. Please check the URL and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsMapping(false);
    }
  };

  const handleCrawl = async () => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL to crawl',
        variant: 'destructive',
      });
      return;
    }

    setIsCrawling(true);
    setCrawlResult([]);
    setCrawlStatus('Initiating deep crawl...');

    try {
      const response = await firecrawlApi.crawl(url, {
        limit: 10,
        maxDepth: 2,
      });

      if (response.success) {
        const data = response.data || response;
        
        // Handle async crawl job
        if (data.id || data.jobId) {
          setCrawlStatus(`Crawl job started (ID: ${data.id || data.jobId}). This may take a few minutes...`);
          toast({
            title: 'Crawl Started',
            description: 'Deep crawl initiated. Results will appear when ready.',
          });
        }
        
        // If we got immediate results
        if (data.data && Array.isArray(data.data)) {
          const pages = data.data.map((page: any) => ({
            url: page.metadata?.sourceURL || page.url || 'Unknown',
            markdown: page.markdown,
            title: page.metadata?.title,
          }));
          setCrawlResult(pages);
          setCrawlStatus(`Crawled ${pages.length} pages successfully`);
          toast({
            title: 'Crawl Complete',
            description: `Analyzed ${pages.length} pages in depth`,
          });
        } else {
          setCrawlStatus('Crawl job submitted. Check back in a few minutes.');
        }
      } else {
        setCrawlStatus('');
        toast({
          title: 'Crawl Failed',
          description: response.error || 'Failed to crawl website',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Crawl error:', error);
      setCrawlStatus('');
      toast({
        title: 'Error',
        description: 'Failed to crawl website. Please check the URL and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCrawling(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Web Scanner</h1>
            <p className="text-muted-foreground">Advanced website security analysis with multiple scanning engines</p>
          </div>
        </div>

        {/* Main Scanner Tabs */}
        <Tabs defaultValue="steel" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur-sm mb-6">
            <TabsTrigger value="steel" className="gap-2">
              <Eye className="h-4 w-4" />
              Deep Browser Scan (Steel.dev)
            </TabsTrigger>
            <TabsTrigger value="firecrawl" className="gap-2">
              <Scan className="h-4 w-4" />
              Quick Scan (Firecrawl)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="steel" className="mt-0">
            <SteelSecurityScanner />
          </TabsContent>

          <TabsContent value="firecrawl" className="mt-0 space-y-6">

        {/* Search Input */}
        <Card variant="cyber">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[250px]">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Enter website URL (e.g., example.com)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-10 h-12 bg-background/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                />
              </div>
              <Button 
                onClick={handleScan} 
                disabled={isScanning}
                className="h-12 px-6 gap-2"
              >
                {isScanning ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Scan className="h-5 w-5" />
                )}
                Scan
              </Button>
              <Button 
                onClick={handleMap} 
                disabled={isMapping}
                variant="outline"
                className="h-12 px-6 gap-2"
              >
                {isMapping ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Map className="h-5 w-5" />
                )}
                Map Site
              </Button>
              <Button 
                onClick={handleCrawl} 
                disabled={isCrawling}
                variant="outline"
                className="h-12 px-6 gap-2 border-primary/50 hover:bg-primary/10"
              >
                {isCrawling ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Layers className="h-5 w-5" />
                )}
                Deep Crawl
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Crawl Status */}
        {crawlStatus && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary animate-pulse" />
                <p className="text-sm text-muted-foreground">{crawlStatus}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Analysis */}
        {securityAnalysis && (
          <Card variant={securityAnalysis.riskLevel === 'high' ? 'danger' : 'cyber'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Analysis
                </CardTitle>
                <Badge 
                  variant={
                    securityAnalysis.riskLevel === 'low' ? 'success' : 
                    securityAnalysis.riskLevel === 'medium' ? 'warning' : 'danger'
                  }
                >
                  {securityAnalysis.riskLevel.toUpperCase()} RISK
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    {securityAnalysis.hasHttps ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">HTTPS</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {securityAnalysis.hasHttps ? 'Secure connection' : 'Not secure'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">Internal Links</span>
                  </div>
                  <p className="text-2xl font-bold">{securityAnalysis.internalLinks}</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">External Links</span>
                  </div>
                  <p className="text-2xl font-bold">{securityAnalysis.externalLinks}</p>
                </div>
              </div>

              {securityAnalysis.suspiciousPatterns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Suspicious Patterns Detected
                  </h4>
                  <ul className="space-y-1">
                    {securityAnalysis.suspiciousPatterns.map((pattern, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {(scanResult || mapResult.length > 0 || crawlResult.length > 0) && (
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-sm">
              <TabsTrigger value="content">
                <FileText className="h-4 w-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="links">
                <Link2 className="h-4 w-4 mr-2" />
                Links ({scanResult?.links?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="sitemap">
                <Map className="h-4 w-4 mr-2" />
                Sitemap ({mapResult.length})
              </TabsTrigger>
              <TabsTrigger value="crawl">
                <Layers className="h-4 w-4 mr-2" />
                Deep ({crawlResult.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content">
              <Card>
                <CardHeader>
                  <CardTitle>{scanResult?.metadata?.title || 'Page Content'}</CardTitle>
                  <CardDescription>
                    {scanResult?.metadata?.description || 'Extracted content from the webpage'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full rounded-lg border border-border/50 p-4 bg-background/30">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                      {scanResult?.markdown || 'No content extracted'}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="links">
              <Card>
                <CardHeader>
                  <CardTitle>Discovered Links</CardTitle>
                  <CardDescription>All links found on the webpage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {scanResult?.links?.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-colors group"
                        >
                          <Link2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm text-muted-foreground truncate group-hover:text-foreground transition-colors">
                            {link}
                          </span>
                          <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                        </a>
                      )) || (
                        <p className="text-muted-foreground text-center py-8">No links found</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sitemap">
              <Card>
                <CardHeader>
                  <CardTitle>Website Sitemap</CardTitle>
                  <CardDescription>All pages discovered on the website</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {mapResult.length > 0 ? mapResult.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-colors group"
                        >
                          <Globe className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm text-muted-foreground truncate group-hover:text-foreground transition-colors">
                            {link}
                          </span>
                          <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                        </a>
                      )) : (
                        <p className="text-muted-foreground text-center py-8">
                          Click "Map Site" to discover all pages
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="crawl">
              <Card>
                <CardHeader>
                  <CardTitle>Deep Crawl Results</CardTitle>
                  <CardDescription>In-depth analysis of multiple pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {crawlResult.length > 0 ? crawlResult.map((page, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-lg bg-background/50 border border-border/30"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                            >
                              {page.title || page.url}
                            </a>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {page.markdown?.substring(0, 300)}...
                          </p>
                        </div>
                      )) : (
                        <p className="text-muted-foreground text-center py-8">
                          Click "Deep Crawl" to analyze multiple pages
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        </TabsContent>
      </Tabs>
      </div>
    </Layout>
  );
}
