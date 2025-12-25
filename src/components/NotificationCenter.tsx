import { useState } from 'react';
import { Bell, X, Check, Trash2, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications, SecurityNotification } from '@/hooks/useNotifications';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const getNotificationIcon = (type: SecurityNotification['type']) => {
  switch (type) {
    case 'threat':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getNotificationBg = (type: SecurityNotification['type'], read: boolean) => {
  if (read) return 'bg-secondary/20';
  switch (type) {
    case 'threat':
      return 'bg-red-500/10 border-red-500/30';
    case 'warning':
      return 'bg-yellow-500/10 border-yellow-500/30';
    case 'success':
      return 'bg-green-500/10 border-green-500/30';
    default:
      return 'bg-blue-500/10 border-blue-500/30';
  }
};

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markAsRead,
    markAllAsRead,
    clearNotifications
  } = useNotifications();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-mono font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {permission !== 'granted' && (
              <Button variant="ghost" size="sm" onClick={requestPermission}>
                Enable
              </Button>
            )}
            {notifications.length > 0 && (
              <>
                <Button variant="ghost" size="icon" onClick={markAllAsRead} title="Mark all as read">
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={clearNotifications} title="Clear all">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-secondary/50",
                    getNotificationBg(notification.type, notification.read)
                  )}
                >
                  <div className="flex items-start gap-2">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(notification.timestamp, 'HH:mm')}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
