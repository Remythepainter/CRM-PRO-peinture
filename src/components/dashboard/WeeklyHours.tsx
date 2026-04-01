import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, Users, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { generateWeeklyTimesheetPdf } from "@/components/reports/WeeklyTimesheetPdf";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const WeeklyHours = () => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ["time_entries_week"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("hours, total_cost, team_member_id, team_members(name)")
        .gte("date", weekStart.toISOString().slice(0, 10))
        .lte("date", weekEnd.toISOString().slice(0, 10));
      if (error) throw error;
      return data as { hours: number; total_cost: number; team_member_id: string | null; team_members: { name: string } | null }[];
    },
  });

  const entries = data ?? [];
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const totalCost = entries.reduce((s, e) => s + (e.total_cost || 0), 0);

  const byMember = entries.reduce((acc, e) => {
    const name = e.team_members?.name || "Non assigné";
    acc[name] = (acc[name] || 0) + e.hours;
    return acc;
  }, {} as Record<string, number>);

  const sortedMembers = Object.entries(byMember).sort((a, b) => b[1] - a[1]);

  const weekLabel = `${format(weekStart, "d", { locale: fr })} – ${format(weekEnd, "d MMM", { locale: fr })}`;

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await generateWeeklyTimesheetPdf(0);
      toast({ title: "PDF téléchargé" });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Heures cette semaine
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExportPdf} disabled={exporting} title="Exporter en PDF">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{weekLabel}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune heure enregistrée cette semaine</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-foreground">{totalHours.toFixed(1)}<span className="text-base font-normal text-muted-foreground">h</span></p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground">{fmt(totalCost)}</p>
                <p className="text-xs text-muted-foreground">coût main-d'œuvre</p>
              </div>
            </div>

            {sortedMembers.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Par membre</p>
                {sortedMembers.slice(0, 5).map(([name, hours]) => {
                  const pct = totalHours > 0 ? (hours / totalHours) * 100 : 0;
                  return (
                    <div key={name} className="space-y-0.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium truncate">{name}</span>
                        <span className="text-muted-foreground shrink-0">{hours.toFixed(1)}h</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyHours;
