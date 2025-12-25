import { supabase } from '@/integrations/supabase/client';

export interface SteelScanResult {
  url: string;
  finalUrl: string;
  redirectChain: string[];
  screenshot: string;
  pageTitle: string;
  hasLoginForm: boolean;
  hasPasswordField: boolean;
  hasCreditCardField: boolean;
  suspiciousScripts: string[];
  externalLinks: string[];
  sslValid: boolean;
  domAnalysis: {
    forms: number;
    inputs: number;
    iframes: number;
    scripts: number;
    externalScripts: number;
  };
  riskScore: number;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  threatIndicators: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
}

export interface ScreenshotAnalysis {
  isPhishing: boolean;
  confidence: number;
  brandTargeted: string | null;
  phishingIndicators: Array<{
    indicator: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  legitimacyFactors: string[];
  overallAssessment: string;
}

export interface BatchScanResult {
  url: string;
  finalUrl: string;
  pageTitle: string;
  sslValid: boolean;
  riskScore: number;
  riskLevel: string;
  hasLoginForm: boolean;
  hasPasswordField: boolean;
  threatCount: number;
  status: 'completed' | 'failed';
  error?: string;
  screenshot?: string;
}

export interface BatchScanSummary {
  total: number;
  completed: number;
  failed: number;
  highRisk: number;
}

type SteelResponse<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

export const steelApi = {
  /**
   * Perform a deep browser-based security scan
   */
  async deepScan(url: string): Promise<SteelResponse<SteelScanResult>> {
    const { data, error } = await supabase.functions.invoke('steel-security-scan', {
      body: { url },
    });

    if (error) {
      console.error('Steel scan error:', error);
      return { success: false, error: error.message };
    }
    
    return data;
  },

  /**
   * Batch scan multiple URLs at once
   */
  async batchScan(urls: string[], includeScreenshots = false): Promise<SteelResponse<{ results: BatchScanResult[]; summary: BatchScanSummary }>> {
    const { data, error } = await supabase.functions.invoke('batch-security-scan', {
      body: { urls, includeScreenshots },
    });

    if (error) {
      console.error('Batch scan error:', error);
      return { success: false, error: error.message };
    }
    
    return data;
  },

  /**
   * Take a browser screenshot of a URL
   */
  async takeScreenshot(url: string, options?: { fullPage?: boolean; device?: 'desktop' | 'mobile' }): Promise<SteelResponse<{ screenshot: string; url: string }>> {
    const { data, error } = await supabase.functions.invoke('browser-screenshot', {
      body: { url, ...options },
    });

    if (error) {
      console.error('Screenshot error:', error);
      return { success: false, error: error.message };
    }
    
    return data;
  },

  /**
   * Analyze a screenshot using AI for visual phishing detection
   */
  async analyzeScreenshot(screenshot: string, url: string): Promise<SteelResponse<ScreenshotAnalysis>> {
    const { data, error } = await supabase.functions.invoke('steel-screenshot-analyze', {
      body: { screenshot, url },
    });

    if (error) {
      console.error('Screenshot analysis error:', error);
      return { success: false, error: error.message };
    }
    
    return data;
  },

  /**
   * Perform a full scan with screenshot and AI analysis
   */
  async fullSecurityScan(url: string): Promise<{
    scanResult: SteelResponse<SteelScanResult>;
    visualAnalysis: SteelResponse<ScreenshotAnalysis> | null;
  }> {
    // First, perform the deep scan
    const scanResult = await this.deepScan(url);
    
    // If we have a screenshot, analyze it
    let visualAnalysis: SteelResponse<ScreenshotAnalysis> | null = null;
    if (scanResult.success && scanResult.data?.screenshot) {
      visualAnalysis = await this.analyzeScreenshot(scanResult.data.screenshot, url);
    }
    
    return { scanResult, visualAnalysis };
  },
};
