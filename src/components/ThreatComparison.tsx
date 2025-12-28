import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  PieChart,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";

interface NetworkThreat {
  id: string;
  source_ip: string;
  destination: string;
  protocol: string;
  threat_type: string | null;
  severity: string;
  confidence: number | null;
  ai_analysis: string | null;
  status: string;
  detected_at: string;
}

interface ThreatComparisonProps {
  threats: NetworkThreat[];
  isLoading?: boolean;
}

interface ComparisonPeriod {
  label: string;
  days: number;
}

const periods: ComparisonPeriod[] = [
  { label: "Today vs Yesterday", days: 1 },
  { label: "This Week vs Last Week", days: 7 },
  { label: "This Month vs Last Month", days: 30 },
];

export const ThreatComparison = ({ threats, isLoading }: ThreatComparisonProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("7");
  const [isExporting, setIsExporting] = useState(false);

  const comparisonData = useMemo(() => {
    const days = parseInt(selectedPeriod);
    const now = new Date();
    
    // Current period
    const currentStart = startOfDay(subDays(now, days - 1));
    const currentEnd = endOfDay(now);
    
    // Previous period
    const previousStart = startOfDay(subDays(now, days * 2 - 1));
    const previousEnd = endOfDay(subDays(now, days));

    const currentThreats = threats.filter(t => {
      const date = new Date(t.detected_at);
      return isWithinInterval(date, { start: currentStart, end: currentEnd });
    });

    const previousThreats = threats.filter(t => {
      const date = new Date(t.detected_at);
      return isWithinInterval(date, { start: previousStart, end: previousEnd });
    });

    // Calculate stats
    const currentTotal = currentThreats.length;
    const previousTotal = previousThreats.length;
    const percentChange = previousTotal === 0 
      ? (currentTotal > 0 ? 100 : 0)
      : Math.round(((currentTotal - previousTotal) / previousTotal) * 100);

    // Severity breakdown
    const currentCritical = currentThreats.filter(t => t.severity === 'critical').length;
    const previousCritical = previousThreats.filter(t => t.severity === 'critical').length;
    const currentHigh = currentThreats.filter(t => t.severity === 'high').length;
    const previousHigh = previousThreats.filter(t => t.severity === 'high').length;
    const currentMedium = currentThreats.filter(t => t.severity === 'medium').length;
    const previousMedium = previousThreats.filter(t => t.severity === 'medium').length;
    const currentLow = currentThreats.filter(t => t.severity === 'low').length;
    const previousLow = previousThreats.filter(t => t.severity === 'low').length;

    // Threat types comparison
    const threatTypesCurrent: Record<string, number> = {};
    const threatTypesPrevious: Record<string, number> = {};

    currentThreats.forEach(t => {
      const type = t.threat_type || 'Unknown';
      threatTypesCurrent[type] = (threatTypesCurrent[type] || 0) + 1;
    });

    previousThreats.forEach(t => {
      const type = t.threat_type || 'Unknown';
      threatTypesPrevious[type] = (threatTypesPrevious[type] || 0) + 1;
    });

    // Combine all threat types
    const allTypes = new Set([...Object.keys(threatTypesCurrent), ...Object.keys(threatTypesPrevious)]);
    const threatTypesComparison = Array.from(allTypes).map(type => ({
      name: type,
      current: threatTypesCurrent[type] || 0,
      previous: threatTypesPrevious[type] || 0,
      change: (threatTypesCurrent[type] || 0) - (threatTypesPrevious[type] || 0),
    })).sort((a, b) => b.current - a.current).slice(0, 6);

    // Peak days analysis
    const dailyCounts: Record<string, number> = {};
    currentThreats.forEach(t => {
      const day = format(new Date(t.detected_at), 'EEE');
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    const peakDay = Object.entries(dailyCounts).sort((a, b) => b[1] - a[1])[0];

    // Hourly distribution
    const hourlyCounts: Record<number, number> = {};
    currentThreats.forEach(t => {
      const hour = new Date(t.detected_at).getHours();
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });

    const peakHour = Object.entries(hourlyCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      currentTotal,
      previousTotal,
      percentChange,
      severity: {
        critical: { current: currentCritical, previous: previousCritical },
        high: { current: currentHigh, previous: previousHigh },
        medium: { current: currentMedium, previous: previousMedium },
        low: { current: currentLow, previous: previousLow },
      },
      threatTypes: threatTypesComparison,
      peakDay: peakDay ? { day: peakDay[0], count: peakDay[1] } : null,
      peakHour: peakHour ? { hour: parseInt(peakHour[0]), count: peakHour[1] } : null,
      currentThreats,
      previousThreats,
    };
  }, [threats, selectedPeriod]);

  const severityChartData = [
    { name: 'Critical', current: comparisonData.severity.critical.current, previous: comparisonData.severity.critical.previous },
    { name: 'High', current: comparisonData.severity.high.current, previous: comparisonData.severity.high.previous },
    { name: 'Medium', current: comparisonData.severity.medium.current, previous: comparisonData.severity.medium.previous },
    { name: 'Low', current: comparisonData.severity.low.current, previous: comparisonData.severity.low.previous },
  ];

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4 text-destructive" />;
    if (change < 0) return <ArrowDownRight className="h-4 w-4 text-success" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-destructive';
    if (change < 0) return 'text-success';
    return 'text-muted-foreground';
  };

  const exportComparison = () => {
    setIsExporting(true);
    
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        period: `${selectedPeriod} days comparison`,
        summary: {
          currentPeriodThreats: comparisonData.currentTotal,
          previousPeriodThreats: comparisonData.previousTotal,
          percentChange: comparisonData.percentChange,
          peakDay: comparisonData.peakDay,
          peakHour: comparisonData.peakHour,
        },
        severityBreakdown: comparisonData.severity,
        threatTypesComparison: comparisonData.threatTypes,
        currentThreats: comparisonData.currentThreats,
        previousThreats: comparisonData.previousThreats,
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `threat_comparison_${selectedPeriod}days_${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-mono font-bold text-foreground">Threat Comparison</h2>
            <p className="text-sm text-muted-foreground">Analyze threat patterns over time</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[200px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Today vs Yesterday</SelectItem>
              <SelectItem value="7">This Week vs Last Week</SelectItem>
              <SelectItem value="30">This Month vs Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportComparison} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Change */}
        <Card variant="cyber">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-mono">Total Threats</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-mono font-bold">{comparisonData.currentTotal}</span>
                  <span className="text-sm text-muted-foreground">vs {comparisonData.previousTotal}</span>
                </div>
              </div>
              <div className={`flex items-center gap-1 ${getChangeColor(comparisonData.percentChange)}`}>
                {getChangeIcon(comparisonData.percentChange)}
                <span className="font-mono font-bold">{Math.abs(comparisonData.percentChange)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Threats */}
        <Card variant="danger">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-mono">Critical</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-mono font-bold text-destructive">
                    {comparisonData.severity.critical.current}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    vs {comparisonData.severity.critical.previous}
                  </span>
                </div>
              </div>
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </CardContent>
        </Card>

        {/* Peak Day */}
        <Card variant="cyber">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-mono">Peak Day</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-mono font-bold">
                    {comparisonData.peakDay?.day || '-'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {comparisonData.peakDay?.count || 0} threats
                  </span>
                </div>
              </div>
              <Calendar className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Peak Hour */}
        <Card variant="cyber">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-mono">Peak Hour</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-mono font-bold">
                    {comparisonData.peakHour ? `${comparisonData.peakHour.hour}:00` : '-'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {comparisonData.peakHour?.count || 0} threats
                  </span>
                </div>
              </div>
              <TrendingUp className="h-6 w-6 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Comparison */}
        <Card variant="cyber">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              Severity Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} barGap={4}>
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
                  <Legend />
                  <Bar dataKey="current" name="Current Period" fill="hsl(187, 100%, 42%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="previous" name="Previous Period" fill="hsl(220, 15%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Threat Types Comparison */}
        <Card variant="cyber">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-5 w-5 text-primary" />
              Threat Types Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comparisonData.threatTypes.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No threat type data available</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {comparisonData.threatTypes.map((type, index) => (
                  <div key={type.name} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-mono text-foreground truncate max-w-[150px]">
                        {type.name}
                      </span>
                      <div className={`flex items-center gap-1 ${getChangeColor(type.change)}`}>
                        {getChangeIcon(type.change)}
                        <span className="text-sm font-mono">{Math.abs(type.change)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(100, (type.current / Math.max(...comparisonData.threatTypes.map(t => t.current), 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-mono">
                        <span className="text-primary">{type.current}</span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="text-muted-foreground">{type.previous}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card variant="cyber">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                {comparisonData.percentChange > 0 ? (
                  <TrendingUp className="h-5 w-5 text-destructive" />
                ) : comparisonData.percentChange < 0 ? (
                  <TrendingDown className="h-5 w-5 text-success" />
                ) : (
                  <Minus className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-mono font-semibold">Threat Trend</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {comparisonData.percentChange > 0 
                  ? `Threats increased by ${comparisonData.percentChange}% compared to the previous period. Consider reviewing security policies.`
                  : comparisonData.percentChange < 0
                  ? `Threats decreased by ${Math.abs(comparisonData.percentChange)}%. Security measures are working effectively.`
                  : 'Threat levels remain stable compared to the previous period.'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="font-mono font-semibold">Critical Focus</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {comparisonData.severity.critical.current > comparisonData.severity.critical.previous
                  ? `Critical threats increased from ${comparisonData.severity.critical.previous} to ${comparisonData.severity.critical.current}. Immediate attention required.`
                  : comparisonData.severity.critical.current < comparisonData.severity.critical.previous
                  ? `Critical threats reduced from ${comparisonData.severity.critical.previous} to ${comparisonData.severity.critical.current}. Good progress!`
                  : `Critical threats remain at ${comparisonData.severity.critical.current}. Continue monitoring.`}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-mono font-semibold">Peak Activity</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {comparisonData.peakDay && comparisonData.peakHour
                  ? `Most threats detected on ${comparisonData.peakDay.day} around ${comparisonData.peakHour.hour}:00. Consider enhanced monitoring during these times.`
                  : 'Insufficient data to determine peak activity patterns.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};