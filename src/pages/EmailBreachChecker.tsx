import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEmailBreachCheck, BreachCheckResult } from '@/hooks/useEmailBreachCheck';
import { Mail, Shield, AlertTriangle, CheckCircle, Loader2, Clock, RefreshCw, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';

export default function EmailBreachChecker() {
  const [email, setEmail] = useState('');
  const { isChecking, result, history, checkEmail, fetchHistory, deleteCheck, clearAllHistory, setResult } = useEmailBreachCheck();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      await checkEmail(email.trim());
    }
  };

  const handleHistoryClick = (item: BreachCheckResult) => {
    setResult(item);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-mono font-bold text-foreground flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary" />
            Email Breach Checker
          </h1>
          <p className="text-muted-foreground mt-1">
            Check if your email has been exposed in known data breaches
          </p>
        </div>

        {/* Search Form */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-4">
              <Input
                type="email"
                placeholder="Enter email address to check..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-secondary/30 border-border/50"
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isChecking || !email.trim()}>
                  {isChecking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Check Email
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  disabled={isChecking || !email.trim()}
                  onClick={() => email.trim() && checkEmail(email.trim(), true)}
                  title="Force fresh check"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card className={`border-2 ${result.is_breached ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {result.is_breached ? (
                  <>
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                    <span className="text-red-500">Breaches Detected</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <span className="text-green-500">No Breaches Found</span>
                  </>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setResult(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="text-2xl font-bold">{result.breach_count || 0}</div>
                  <div className="text-sm text-muted-foreground">Breaches Found</div>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="text-lg font-bold break-all">{result.email}</div>
                  <div className="text-sm text-muted-foreground">Email Checked</div>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="text-2xl font-bold">
                    {format(new Date(result.last_checked_at), 'HH:mm')}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Checked</div>
                </div>
              </div>

              {/* Always show breach sources section when breached */}
              {result.is_breached && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                  <h4 className="font-medium mb-2 text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Breach Sources:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.breach_sources && result.breach_sources.length > 0 ? (
                      result.breach_sources.map((source, i) => (
                        <Badge key={i} variant="destructive">{source}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Breach source details unavailable</span>
                    )}
                  </div>
                </div>
              )}

              {/* AI Analysis section */}
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Security Analysis:
                </h4>
                <p className="text-sm text-muted-foreground">
                  {result.ai_analysis || (result.is_breached 
                    ? 'Your email was found in one or more data breaches. We recommend changing your password immediately and enabling two-factor authentication on all accounts.' 
                    : 'No breaches detected. Your email appears to be safe.')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-mono flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Checks
            </CardTitle>
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllHistory}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No checks performed yet
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((check) => (
                    <div
                      key={check.id}
                      className="p-3 rounded-lg bg-secondary/30 border border-border/30 flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => handleHistoryClick(check)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {check.is_breached ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                        <span className="font-mono text-sm truncate">{check.email}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={check.is_breached ? 'destructive' : 'secondary'}>
                          {check.breach_count || 0} breaches
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {format(new Date(check.last_checked_at), 'MMM dd, HH:mm')}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCheck(check.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
