import { Layout } from "@/components/Layout";
import { PasswordSecurityTool, IPGeolocationTool, AIThreatIntelligence } from "@/components/SecurityTools";
import { ReportExport } from "@/components/ReportExport";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Brain,
  Sparkles,
  MessageSquare,
  Search,
  Mail,
  Globe,
  Network,
  Lock
} from "lucide-react";

const aiTools = [
  {
    name: "Threat Intelligence",
    description: "AI-powered threat analysis and risk assessment",
    icon: Brain,
    model: "Gemini 2.5 Flash"
  },
  {
    name: "Phishing Detection",
    description: "Smart email and message phishing analyzer",
    icon: Mail,
    model: "Gemini 2.5 Flash"
  },
  {
    name: "Network Threat Analysis",
    description: "Real-time traffic pattern analysis",
    icon: Network,
    model: "Gemini 2.5 Flash"
  },
  {
    name: "Domain Reputation",
    description: "Website security and reputation checker",
    icon: Globe,
    model: "Gemini 2.5 Flash"
  },
  {
    name: "Secure AI Chat",
    description: "Cybersecurity assistant powered by AI",
    icon: MessageSquare,
    model: "Gemini 2.5 Flash"
  },
  {
    name: "IP Intelligence",
    description: "Geolocation and threat scoring for IPs",
    icon: Search,
    model: "Gemini 2.5 Flash"
  },
  {
    name: "SSL/TLS Analysis",
    description: "Certificate and security header analysis",
    icon: Lock,
    model: "Gemini 2.5 Flash"
  },
  {
    name: "Email Breach Check",
    description: "Data breach detection for email addresses",
    icon: Shield,
    model: "Gemini 2.5 Flash"
  }
];

const SecurityToolsPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl lg:text-3xl font-mono font-bold text-foreground mb-2">
              Security Tools
            </h1>
            <p className="text-muted-foreground">
              AI-powered security analysis, password tools, and threat intelligence
            </p>
          </div>
          <ReportExport />
        </div>

        {/* Google AI Integration Banner */}
        <Card className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-primary/20 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  Google AI Tools Integrated
                  <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
                    Gemini 2.5
                  </Badge>
                </h2>
                <p className="text-muted-foreground text-sm">
                  Powered by Google's latest Gemini AI models for advanced security analysis
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {aiTools.map((tool, index) => (
                <div
                  key={tool.name}
                  className="group flex flex-col items-center p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 hover:bg-background/80 transition-all duration-300 cursor-default"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors mb-2">
                    <tool.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-foreground text-center leading-tight">
                    {tool.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Password Security Tool */}
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <PasswordSecurityTool />
          </div>

          {/* IP Geolocation */}
          <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <IPGeolocationTool />
          </div>

          {/* AI Threat Intelligence - Full Width */}
          <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <AIThreatIntelligence />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SecurityToolsPage;
