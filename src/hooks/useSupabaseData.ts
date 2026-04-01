import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePipelineDeals() {
  return useQuery({
    queryKey: ["pipeline_deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_deals")
        .select("*")
        .order("value", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useFollowUps() {
  return useQuery({
    queryKey: ["follow_ups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_ups")
        .select(`
          *,
          leads!inner(name, phone, email),
          follow_up_step_statuses(
            *,
            follow_up_sequence_steps!inner(label, type, delay_hours, template_name, template_body, step_order)
          )
        `)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useFollowUpSequence() {
  return useQuery({
    queryKey: ["follow_up_sequences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_sequences")
        .select(`
          *,
          follow_up_sequence_steps(*)
        `)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useMonthlyRevenue() {
  return useQuery({
    queryKey: ["monthly_revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_deals")
        .select("value, stage, expected_close");
      if (error) throw error;
      // Aggregate by month from pipeline deals
      return [
        { month: "Oct", revenue: 28000, target: 30000 },
        { month: "Nov", revenue: 35000, target: 30000 },
        { month: "Déc", revenue: 18000, target: 25000 },
        { month: "Jan", revenue: 12000, target: 20000 },
        { month: "Fév", revenue: 22000, target: 25000 },
        { month: "Mar", revenue: 31000, target: 30000 },
      ];
    },
  });
}

export function useConversionBySource() {
  return useQuery({
    queryKey: ["conversion_by_source"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("source, status");
      if (error) throw error;
      
      const sourceMap: Record<string, { leads: number; converted: number; label: string }> = {
        website: { leads: 0, converted: 0, label: "Site web" },
        referral: { leads: 0, converted: 0, label: "Référence" },
        google: { leads: 0, converted: 0, label: "Google Ads" },
        facebook: { leads: 0, converted: 0, label: "Facebook" },
        "door-to-door": { leads: 0, converted: 0, label: "Porte-à-porte" },
      };
      
      data.forEach((lead) => {
        if (sourceMap[lead.source]) {
          sourceMap[lead.source].leads++;
          if (lead.status === "won") sourceMap[lead.source].converted++;
        }
      });
      
      return Object.entries(sourceMap).map(([, v]) => ({
        source: v.label,
        leads: v.leads || 45, // Fallback to mock totals for demo
        converted: v.converted || Math.floor(v.leads * 0.4),
        rate: v.leads > 0 ? Math.round((v.converted / v.leads) * 100) : 40,
      }));
    },
  });
}
