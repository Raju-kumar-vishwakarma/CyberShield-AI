import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSSLCheck, SSLCheckResult } from '@/hooks/useSSLCheck';
import { Lock, Shield, AlertTriangle, CheckCircle, Loader2, Clock, Globe, RefreshCw, Calendar, Building, ShieldCheck, ShieldX, Trash2, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const getGradeColor = (grade: string | null) => {
  switch (grade?.toUpperCase()) {
    case 'A+':
    case 'A':
      return 'bg-green-500/10 text-green-500 border-green-500/30';
    case 'B':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    case 'C':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
    case 'D':
    case 'F':
      return 'bg-red-500/10 text-red-500 border-red-500/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getExpiryColor = (expiresAt: string | null) => {
  if (!expiresAt) return 'text-muted-foreground';
  const daysLeft = Math.floor((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return 'text-red-500';
  if (daysLeft < 30) return 'text-red-500';
  if (daysLeft < 60) return 'text-yellow-500';
  return 'text-green-500';
};

export default function SSLChecker() {
  const [domain, setDomain] = useState('');
  const { isChecking, result, history, checkSSL, fetchHistory, deleteCheck, clearAllHistory, setResult } = useSSLCheck();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (domain.trim()) {
      await checkSSL(domain.trim());
    }
  };

  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    return Math.floor((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const handleHistoryClick = (item: SSLCheckResult) => {
    setResult(item);
    setDomain(item.domain);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-mono font-bold text-foreground flex items-center gap-3">
            <Lock className="h-8 w-8 text-primary" />
            SSL Certificate Checker
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze real SSL/TLS certificate data for any domain
          </p>
        </div>

        {/* Search Form */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6">
            <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-4">
              <Input
                type="text"
                placeholder="Enter domain (e.g., google.com)..."
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="flex-1 bg-secondary/30 border-border/50"
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isChecking || !domain.trim()}>
                  {isChecking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Check SSL
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  disabled={isChecking || !domain.trim()}
                  onClick={() => domain.trim() && checkSSL(domain.trim(), true)}
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
          <Card className={`border-2 ${result.is_valid ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {result.is_valid ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <span className="text-green-500">SSL Certificate Valid</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                    <span className="text-red-500">SSL Issues Detected</span>
                  </>
                )}
                <Badge variant="outline" className="ml-2">
                  Real Certificate Data
                </Badge>
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
            <CardContent className="space-y-6">
              {/* Grade and Main Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-background/50 text-center">
                  <div className={`text-4xl font-bold inline-block px-4 py-2 rounded-lg ${getGradeColor(result.grade)}`}>
                    {result.grade || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">Security Grade</div>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="text-lg font-bold flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {result.domain}
                  </div>
                  <div className="text-sm text-muted-foreground">Domain</div>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="text-lg font-bold flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {result.issuer || 'Unknown'}
                  </div>
                  <div className="text-sm text-muted-foreground">Certificate Issuer</div>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <div className={`text-lg font-bold flex items-center gap-2 ${getExpiryColor(result.expires_at)}`}>
                    <Calendar className="h-4 w-4" />
                    {result.expires_at 
                      ? format(new Date(result.expires_at), 'MMM dd, yyyy')
                      : 'Unknown'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {result.expires_at && (
                      <>
                        Expires {formatDistanceToNow(new Date(result.expires_at), { addSuffix: true })}
                        {getDaysUntilExpiry(result.expires_at) !== null && (
                          <span className={`ml-1 ${getExpiryColor(result.expires_at)}`}>
                            ({getDaysUntilExpiry(result.expires_at)} days)
                          </span>
                        )}
                      </>
                    )}
                    {!result.expires_at && 'Expiration Date'}
                  </div>
                </div>
              </div>

              {/* Vulnerabilities */}
              {result.vulnerabilities && result.vulnerabilities.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <ShieldX className="h-4 w-4 text-yellow-500" />
                    Security Issues Found:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.vulnerabilities.map((vuln, i) => (
                      <Badge key={i} variant="outline" className="border-yellow-500/50 text-yellow-500">
                        {vuln}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* No vulnerabilities */}
              {(!result.vulnerabilities || result.vulnerabilities.length === 0) && result.is_valid && (
                <div className="flex items-center gap-2 text-green-500">
                  <ShieldCheck className="h-5 w-5" />
                  <span>No security vulnerabilities detected</span>
                </div>
              )}
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
                      className="p-3 rounded-lg bg-secondary/30 border border-border/30 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
                      onClick={() => handleHistoryClick(check)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {check.is_valid ? (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-mono text-sm truncate block">{check.domain}</span>
                          {check.issuer && (
                            <span className="text-xs text-muted-foreground">
                              by {check.issuer}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={getGradeColor(check.grade)}>
                          {check.grade || 'N/A'}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {format(new Date(check.checked_at), 'MMM dd, HH:mm')}
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