import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BreachCheckResult {
  id: string;
  email: string;
  is_breached: boolean;
  breach_count: number;
  breach_sources: string[] | null;
  last_checked_at: string;
  ai_analysis: string | null;
}

export const useEmailBreachCheck = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<BreachCheckResult | null>(null);
  const [history, setHistory] = useState<BreachCheckResult[]>([]);
  const { toast } = useToast();

  const checkEmail = useCallback(async (email: string, forceRefresh = false) => {
    setIsChecking(true);
    try {
      // Check if we have cached data (within last 24 hours)
      if (!forceRefresh) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: cached } = await supabase
          .from('email_breach_checks')
          .select('*')
          .eq('email', email.toLowerCase())
          .gte('last_checked_at', twentyFourHoursAgo)
          .order('last_checked_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cached) {
          setResult(cached);
          toast({
            title: "📋 Cached Result",
            description: `Using recent check from ${new Date(cached.last_checked_at).toLocaleString()}`,
          });
          return cached;
        }
      }

      // No cache found, perform fresh check
      const { data, error } = await supabase.functions.invoke('check-email-breach', {
        body: { email }
      });

      if (error) throw error;

      // Check if email domain is invalid
      if (data.email_valid === false || data.domain_exists === false) {
        toast({
          title: "⚠️ Invalid Email",
          description: data.error_message || `Email domain could not be verified`,
          variant: "destructive"
        });
        
        // Show result in UI but don't save to database
        const invalidResult: BreachCheckResult = {
          id: crypto.randomUUID(),
          email: email.toLowerCase(),
          is_breached: false,
          breach_count: 0,
          breach_sources: null,
          last_checked_at: new Date().toISOString(),
          ai_analysis: data.ai_analysis || 'Email domain could not be verified.'
        };
        setResult(invalidResult);
        return null;
      }

      // Save to database only if email is valid
      const { data: saved, error: saveError } = await supabase
        .from('email_breach_checks')
        .insert({
          email: email.toLowerCase(),
          is_breached: data.is_breached,
          breach_count: data.breach_count,
          breach_sources: data.breach_sources,
          ai_analysis: data.ai_analysis
        })
        .select()
        .single();

      if (saveError) throw saveError;

      setResult(saved);
      setHistory(prev => [saved, ...prev].slice(0, 20));

      toast({
        title: data.is_breached ? "⚠️ Breaches Found" : "✅ No Breaches Found",
        description: data.is_breached 
          ? `Found in ${data.breach_count} data breach(es)` 
          : "Your email appears to be safe",
        variant: data.is_breached ? 'destructive' : 'default'
      });

      return saved;
    } catch (error: any) {
      console.error('Email breach check error:', error);
      toast({
        title: "Check Failed",
        description: error.message || "Failed to check email",
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
        .from('email_breach_checks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching breach history:', error);
    }
  }, []);

  return {
    isChecking,
    result,
    history,
    checkEmail,
    fetchHistory
  };
};
