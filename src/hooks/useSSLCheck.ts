import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SSLCheckResult {
  id: string;
  domain: string;
  is_valid: boolean;
  issuer: string | null;
  expires_at: string | null;
  grade: string | null;
  vulnerabilities: string[] | null;
  checked_at: string;
}

export const useSSLCheck = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<SSLCheckResult | null>(null);
  const [history, setHistory] = useState<SSLCheckResult[]>([]);
  const { toast } = useToast();

  const checkSSL = useCallback(async (domain: string, forceRefresh = false) => {
    setIsChecking(true);
    try {
      // Clean the domain - remove protocol, path, trailing slashes
      const cleanDomain = domain
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .trim()
        .toLowerCase();

      if (!cleanDomain) {
        toast({
          title: "Invalid Domain",
          description: "Please enter a valid domain name",
          variant: "destructive"
        });
        setIsChecking(false);
        return null;
      }

      // Check if we have cached data (within last 24 hours)
      if (!forceRefresh) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: cached } = await supabase
          .from('ssl_checks')
          .select('*')
          .eq('domain', cleanDomain)
          .gte('checked_at', twentyFourHoursAgo)
          .order('checked_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cached) {
          setResult(cached);
          toast({
            title: "📋 Cached Result",
            description: `Using recent check from ${new Date(cached.checked_at).toLocaleString()}`,
          });
          return cached;
        }
      }

      // No cache found, perform fresh check
      const { data, error } = await supabase.functions.invoke('check-ssl', {
        body: { domain: cleanDomain }
      });

      if (error) throw error;

      // Clean the domain for display
      const cleanDomainForDisplay = domain
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .trim()
        .toLowerCase();

      // Check if domain doesn't exist
      if (data.domain_exists === false) {
        toast({
          title: "⚠️ Domain Not Found",
          description: data.error_message || `Domain "${cleanDomainForDisplay}" could not be found`,
          variant: "destructive"
        });
        
        // Still set result to show in UI
        const notFoundResult: SSLCheckResult = {
          id: crypto.randomUUID(),
          domain: cleanDomainForDisplay,
          is_valid: false,
          issuer: null,
          expires_at: null,
          grade: 'N/A',
          vulnerabilities: data.vulnerabilities || ['Domain not found'],
          checked_at: new Date().toISOString()
        };
        setResult(notFoundResult);
        return null;
      }

      // Clean domain for storage
      const domainToSave = domain
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .trim()
        .toLowerCase();

      // Save to database only if domain exists
      const { data: saved, error: saveError } = await supabase
        .from('ssl_checks')
        .insert({
          domain: domainToSave,
          is_valid: data.is_valid,
          issuer: data.issuer,
          expires_at: data.expires_at,
          grade: data.grade,
          vulnerabilities: data.vulnerabilities
        })
        .select()
        .single();

      if (saveError) throw saveError;

      setResult(saved);
      setHistory(prev => [saved, ...prev].slice(0, 20));

      toast({
        title: data.is_valid ? "✅ SSL Valid" : "⚠️ SSL Issues Found",
        description: `Grade: ${data.grade || 'Unknown'}`,
        variant: data.is_valid ? 'default' : 'destructive'
      });

      return saved;
    } catch (error: any) {
      console.error('SSL check error:', error);
      toast({
        title: "SSL Check Failed",
        description: error.message || "Failed to check SSL certificate",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [toast]);

  const fetchHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ssl_checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching SSL history:', error);
    }
  }, []);

  const deleteCheck = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('ssl_checks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHistory(prev => prev.filter(item => item.id !== id));
      if (result?.id === id) {
        setResult(null);
      }
      
      toast({
        title: "Deleted",
        description: "SSL check record deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting SSL check:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete record",
        variant: "destructive"
      });
    }
  }, [result, toast]);

  const clearAllHistory = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('ssl_checks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      setHistory([]);
      setResult(null);
      
      toast({
        title: "Cleared",
        description: "All SSL check history has been deleted",
      });
    } catch (error: any) {
      console.error('Error clearing history:', error);
      toast({
        title: "Clear Failed",
        description: error.message || "Failed to clear history",
        variant: "destructive"
      });
    }
  }, [toast]);

  return {
    isChecking,
    result,
    history,
    checkSSL,
    fetchHistory,
    deleteCheck,
    clearAllHistory,
    setResult
  };
};