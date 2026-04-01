import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConversionBySource, type DashboardPeriod } from "@/hooks/useDashboardData";
import { Loader2 } from "lucide-react";

const ConversionChart = ({ period = "month" }: { period?: DashboardPeriod }) => {
  const { data, isLoading } = useConversionBySource(period);
  const maxRate = data && data.length > 0 ? Math.max(...data.map((s) => s.rate), 1) : 1;

  return (
    <Card className="border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold font-body">Taux de conversion par source</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-20">Aucun lead enregistré</p>
        ) : (
          <div className="space-y-4">
            {data.map((item) => (
              <div key={item.source} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">{item.source}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">{item.converted}/{item.leads}</span>
                    <span className="font-semibold text-foreground">{item.rate}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full gold-gradient transition-all duration-700"
                    style={{ width: `${(item.rate / maxRate) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversionChart;
