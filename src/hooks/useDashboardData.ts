import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format, subQuarters, subYears } from "date-fns";
import { fr } from "date-fns/locale";

export type DashboardPeriod = "month" | "quarter" | "year";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

function getPeriodRange(period: DashboardPeriod) {
  const now = new Date();
  switch (period) {
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        prevStart: startOfMonth(subMonths(now, 1)),
        prevEnd: endOfMonth(subMonths(now, 1)),
        label: "vs mois dernier",
      };
    case "quarter":
      return {
        start: startOfQuarter(now),
        end: endOfQuarter(now),
        prevStart: startOfQuarter(subQuarters(now, 1)),
        prevEnd: endOfQuarter(subQuarters(now, 1)),
        label: "vs trimestre dernier",
      };
    case "year":
      return {
        start: startOfYear(now),
        end: endOfYear(now),
        prevStart: startOfYear(subYears(now, 1)),
        prevEnd: endOfYear(subYears(now, 1)),
        label: "vs année dernière",
      };
  }
}

export function useMonthlyRevenue(period: DashboardPeriod = "month") {
  return useQuery({
    queryKey: ["kpi_monthly_revenue", period],
    queryFn: async () => {
      const r = getPeriodRange(period);
      const monthStart = r.start.toISOString();
      const monthEnd = r.end.toISOString();
      const prevMonthStart = r.prevStart.toISOString();
      const prevMonthEnd = r.prevEnd.toISOString();

      const [{ data: currentDeals }, { data: prevDeals }, { data: currentQuotes }, { data: prevQuotes }] =
        await Promise.all([
          supabase.from("pipeline_deals").select("value").eq("stage", "won").gte("updated_at", monthStart).lte("updated_at", monthEnd),
          supabase.from("pipeline_deals").select("value").eq("stage", "won").gte("updated_at", prevMonthStart).lte("updated_at", prevMonthEnd),
          supabase.from("quotes").select("total").eq("status", "accepted").gte("updated_at", monthStart).lte("updated_at", monthEnd),
          supabase.from("quotes").select("total").eq("status", "accepted").gte("updated_at", prevMonthStart).lte("updated_at", prevMonthEnd),
        ]);

      const currentTotal =
        (currentDeals?.reduce((s, d) => s + d.value, 0) || 0) +
        (currentQuotes?.reduce((s, q) => s + q.total, 0) || 0);
      const prevTotal =
        (prevDeals?.reduce((s, d) => s + d.value, 0) || 0) +
        (prevQuotes?.reduce((s, q) => s + q.total, 0) || 0);

      const pctChange = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0;

      return {
        value: fmt(currentTotal),
        change: prevTotal > 0 ? `${pctChange >= 0 ? "+" : ""}${pctChange}% ${r.label}` : "Nouvelle période",
        changeType: pctChange >= 0 ? "positive" as const : "negative" as const,
      };
    },
  });
}

export function usePipelineValue(period: DashboardPeriod = "month") {
  return useQuery({
    queryKey: ["kpi_pipeline_value", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipeline_deals")
        .select("value, stage")
        .not("stage", "in", "(won,lost)");

      const deals = data || [];
      const totalValue = deals.reduce((s, d) => s + d.value, 0);

      return {
        value: fmt(totalValue),
        change: `${deals.length} opportunité${deals.length > 1 ? "s" : ""} active${deals.length > 1 ? "s" : ""}`,
        changeType: "neutral" as const,
      };
    },
  });
}

export function useConversionRate(period: DashboardPeriod = "month") {
  return useQuery({
    queryKey: ["kpi_conversion_rate", period],
    queryFn: async () => {
      const r = getPeriodRange(period);
      const start = r.start.toISOString();
      const end = r.end.toISOString();

      const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start)
        .lte("created_at", end);

      const { count: wonLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "won")
        .gte("created_at", start)
        .lte("created_at", end);

      const rate = totalLeads && totalLeads > 0 ? Math.round(((wonLeads || 0) / totalLeads) * 100) : 0;

      return {
        value: `${rate}%`,
        change: `${wonLeads || 0} sur ${totalLeads || 0} leads`,
        changeType: rate >= 30 ? "positive" as const : "neutral" as const,
      };
    },
  });
}

export function useClosingTime(period: DashboardPeriod = "month") {
  return useQuery({
    queryKey: ["kpi_closing_time", period],
    queryFn: async () => {
      const r = getPeriodRange(period);
      const { data } = await supabase
        .from("pipeline_deals")
        .select("created_at, updated_at")
        .eq("stage", "won")
        .gte("updated_at", r.start.toISOString())
        .lte("updated_at", r.end.toISOString());

      if (!data || data.length === 0) {
        return { value: "—", change: "Aucune vente conclue", changeType: "neutral" as const };
      }

      const days = data.map((d) => {
        const diff = new Date(d.updated_at).getTime() - new Date(d.created_at).getTime();
        return diff / (1000 * 60 * 60 * 24);
      });
      const avg = Math.round(days.reduce((s, d) => s + d, 0) / days.length);

      return {
        value: `${avg} jours`,
        change: `Moyenne sur ${data.length} vente${data.length > 1 ? "s" : ""}`,
        changeType: avg <= 14 ? "positive" as const : "neutral" as const,
      };
    },
  });
}

export function useRevenueChartData(period: DashboardPeriod = "month") {
  return useQuery({
    queryKey: ["chart_revenue_6m", period],
    queryFn: async () => {
      const now = new Date();
      const count = period === "year" ? 12 : 6;
      const months = [];
      for (let i = count - 1; i >= 0; i--) {
        const d = subMonths(now, i);
        months.push({
          date: d,
          label: format(d, "MMM", { locale: fr }),
          start: startOfMonth(d).toISOString(),
          end: endOfMonth(d).toISOString(),
        });
      }

      const results = await Promise.all(
        months.map(async (m) => {
          const [{ data: deals }, { data: quotes }] = await Promise.all([
            supabase.from("pipeline_deals").select("value").eq("stage", "won").gte("updated_at", m.start).lte("updated_at", m.end),
            supabase.from("quotes").select("total").eq("status", "accepted").gte("updated_at", m.start).lte("updated_at", m.end),
          ]);

          const revenue =
            (deals?.reduce((s, d) => s + d.value, 0) || 0) +
            (quotes?.reduce((s, q) => s + q.total, 0) || 0);

          return { month: m.label.charAt(0).toUpperCase() + m.label.slice(1), revenue };
        })
      );

      return results;
    },
  });
}

export function useConversionBySource(period: DashboardPeriod = "month") {
  return useQuery({
    queryKey: ["chart_conversion_source", period],
    queryFn: async () => {
      const r = getPeriodRange(period);
      const { data: allLeads } = await supabase
        .from("leads")
        .select("source, status")
        .gte("created_at", r.start.toISOString())
        .lte("created_at", r.end.toISOString());
      if (!allLeads || allLeads.length === 0) return [];

      const sourceLabels: Record<string, string> = {
        website: "Site web",
        referral: "Référence",
        google: "Google Ads",
        facebook: "Facebook",
        "door-to-door": "Porte-à-porte",
      };

      const grouped = allLeads.reduce((acc, l) => {
        const src = l.source;
        if (!acc[src]) acc[src] = { total: 0, won: 0 };
        acc[src].total++;
        if (l.status === "won") acc[src].won++;
        return acc;
      }, {} as Record<string, { total: number; won: number }>);

      return Object.entries(grouped)
        .map(([source, { total, won }]) => ({
          source: sourceLabels[source] || source,
          leads: total,
          converted: won,
          rate: total > 0 ? Math.round((won / total) * 100) : 0,
        }))
        .sort((a, b) => b.rate - a.rate);
    },
  });
}

export function usePipelineOverview() {
  return useQuery({
    queryKey: ["chart_pipeline_overview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipeline_deals")
        .select("stage, value, probability");
      return data || [];
    },
  });
}

export function useHotLeads() {
  return useQuery({
    queryKey: ["dashboard_hot_leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name, email, budget, score, project_type, status")
        .order("score", { ascending: false })
        .limit(5);
      return data || [];
    },
  });
}
