import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePipelineOverview } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const stages = [
  { key: "new", label: "Nouveau", color: "bg-muted-foreground" },
  { key: "contacted", label: "Contacté", color: "bg-blue-500" },
  { key: "qualified", label: "Qualifié", color: "bg-primary" },
  { key: "proposal", label: "Soumission", color: "bg-warning" },
  { key: "negotiation", label: "Négociation", color: "bg-orange-500" },
  { key: "won", label: "Gagné", color: "bg-success" },
] as const;

const PipelineOverview = () => {
  const { data: deals, isLoading } = usePipelineOverview();

  const stageData = stages.map((stage) => {
    const matched = (deals || []).filter((d) => d.stage === stage.key);
    const totalValue = matched.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = matched.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
    return { ...stage, count: matched.length, totalValue, weightedValue };
  });

  const maxValue = Math.max(...stageData.map((s) => s.totalValue), 1);

  return (
    <Card className="border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold font-body">Pipeline de vente</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="space-y-3">
              {stageData.map((stage) => (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0", stage.color)} />
                  <span className="text-sm text-foreground w-24 flex-shrink-0">{stage.label}</span>
                  <span className="text-xs text-muted-foreground w-6 text-center">{stage.count}</span>
                  <div className="flex-1 h-6 bg-secondary rounded-md overflow-hidden">
                    <div
                      className={cn("h-full rounded-md opacity-30", stage.color)}
                      style={{ width: `${Math.max((stage.totalValue / maxValue) * 100, 5)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-20 text-right">
                    {stage.totalValue.toLocaleString()} $
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
              <span className="text-muted-foreground">Valeur pondérée totale</span>
              <span className="font-bold text-primary">
                {stageData.reduce((s, d) => s + d.weightedValue, 0).toLocaleString("fr-CA", { maximumFractionDigits: 0 })} $
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PipelineOverview;
