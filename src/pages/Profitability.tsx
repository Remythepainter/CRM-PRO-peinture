import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Loader2, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Project {
  id: string; name: string; client_name: string; status: string; budget: number; spent: number;
}

interface TimeEntry {
  project_id: string; hours: number; total_cost: number;
}

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const COLORS = ["hsl(43, 74%, 49%)", "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)", "hsl(271, 91%, 65%)", "hsl(25, 95%, 53%)"];

const Profitability = () => {
  const { isAccountant, isManager, isAdmin } = useUserRole();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes_profitability"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("total, material_cost, labor_cost, profit, margin_percent, status");
      if (error) throw error;
      return data;
    },
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["time_entries_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("time_entries").select("project_id, hours, total_cost");
      if (error) throw error;
      return data as TimeEntry[];
    },
  });

  // Aggregate time entries by project
  const laborByProject = timeEntries.reduce((acc, e) => {
    if (!acc[e.project_id]) acc[e.project_id] = { hours: 0, cost: 0 };
    acc[e.project_id].hours += e.hours;
    acc[e.project_id].cost += (e.total_cost || 0);
    return acc;
  }, {} as Record<string, { hours: number; cost: number }>);

  const totalLaborHours = timeEntries.reduce((s, e) => s + e.hours, 0);
  const totalLaborCost = timeEntries.reduce((s, e) => s + (e.total_cost || 0), 0);

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  // Use real labor cost + project spent as total expenses
  const totalSpentRaw = projects.reduce((s, p) => s + p.spent, 0);
  const totalSpent = totalSpentRaw > 0 ? totalSpentRaw : totalLaborCost;
  const totalProfit = totalBudget - totalSpent;
  const avgMargin = totalBudget > 0 ? ((totalProfit / totalBudget) * 100) : 0;

  const quotesRevenue = quotes.reduce((s, q) => s + (q.total || 0), 0);
  const quotesMaterial = quotes.reduce((s, q) => s + (q.material_cost || 0), 0);
  const quotesLabor = quotes.reduce((s, q) => s + (q.labor_cost || 0), 0);

  const projectChartData = projects
    .filter((p) => p.budget > 0)
    .slice(0, 10)
    .map((p) => {
      const labor = laborByProject[p.id]?.cost || 0;
      const realSpent = p.spent > 0 ? p.spent : labor;
      return {
        name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
        budget: p.budget,
        spent: realSpent,
        "main-d'œuvre": labor,
        profit: p.budget - realSpent,
      };
    });

  const statusDistribution = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusLabels: Record<string, string> = {
    planning: "Planification", in_progress: "En cours", on_hold: "En pause", completed: "Terminé", cancelled: "Annulé",
  };

  const pieData = Object.entries(statusDistribution).map(([key, value]) => ({
    name: statusLabels[key] || key,
    value,
  }));

  // Use real labor costs when available, fallback to quotes
  const realLabor = totalLaborCost > 0 ? totalLaborCost : quotesLabor;
  const costBreakdown = [
    { name: "Matériaux", value: quotesMaterial },
    { name: "Main-d'œuvre (réel)", value: realLabor },
    { name: "Profit", value: totalBudget > 0 ? totalBudget - quotesMaterial - realLabor : quotesRevenue - quotesMaterial - realLabor },
  ].filter((d) => d.value > 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Rentabilité
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Analyse financière des projets</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Export Actions */}
            <div className="flex justify-end mb-4">
              <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={() => {
                const csvHeader = "Projet,Client,Budget,Heures,Main-d'oeuvre,Dépenses,Profit,Marge(%)\n";
                const csvBody = projects.map(p => {
                  const labor = laborByProject[p.id] || { hours: 0, cost: 0 };
                  const realSpent = p.spent > 0 ? p.spent : labor.cost;
                  const profit = p.budget - realSpent;
                  const margin = p.budget > 0 ? (profit / p.budget) * 100 : 0;
                  return `"${p.name}","${p.client_name}",${p.budget},${labor.hours.toFixed(1)},${labor.cost},${realSpent},${profit},${margin.toFixed(1)}`;
                }).join("\n");
                const blob = new Blob([csvHeader + csvBody], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `Rapport_Rentabilite_${new Date().toISOString().split('T')[0]}.csv`);
                link.click();
              }}>
                <FileText className="w-4 h-4" />
                Exporter CSV pour QuickBooks
              </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-border/50"><CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Revenus totaux</p>
                <p className="text-2xl font-bold text-foreground">{fmt(totalBudget)}</p>
              </CardContent></Card>
              <Card className="border-border/50"><CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Dépenses</p>
                <p className="text-2xl font-bold text-foreground">{fmt(totalSpent)}</p>
              </CardContent></Card>
              <Card className="border-border/50"><CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Profit net</p>
                <p className={cn("text-2xl font-bold", totalProfit >= 0 ? "text-success" : "text-destructive")}>{fmt(totalProfit)}</p>
              </CardContent></Card>
              <Card className="border-border/50"><CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Main-d'œuvre réelle</p>
                <p className="text-2xl font-bold text-foreground">{fmt(totalLaborCost)}</p>
                <p className="text-xs text-muted-foreground">{totalLaborHours.toFixed(1)}h enregistrées</p>
              </CardContent></Card>
              <Card className="border-border/50"><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Marge moyenne</p>
                <p className={cn("text-2xl font-bold", avgMargin >= 30 ? "text-success" : avgMargin >= 15 ? "text-warning" : "text-destructive")}>{avgMargin.toFixed(1)}%</p>
              </CardContent></Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-lg">Budget vs Dépenses par projet</CardTitle></CardHeader>
                <CardContent>
                  {projectChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={projectChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                          formatter={(value: number) => fmt(value)}
                        />
                        <Bar dataKey="budget" fill="hsl(43, 74%, 49%)" name="Budget" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="spent" fill="hsl(217, 91%, 60%)" name="Dépensé" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="main-d'œuvre" fill="hsl(142, 71%, 45%)" name="Main-d'œuvre" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-12">Ajoutez des projets avec un budget pour voir le graphique</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-lg">Répartition des coûts (soumissions)</CardTitle></CardHeader>
                <CardContent>
                  {costBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {costBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} formatter={(value: number) => fmt(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-12">Créez des soumissions pour voir la répartition</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Project table */}
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-lg">Détail par projet</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {projects.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Projet</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Client</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Budget</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Heures</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Main-d'œuvre</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Matériel & Divers</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Dépenses tot.</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Profit</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Marge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p) => {
                        const labor = laborByProject[p.id] || { hours: 0, cost: 0 };
                        // Calculate non-labor expenses
                        const otherExpenses = p.spent > 0 ? p.spent : 0;
                        const realSpent = otherExpenses + labor.cost;
                        const profit = p.budget - realSpent;
                        const margin = p.budget > 0 ? (profit / p.budget) * 100 : 0;
                        return (
                          <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30">
                            <td className="py-2.5 px-3 font-medium text-foreground">{p.name}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{p.client_name}</td>
                            <td className="py-2.5 px-3 text-right">{fmt(p.budget)}</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">{labor.hours > 0 ? `${labor.hours.toFixed(1)}h` : "—"}</td>
                            <td className="py-2.5 px-3 text-right">{labor.cost > 0 ? fmt(labor.cost) : "—"}</td>
                            <td className="py-2.5 px-3 text-right">{otherExpenses > 0 ? fmt(otherExpenses) : "—"}</td>
                            <td className="py-2.5 px-3 text-right font-medium">{realSpent > 0 ? fmt(realSpent) : "—"}</td>
                            <td className={cn("py-2.5 px-3 text-right font-medium", profit >= 0 ? "text-success" : "text-destructive")}>{fmt(profit)}</td>
                            <td className={cn("py-2.5 px-3 text-right font-medium", margin >= 30 ? "text-success" : margin >= 15 ? "text-warning" : "text-destructive")}>{margin.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">Aucun projet</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Profitability;
