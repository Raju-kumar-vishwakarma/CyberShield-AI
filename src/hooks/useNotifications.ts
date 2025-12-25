import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface SecurityNotification {
  id: string;
  title: string;
  message: string;
  type: 'threat' | 'warning' | 'info' | 'success';
  timestamp: Date;
  read: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support notifications",
        variant: "destructive"
      });
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast({
        title: "Notifications enabled",
        description: "You'll receive security alerts",
      });
      return true;
    }
    
    return false;
  }, [toast]);

  const sendNotification = useCallback((
    title: string,
    message: string,
    type: SecurityNotification['type'] = 'info'
  ) => {
    const newNotification: SecurityNotification = {
      id: crypto.randomUUID(),
      title,
      message,
      type,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50));

    // Send browser notification if permitted
    if (permission === 'granted') {
      const icon = type === 'threat' ? '🚨' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
      new Notification(`${icon} ${title}`, {
        body: message,
        icon: '/favicon.ico',
        tag: newNotification.id
      });
    }

    // Also show toast
    toast({
      title,
      description: message,
      variant: type === 'threat' ? 'destructive' : 'default'
    });
  }, [permission, toast]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    sendNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
};
