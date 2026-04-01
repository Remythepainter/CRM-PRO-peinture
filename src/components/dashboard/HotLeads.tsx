import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHotLeads } from "@/hooks/useDashboardData";
import { Flame, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const HotLeads = () => {
  const { data: hotLeads, isLoading } = useHotLeads();

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-destructive";
    if (score >= 70) return "text-primary";
    return "text-muted-foreground";
  };

  const getProjectBadge = (type: string) => {
    const map: Record<string, string> = {
      interior: "Intérieur",
      exterior: "Extérieur",
      commercial: "Commercial",
    };
    return map[type] || type;
  };

  return (
    <Card className="border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold font-body flex items-center gap-2">
          <Flame className="h-4 w-4 text-destructive" />
          Prospects chauds
        </CardTitle>
        <Link to="/leads" className="text-xs text-primary hover:underline flex items-center gap-1">
          Voir tout <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !hotLeads || hotLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Aucun lead enregistré</p>
        ) : (
          <div className="space-y-3">
            {hotLeads.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {lead.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.budget.toLocaleString()} $</p>
                </div>
                <Badge variant="outline" className="text-xs border-border">
                  {getProjectBadge(lead.project_type)}
                </Badge>
                <span className={cn("text-lg font-bold tabular-nums", getScoreColor(lead.score))}>
                  {lead.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HotLeads;
