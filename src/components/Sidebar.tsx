import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  Mail,
  Activity,
  MessageSquare,
  Menu,
  X,
  LogOut,
  Wrench,
  ClipboardList,
  Lock,
  AlertTriangle,
  User,
  Gauge,
  Globe,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/security-score", label: "Security Score", icon: Gauge },
  { path: "/network", label: "Network Devices", icon: Wifi },
  { path: "/phishing", label: "Phishing Detection", icon: Mail },
  { path: "/threats", label: "Threat Monitoring", icon: Activity },
  { path: "/web-scanner", label: "Web Scanner", icon: Globe },
  { path: "/secure-chat", label: "Secure Chat", icon: MessageSquare },
  { path: "/security-tools", label: "Security Tools", icon: Wrench },
  { path: "/email-breach", label: "Email Breach Checker", icon: AlertTriangle },
  { path: "/ssl-checker", label: "SSL Checker", icon: Lock },
  { path: "/activity-logs", label: "Activity Logs", icon: ClipboardList },
];

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || 'user@example.com';

  return (
    <>
      {/* Mobile Toggle - Only show when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border/50 text-foreground hover:border-primary/50 transition-all"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Notification Bell - Mobile */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <NotificationCenter />
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-card/80 backdrop-blur-2xl border-r border-border/30 z-40 transition-transform duration-300 lg:translate-x-0 shadow-[4px_0_32px_rgba(0,0,0,0.3)]",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <div>
                  <h1 className="font-mono font-bold text-foreground text-lg tracking-tight">
                    CyberShield
                  </h1>
                  <p className="text-xs text-muted-foreground">Security Platform</p>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <div className="hidden lg:block">
                  <NotificationCenter />
                </div>
                {/* Close button - Mobile only */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="lg:hidden p-2 rounded-lg hover:bg-secondary/50 text-foreground transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 group",
                    isActive
                      ? "bg-primary/10 border border-primary/30 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 transition-all flex-shrink-0",
                      isActive ? "text-primary" : "group-hover:text-primary"
                    )}
                  />
                  <span className="font-mono text-sm truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-border/50">
            <Link 
              to="/profile" 
              className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <Avatar className="h-10 w-10 border border-primary/30">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-mono font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              </div>
              <User className="h-4 w-4 text-muted-foreground" />
            </Link>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 justify-start gap-2"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
