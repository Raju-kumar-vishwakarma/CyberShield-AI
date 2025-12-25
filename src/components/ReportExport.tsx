import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge-custom";
import { Download, FileText, Table, Loader2, Calendar, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReportExportProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const ReportExport = ({ variant = "outline", size = "default" }: ReportExportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportType, setReportType] = useState("threats");
  const [dateRange, setDateRange] = useState("7days");
  const [format, setFormat] = useState("csv");
  const { toast } = useToast();

  const exportReport = async () => {
    setIsExporting(true);

    try {
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      switch (dateRange) {
        case "24hours":
          startDate.setHours(startDate.getHours() - 24);
          break;
        case "7days":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30days":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90days":
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      let data: any[] = [];
      let filename = "";

      if (reportType === "threats") {
        const { data: threats, error } = await supabase
          .from("network_threats")
          .select("*")
          .gte("detected_at", startDate.toISOString())
          .order("detected_at", { ascending: false });

        if (error) throw error;
        data = threats || [];
        filename = `threat_report_${dateRange}`;
      } else if (reportType === "phishing") {
        const { data: scans, error } = await supabase
          .from("phishing_scans")
          .select("*")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false });

        if (error) throw error;
        data = scans || [];
        filename = `phishing_report_${dateRange}`;
      } else if (reportType === "ips") {
        const { data: ips, error } = await supabase
          .from("suspicious_ips")
          .select("*")
          .order("last_seen", { ascending: false });

        if (error) throw error;
        data = ips || [];
        filename = `suspicious_ips_${dateRange}`;
      }

      if (data.length === 0) {
        toast({
          title: "No Data",
          description: "No records found for the selected criteria.",
          variant: "destructive",
        });
        return;
      }

      if (format === "csv") {
        // Convert to CSV
        const headers = Object.keys(data[0]).join(",");
        const rows = data.map((row) =>
          Object.values(row)
            .map((val) => {
              if (typeof val === "object") return JSON.stringify(val);
              if (typeof val === "string" && val.includes(",")) return `"${val}"`;
              return val;
            })
            .join(",")
        );
        const csv = [headers, ...rows].join("\n");

        // Download
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "json") {
        // Download JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Export Complete",
        description: `Exported ${data.length} records to ${format.toUpperCase()}`,
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Export Security Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Report Type */}
          <div className="space-y-2">
            <label className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Report Type
            </label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="threats">Network Threats</SelectItem>
                <SelectItem value="phishing">Phishing Scans</SelectItem>
                <SelectItem value="ips">Suspicious IPs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24hours">Last 24 Hours</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <label className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Table className="h-4 w-4" />
              Format
            </label>
            <div className="flex gap-2">
              <Button
                variant={format === "csv" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("csv")}
                className="flex-1"
              >
                <Table className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant={format === "json" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("json")}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>

          {/* Export Button */}
          <Button onClick={exportReport} disabled={isExporting} className="w-full">
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
