import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEmailBreachCheck } from '@/hooks/useEmailBreachCheck';
import { Mail, Shield, AlertTriangle, CheckCircle, Loader2, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function EmailBreachChecker() {
  const [email, setEmail] = useState('');
  const { isChecking, result, history, checkEmail, fetchHistory } = useEmailBreachCheck();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      await checkEmail(email.trim());
    }
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
            <CardHeader>
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="text-2xl font-bold">{result.breach_count}</div>
                  <div className="text-sm text-muted-foreground">Breaches Found</div>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="text-2xl font-bold">{result.email}</div>
                  <div className="text-sm text-muted-foreground">Email Checked</div>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="text-2xl font-bold">
                    {format(new Date(result.last_checked_at), 'HH:mm')}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Checked</div>
                </div>
              </div>

              {result.breach_sources && result.breach_sources.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Breach Sources:</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.breach_sources.map((source, i) => (
                      <Badge key={i} variant="destructive">{source}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.ai_analysis && (
                <div className="p-4 rounded-lg bg-background/50">
                  <h4 className="font-medium mb-2">Security Analysis:</h4>
                  <p className="text-sm text-muted-foreground">{result.ai_analysis}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* History */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Checks
            </CardTitle>
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
                      className="p-3 rounded-lg bg-secondary/30 border border-border/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {check.is_breached ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <span className="font-mono text-sm">{check.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={check.is_breached ? 'destructive' : 'secondary'}>
                          {check.breach_count} breaches
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(check.last_checked_at), 'MMM dd, HH:mm')}
                        </span>
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
