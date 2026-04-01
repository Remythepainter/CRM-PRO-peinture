import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface Quote {
  id: string;
  created_at: string;
  total: number;
  status: string;
}

interface Project {
  id: string;
  created_at: string;
  budget: number;
  spent: number;
  status: string;
}

interface Props {
  quotes: Quote[];
  projects: Project[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const ClientRevenueChart = ({ quotes, projects }: Props) => {
  const data = useMemo(() => {
    const monthMap = new Map<string, { quoted: number; accepted: number; spent: number }>();

    quotes.forEach((q) => {
      const d = new Date(q.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) || { quoted: 0, accepted: 0, spent: 0 };
      entry.quoted += q.total || 0;
      if (q.status === "accepted") entry.accepted += q.total || 0;
      monthMap.set(key, entry);
    });

    projects.forEach((p) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) || { quoted: 0, accepted: 0, spent: 0 };
      entry.spent += p.spent || 0;
      monthMap.set(key, entry);
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => {
        const [y, m] = month.split("-");
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("fr-CA", { month: "short", year: "2-digit" });
        const cumQuoted = 0;
        const cumAccepted = 0;
        return { month: label, ...values };
      });
  }, [quotes, projects]);

  // Build cumulative data
  const cumulativeData = useMemo(() => {
    let cumQuoted = 0;
    let cumAccepted = 0;
    return data.map((d) => {
      cumQuoted += d.quoted;
      cumAccepted += d.accepted;
      return { ...d, cumQuoted, cumAccepted };
    });
  }, [data]);

  if (cumulativeData.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Évolution du revenu
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pr-4">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={cumulativeData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorQuoted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={35} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(value: number, name: string) => [fmt(value), name === "cumAccepted" ? "Accepté (cumulé)" : "Soumis (cumulé)"]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area type="monotone" dataKey="cumQuoted" stroke="hsl(var(--muted-foreground))" fill="url(#colorQuoted)" strokeWidth={1.5} strokeDasharray="4 3" />
            <Area type="monotone" dataKey="cumAccepted" stroke="hsl(var(--primary))" fill="url(#colorAccepted)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block rounded" /> Accepté</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-muted-foreground inline-block rounded opacity-50" style={{ borderTop: "1px dashed" }} /> Soumis</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientRevenueChart;
