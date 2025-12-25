import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  Mail,
  Lock,
  Bug,
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Loader2,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { useSecurityScore } from "@/hooks/useSecurityScore";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const SecurityScore = () => {
  const { data, isLoading, refetch } = useSecurityScore();

  const getScoreIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <ShieldCheck className="h-8 w-8 text-success" />;
      case 'good':
        return <Shield className="h-8 w-8 text-primary" />;
      case 'warning':
        return <ShieldAlert className="h-8 w-8 text-warning" />;
      case 'critical':
        return <ShieldX className="h-8 w-8 text-destructive" />;
      default:
        return <Shield className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getScoreColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'hsl(155, 100%, 50%)';
      case 'good':
        return 'hsl(187, 100%, 42%)';
      case 'warning':
        return 'hsl(45, 100%, 50%)';
      case 'critical':
        return 'hsl(0, 100%, 50%)';
      default:
        return 'hsl(220, 15%, 55%)';
    }
  };

  const getCategoryIcon = (name: string) => {
    switch (name) {
      case 'Threat Protection':
        return <Activity className="h-5 w-5" />;
      case 'Phishing Defense':
        return <Mail className="h-5 w-5" />;
      case 'SSL/TLS Security':
        return <Lock className="h-5 w-5" />;
      case 'Email Security':
        return <AlertTriangle className="h-5 w-5" />;
      case 'Intrusion Detection':
        return <Bug className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getCategoryLink = (name: string) => {
    switch (name) {
      case 'Threat Protection':
        return '/threats';
      case 'Phishing Defense':
        return '/phishing';
      case 'SSL/TLS Security':
        return '/ssl-checker';
      case 'Email Security':
        return '/email-breach';
      case 'Intrusion Detection':
        return '/honeypot';
      default:
        return '/dashboard';
    }
  };

  if (isLoading || !data) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground font-mono">Calculating security score...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const radialData = [
    {
      name: 'Score',
      value: data.overallScore,
      fill: getScoreColor(data.overallStatus),
    }
  ];

  const metricsData = [
    { name: 'Threats', value: data.metrics.totalThreats, fill: 'hsl(0, 100%, 50%)' },
    { name: 'Phishing', value: data.metrics.phishingDetected, fill: 'hsl(45, 100%, 50%)' },
    { name: 'Blocked', value: data.metrics.blockedIPs, fill: 'hsl(155, 100%, 50%)' },
    { name: 'SSL Issues', value: data.metrics.invalidSSL, fill: 'hsl(25, 100%, 50%)' },
    { name: 'Breached', value: data.metrics.breachedEmails, fill: 'hsl(270, 100%, 60%)' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl lg:text-3xl font-mono font-bold text-foreground mb-2">
              Security Score Dashboard
            </h1>
            <p className="text-muted-foreground">
              Comprehensive overview of your security posture
            </p>
          </div>
          <Button
            variant="outline"
            onClick={refetch}
            className="gap-2 font-mono"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Main Score Card */}
        <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardContent className="p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {/* Score Circle */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="70%"
                      outerRadius="100%"
                      barSize={12}
                      data={radialData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        angleAxisId={0}
                        tick={false}
                      />
                      <RadialBar
                        background={{ fill: 'hsl(222, 30%, 18%)' }}
                        dataKey="value"
                        angleAxisId={0}
                        cornerRadius={6}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-mono font-bold" style={{ color: getScoreColor(data.overallStatus) }}>
                      {data.overallScore}
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">/ 100</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  {getScoreIcon(data.overallStatus)}
                  <span className={cn(
                    "text-lg font-mono font-semibold capitalize",
                    data.overallStatus === 'excellent' && 'text-success',
                    data.overallStatus === 'good' && 'text-primary',
                    data.overallStatus === 'warning' && 'text-warning',
                    data.overallStatus === 'critical' && 'text-destructive'
                  )}>
                    {data.overallStatus} Security
                  </span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <h3 className="text-lg font-mono font-semibold text-foreground mb-4">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="h-4 w-4 text-destructive" />
                      <span className="text-xs text-muted-foreground font-mono">Total Threats</span>
                    </div>
                    <span className="text-2xl font-mono font-bold text-foreground">{data.metrics.totalThreats}</span>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="h-4 w-4 text-success" />
                      <span className="text-xs text-muted-foreground font-mono">Blocked IPs</span>
                    </div>
                    <span className="text-2xl font-mono font-bold text-foreground">{data.metrics.blockedIPs}</span>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-warning" />
                      <span className="text-xs text-muted-foreground font-mono">Phishing</span>
                    </div>
                    <span className="text-2xl font-mono font-bold text-foreground">{data.metrics.phishingDetected}</span>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground font-mono">SSL Checks</span>
                    </div>
                    <span className="text-2xl font-mono font-bold text-foreground">{data.metrics.sslChecks}</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-4">
                <h3 className="text-lg font-mono font-semibold text-foreground flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-warning" />
                  Recommendations
                </h3>
                <div className="space-y-3">
                  {data.recommendations.slice(0, 4).map((rec, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                    >
                      {rec.includes('critical') || rec.includes('immediately') ? (
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      ) : rec.includes('Great') ? (
                        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-sm text-muted-foreground">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {data.categories.map((category, index) => (
            <Card 
              key={category.name} 
              variant="cyber" 
              className="animate-fade-in hover:border-primary/50 transition-all group"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    "p-2 rounded-lg",
                    category.status === 'excellent' && 'bg-success/10 text-success',
                    category.status === 'good' && 'bg-primary/10 text-primary',
                    category.status === 'warning' && 'bg-warning/10 text-warning',
                    category.status === 'critical' && 'bg-destructive/10 text-destructive'
                  )}>
                    {getCategoryIcon(category.name)}
                  </div>
                  <Badge variant={
                    category.status === 'excellent' ? 'success' :
                    category.status === 'good' ? 'info' :
                    category.status === 'warning' ? 'warning' : 'danger'
                  }>
                    {category.percentage}%
                  </Badge>
                </div>
                
                <h4 className="font-mono font-semibold text-foreground mb-2 text-sm">
                  {category.name}
                </h4>
                
                <Progress 
                  value={category.percentage} 
                  className="h-2 mb-3"
                />
                
                <p className="text-xs text-muted-foreground mb-3">
                  {category.details}
                </p>

                <Link 
                  to={getCategoryLink(category.name)}
                  className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  View Details <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Metrics Overview Chart */}
          <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.7s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Security Metrics Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="hsl(220, 15%, 55%)" fontSize={12} fontFamily="JetBrains Mono" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="hsl(220, 15%, 55%)" 
                      fontSize={12} 
                      fontFamily="JetBrains Mono"
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 40%, 8%)",
                        border: "1px solid hsl(187, 100%, 42%)",
                        borderRadius: "8px",
                        fontFamily: "JetBrains Mono",
                        color: "hsl(210, 40%, 98%)",
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {metricsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Metrics */}
          <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.8s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Detailed Security Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Threat Metrics */}
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <h4 className="font-mono font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-destructive" />
                    Threat Analysis
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <span className="text-xl font-mono font-bold text-destructive">{data.metrics.criticalThreats}</span>
                      <p className="text-xs text-muted-foreground">Critical</p>
                    </div>
                    <div>
                      <span className="text-xl font-mono font-bold text-warning">{data.metrics.highThreats}</span>
                      <p className="text-xs text-muted-foreground">High</p>
                    </div>
                    <div>
                      <span className="text-xl font-mono font-bold text-primary">{data.metrics.mediumThreats}</span>
                      <p className="text-xs text-muted-foreground">Medium</p>
                    </div>
                    <div>
                      <span className="text-xl font-mono font-bold text-success">{data.metrics.lowThreats}</span>
                      <p className="text-xs text-muted-foreground">Low</p>
                    </div>
                  </div>
                </div>

                {/* Phishing Metrics */}
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <h4 className="font-mono font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-warning" />
                    Phishing Scans
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-xl font-mono font-bold text-success">{data.metrics.safeScans}</span>
                      <p className="text-xs text-muted-foreground">Safe</p>
                    </div>
                    <div>
                      <span className="text-xl font-mono font-bold text-warning">{data.metrics.suspiciousScans}</span>
                      <p className="text-xs text-muted-foreground">Suspicious</p>
                    </div>
                    <div>
                      <span className="text-xl font-mono font-bold text-destructive">{data.metrics.phishingDetected}</span>
                      <p className="text-xs text-muted-foreground">Phishing</p>
                    </div>
                  </div>
                </div>

                {/* Email & SSL Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <h4 className="font-mono font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Email Breaches
                    </h4>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-mono font-bold text-foreground">{data.metrics.breachedEmails}</span>
                      <span className="text-sm text-muted-foreground mb-1">/ {data.metrics.emailChecks}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <h4 className="font-mono font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                      <Lock className="h-4 w-4 text-primary" />
                      SSL Valid
                    </h4>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-mono font-bold text-foreground">{data.metrics.validSSL}</span>
                      <span className="text-sm text-muted-foreground mb-1">/ {data.metrics.sslChecks}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Updated */}
        <div className="text-center text-sm text-muted-foreground font-mono">
          Last updated: {data.lastUpdated.toLocaleTimeString()}
        </div>
      </div>
    </Layout>
  );
};

export default SecurityScore;
