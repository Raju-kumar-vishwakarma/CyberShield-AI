import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Json;
  created_at: string;
}

export const useActivityLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: unknown) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logActivity = useCallback(async (
    action_type: string,
    description?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase.from('user_activity_logs').insert({
        action_type,
        description,
        metadata: metadata || {},
        user_agent: navigator.userAgent
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error logging activity:', error);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    // Set up realtime subscription
    const channel = supabase
      .channel('activity-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activity_logs'
        },
        (payload) => {
          setLogs(prev => [payload.new as ActivityLog, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  return {
    logs,
    isLoading,
    logActivity,
    refetch: fetchLogs
  };
};
