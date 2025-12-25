import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  sender_name: string;
  content: string;
  is_ai: boolean;
  created_at: string;
}

export const useAIChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const conversationHistory = useRef<{ role: string; content: string }[]>([]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
      // Build conversation history
      conversationHistory.current = (data || []).map(msg => ({
        role: msg.is_ai ? 'assistant' : 'user',
        content: msg.content
      }));
    }
  }, []);

  // Send message to AI
  const sendMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!message.trim()) return null;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message,
          conversationHistory: conversationHistory.current.slice(-10) // Last 10 messages for context
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Update conversation history
      conversationHistory.current.push(
        { role: 'user', content: message },
        { role: 'assistant', content: data.response }
      );

      return data.response;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Message Failed',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSending(false);
    }
  }, [toast]);

  // Clear chat
  const clearChat = useCallback(async () => {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error('Error clearing chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear chat',
        variant: 'destructive',
      });
    } else {
      setMessages([]);
      conversationHistory.current = [];
      toast({
        title: 'Chat Cleared',
        description: 'All messages have been deleted',
      });
    }
  }, [toast]);

  // Set up realtime subscription
  useEffect(() => {
    setIsLoading(true);
    fetchMessages().finally(() => setIsLoading(false));

    const channel = supabase
      .channel('chat-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          console.log('New message:', payload);
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    clearChat,
    refetch: fetchMessages
  };
};
