import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
}

const KpiCard = React.forwardRef<HTMLDivElement, KpiCardProps>(({ title, value, change, changeType = "neutral", icon: Icon, delay = 0 }, ref) => {
  return (
    <div ref={ref} className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change && (
            <p
              className={cn(
                "text-xs font-medium mt-1",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    </div>
  );
});

KpiCard.displayName = "KpiCard";

export default KpiCard;
