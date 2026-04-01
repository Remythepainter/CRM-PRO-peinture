import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find overdue follow-up steps: scheduled_at < now() and status = 'pending'
    const { data: overdueSteps, error: stepsError } = await supabase
      .from("follow_up_step_statuses")
      .select(`
        id,
        scheduled_at,
        step_id,
        follow_up_id,
        follow_ups!follow_up_step_statuses_follow_up_id_fkey (
          id,
          created_by,
          lead_id,
          leads!follow_ups_lead_id_fkey ( name, email )
        ),
        follow_up_sequence_steps!follow_up_step_statuses_step_id_fkey (
          label,
          type
        )
      `)
      .eq("status", "pending")
      .lt("scheduled_at", new Date().toISOString());

    if (stepsError) throw stepsError;

    if (!overdueSteps || overdueSteps.length === 0) {
      return new Response(JSON.stringify({ message: "Aucun suivi en retard", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by created_by user to avoid duplicate notifications
    const userNotifications = new Map<string, { leads: string[]; count: number }>();

    for (const step of overdueSteps) {
      const followUp = step.follow_ups as any;
      if (!followUp?.created_by) continue;

      const userId = followUp.created_by;
      const leadName = followUp.leads?.name || "Inconnu";
      const stepLabel = (step.follow_up_sequence_steps as any)?.label || "Étape";

      const existing = userNotifications.get(userId) || { leads: [], count: 0 };
      existing.count++;
      if (!existing.leads.includes(leadName) && existing.leads.length < 5) {
        existing.leads.push(leadName);
      }
      userNotifications.set(userId, existing);
    }

    let notificationsCreated = 0;

    for (const [userId, info] of userNotifications) {
      // Check if we already sent a notification today for this user
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "warning")
        .gte("created_at", todayStart.toISOString())
        .like("title", "%suivi%retard%")
        .limit(1);

      if (existing && existing.length > 0) continue;

      const leadsList = info.leads.join(", ");
      const extra = info.count > info.leads.length ? ` et ${info.count - info.leads.length} autre(s)` : "";

      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: userId,
        title: `${info.count} suivi(s) en retard`,
        message: `Suivis en retard pour : ${leadsList}${extra}. Veuillez les traiter dès que possible.`,
        type: "warning",
        link: "/followups",
      });

      if (!notifError) notificationsCreated++;
    }

    // Also update overdue steps status to 'overdue'
    const overdueIds = overdueSteps.map((s: any) => s.id);
    await supabase
      .from("follow_up_step_statuses")
      .update({ status: "overdue" })
      .in("id", overdueIds);

    return new Response(
      JSON.stringify({
        message: "Vérification terminée",
        overdueSteps: overdueSteps.length,
        notificationsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
