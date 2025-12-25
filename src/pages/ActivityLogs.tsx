import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { Activity, Clock, Globe, Monitor, User } from 'lucide-react';
import { format } from 'date-fns';

const getActionIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'login':
      return <User className="h-4 w-4" />;
    case 'scan':
      return <Activity className="h-4 w-4" />;
    case 'threat':
      return <Globe className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
};

const getActionColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'login':
      return 'bg-green-500/10 text-green-500 border-green-500/30';
    case 'threat':
      return 'bg-red-500/10 text-red-500 border-red-500/30';
    case 'scan':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export default function ActivityLogs() {
  const { logs, isLoading, refetch } = useActivityLogs();

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-mono font-bold text-foreground flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Activity Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Track all security-related activities and events
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">{logs.length}</div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-500">
                {logs.filter(l => l.action_type.toLowerCase() === 'login').length}
              </div>
              <div className="text-sm text-muted-foreground">Login Events</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-500">
                {logs.filter(l => l.action_type.toLowerCase() === 'scan').length}
              </div>
              <div className="text-sm text-muted-foreground">Scans</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-500">
                {logs.filter(l => l.action_type.toLowerCase() === 'threat').length}
              </div>
              <div className="text-sm text-muted-foreground">Threats</div>
            </CardContent>
          </Card>
        </div>

        {/* Activity List */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="font-mono">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity logs yet
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 rounded-lg bg-secondary/30 border border-border/30 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${getActionColor(log.action_type)}`}>
                            {getActionIcon(log.action_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-foreground">
                                {log.action_type}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {log.user_id ? 'User' : 'System'}
                              </Badge>
                            </div>
                            {log.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {log.description}
                              </p>
                            )}
                            {log.ip_address && (
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                IP: {log.ip_address}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
