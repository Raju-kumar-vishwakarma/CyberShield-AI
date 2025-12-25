import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import {
  Shield,
  AlertTriangle,
  Activity,
  Globe,
  Server,
  Users,
  TrendingUp,
  Clock,
  ChevronRight,
  Loader2,
  Mail,
  Ban,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useThreatAnalytics } from "@/hooks/useThreatAnalytics";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { threats, stats, trendData, threatTypes, isLoading } = useThreatAnalytics();

  // Calculate security score based on stats
  const securityScore = Math.max(0, Math.min(100, 
    100 - (stats.criticalThreats * 10) - (stats.highThreats * 5) - (stats.phishingDetected * 3)
  ));

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/50">
            <div className="flex items-center gap-4">
            
              <div>
                <h1 className="text-2xl lg:text-3xl font-mono font-bold text-foreground tracking-tight">
                  Security Dashboard
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Real-time AI-powered security analytics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                to="/threats" 
                className="text-sm font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                Threats
              </Link>
              <Link 
                to="/security-tools" 
                className="text-sm font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                Tools
              </Link>
              <Link 
                to="/activity-logs" 
                className="text-sm font-mono text-primary font-medium"
              >
                Logs
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Security Score */}
          <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-mono mb-1">Security Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-mono font-bold ${
                      securityScore >= 80 ? 'text-success' : 
                      securityScore >= 60 ? 'text-warning' : 'text-destructive'
                    }`}>
                      {securityScore}
                    </span>
                    <span className="text-lg text-muted-foreground">/100</span>
                  </div>
                  <div className={`flex items-center gap-1 mt-2 text-sm ${
                    securityScore >= 80 ? 'text-success' : 
                    securityScore >= 60 ? 'text-warning' : 'text-destructive'
                  }`}>
                    <TrendingUp className="h-4 w-4" />
                    <span>Based on real threats</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${
                  securityScore >= 80 ? 'bg-success/10 border border-success/30' : 
                  securityScore >= 60 ? 'bg-warning/10 border border-warning/30' : 
                  'bg-destructive/10 border border-destructive/30'
                }`}>
                  <Shield className={`h-6 w-6 ${
                    securityScore >= 80 ? 'text-success' : 
                    securityScore >= 60 ? 'text-warning' : 'text-destructive'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Threats */}
          <Card variant="danger" className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-mono mb-1">Active Threats</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-mono font-bold text-destructive">
                      {isLoading ? '-' : stats.totalThreats}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{stats.criticalThreats} critical</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 animate-pulse-glow">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phishing Detected */}
          <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-mono mb-1">Phishing Detected</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-mono font-bold text-warning">
                      {isLoading ? '-' : stats.phishingDetected}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-success text-sm">
                    <Mail className="h-4 w-4" />
                    <span>{stats.safeScans} safe scans</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-warning/10 border border-warning/30">
                  <Mail className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blocked IPs */}
          <Card variant="success" className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-mono mb-1">Blocked IPs</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-mono font-bold text-success">
                      {isLoading ? '-' : stats.blockedIPs}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-muted-foreground text-sm">
                    <Ban className="h-4 w-4" />
                    <span>Threats neutralized</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-success/10 border border-success/30">
                  <Shield className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <Card variant="cyber" className="lg:col-span-2 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Threat Trends (7 Days)
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="phishingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(45, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(45, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(155, 100%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(155, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="date" stroke="hsl(220, 15%, 55%)" fontSize={12} fontFamily="JetBrains Mono" />
                    <YAxis stroke="hsl(220, 15%, 55%)" fontSize={12} fontFamily="JetBrains Mono" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 40%, 8%)",
                        border: "1px solid hsl(187, 100%, 42%)",
                        borderRadius: "8px",
                        fontFamily: "JetBrains Mono",
                        color: "hsl(210, 40%, 98%)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="threats"
                      stroke="hsl(0, 100%, 50%)"
                      fill="url(#threatGradient)"
                      strokeWidth={2}
                      name="Network Threats"
                    />
                    <Area
                      type="monotone"
                      dataKey="phishing"
                      stroke="hsl(45, 100%, 50%)"
                      fill="url(#phishingGradient)"
                      strokeWidth={2}
                      name="Phishing"
                    />
                    <Area
                      type="monotone"
                      dataKey="blocked"
                      stroke="hsl(155, 100%, 50%)"
                      fill="url(#blockedGradient)"
                      strokeWidth={2}
                      name="Blocked"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm text-muted-foreground font-mono">Threats</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm text-muted-foreground font-mono">Phishing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm text-muted-foreground font-mono">Blocked</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Threat Types Distribution */}
          <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Threat Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {threatTypes.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No threat data yet</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={threatTypes}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {threatTypes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(222, 40%, 12%)",
                            border: "1px solid hsl(187, 100%, 42%)",
                            borderRadius: "8px",
                            fontFamily: "JetBrains Mono",
                            color: "hsl(210, 40%, 98%)",
                          }}
                          itemStyle={{
                            color: "hsl(210, 40%, 98%)",
                          }}
                          labelStyle={{
                            color: "hsl(210, 40%, 98%)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {threatTypes.map((type, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                          <span className="text-muted-foreground truncate max-w-[120px]">{type.name}</span>
                        </div>
                        <span className="font-mono text-foreground">{type.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Severity Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.7s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Threat Severity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Critical', value: stats.criticalThreats, fill: 'hsl(0, 100%, 50%)' },
                    { name: 'High', value: stats.highThreats, fill: 'hsl(25, 100%, 50%)' },
                    { name: 'Medium', value: stats.mediumThreats, fill: 'hsl(45, 100%, 50%)' },
                    { name: 'Low', value: stats.lowThreats, fill: 'hsl(155, 100%, 50%)' },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="name" stroke="hsl(220, 15%, 55%)" fontSize={12} fontFamily="JetBrains Mono" />
                    <YAxis stroke="hsl(220, 15%, 55%)" fontSize={12} fontFamily="JetBrains Mono" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 40%, 8%)",
                        border: "1px solid hsl(187, 100%, 42%)",
                        borderRadius: "8px",
                        fontFamily: "JetBrains Mono",
                        color: "hsl(210, 40%, 98%)",
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {[
                        { fill: 'hsl(0, 100%, 50%)' },
                        { fill: 'hsl(25, 100%, 50%)' },
                        { fill: 'hsl(45, 100%, 50%)' },
                        { fill: 'hsl(155, 100%, 50%)' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Threats */}
          <Card variant="cyber" className="animate-fade-in" style={{ animationDelay: "0.8s" }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Recent Threats
                </CardTitle>
                <Link to="/threats" className="text-sm text-primary hover:underline font-mono flex items-center gap-1">
                  View All <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {threats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No threats detected yet</p>
                </div>
              ) : (
                threats.slice(0, 5).map((threat) => (
                  <div
                    key={threat.id}
                    className="p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={
                        threat.severity === 'critical' || threat.severity === 'high' ? 'danger' :
                        threat.severity === 'medium' ? 'warning' : 'info'
                      }>
                        {threat.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(threat.detected_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground group-hover:text-primary transition-colors font-mono">
                      {threat.threat_type || 'Unknown Threat'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      From: {threat.source_ip}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
