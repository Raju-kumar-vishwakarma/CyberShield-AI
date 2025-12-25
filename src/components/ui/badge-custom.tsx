import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const Badge = ({ children, variant = "default", className }: BadgeProps) => {
  const variants = {
    default: "bg-secondary/80 backdrop-blur-md text-secondary-foreground",
    success: "bg-success/20 backdrop-blur-md text-success border border-success/30",
    warning: "bg-warning/20 backdrop-blur-md text-warning border border-warning/30",
    danger: "bg-destructive/20 backdrop-blur-md text-destructive border border-destructive/30",
    info: "bg-primary/20 backdrop-blur-md text-primary border border-primary/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider shadow-sm",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export { Badge };
