import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Optional body: can override week offset
const OptionalBodySchema = z.object({
  weekOffset: z.number().int().min(-52).max(0).optional(),
}).optional();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse optional body
    let bodyData: z.infer<typeof OptionalBodySchema> = undefined;
    try {
      const text = await req.text();
      if (text.trim()) {
        const json = JSON.parse(text);
        const parsed = OptionalBodySchema.safeParse(json);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        bodyData = parsed.data;
      }
    } catch {
      // No body — proceed with defaults
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const weekOffset = bodyData?.weekOffset ?? -1;

    // Calculate week date range (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const targetMonday = new Date(now);
    targetMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (weekOffset * 7));
    targetMonday.setHours(0, 0, 0, 0);

    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);
    targetSunday.setHours(23, 59, 59, 999);

    const weekLabel = `${targetMonday.toLocaleDateString("fr-CA")} au ${targetSunday.toLocaleDateString("fr-CA")}`;

    // Fetch all punch records for the week
    const { data: punches, error: punchError } = await supabase
      .from("punch_records")
      .select("user_id, punch_type, punched_at, project_id, out_of_zone")
      .gte("punched_at", targetMonday.toISOString())
      .lte("punched_at", targetSunday.toISOString())
      .order("punched_at", { ascending: true });

    if (punchError) throw punchError;

    // Fetch project names
    const projectIds = [...new Set((punches || []).filter(p => p.project_id).map(p => p.project_id))];
    const projectNames: Record<string, string> = {};
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);
      projects?.forEach(p => { projectNames[p.id] = p.name; });
    }

    // Fetch team members for name mapping
    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("id, name, email, hourly_rate");

    // Group punches by user and calculate hours
    const userPunches: Record<string, typeof punches> = {};
    for (const punch of (punches || [])) {
      if (!userPunches[punch.user_id]) userPunches[punch.user_id] = [];
      userPunches[punch.user_id].push(punch);
    }

    // Try to get user emails for name matching
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const summaries: Array<{
      userId: string;
      name: string;
      totalHours: number;
      totalCost: number;
      punchCount: number;
      outOfZoneCount: number;
      projects: string[];
    }> = [];

    for (const [userId, userPunchList] of Object.entries(userPunches)) {
      let totalMs = 0;
      let lastIn: Date | null = null;
      const projectSet = new Set<string>();
      let outOfZoneCount = 0;

      for (const p of userPunchList!) {
        if (p.punch_type === "in") {
          lastIn = new Date(p.punched_at);
        } else if (p.punch_type === "out" && lastIn) {
          totalMs += new Date(p.punched_at).getTime() - lastIn.getTime();
          lastIn = null;
        }
        if (p.project_id && projectNames[p.project_id]) {
          projectSet.add(projectNames[p.project_id]);
        }
        if (p.out_of_zone) outOfZoneCount++;
      }

      const totalHours = totalMs / 3600000;
      let name = userId.substring(0, 8) + "…";
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        if (authUser?.user) {
          const email = authUser.user.email;
          const fullName = authUser.user.user_metadata?.full_name;
          if (fullName) {
            name = fullName;
          } else {
            const member = teamMembers?.find(m => m.email === email);
            if (member) name = member.name;
            else if (email) name = email;
          }
        }
      } catch {
        // Keep truncated user id
      }

      const hourlyRate = 35;
      const totalCost = totalHours * hourlyRate;

      summaries.push({
        userId,
        name,
        totalHours: Math.round(totalHours * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        punchCount: userPunchList!.length,
        outOfZoneCount,
        projects: Array.from(projectSet),
      });
    }

    summaries.sort((a, b) => b.totalHours - a.totalHours);

    const totalHoursAll = summaries.reduce((s, e) => s + e.totalHours, 0);
    const totalOutOfZone = summaries.reduce((s, e) => s + e.outOfZoneCount, 0);

    const lines = summaries.map(s => {
      const h = Math.floor(s.totalHours);
      const m = Math.round((s.totalHours % 1) * 60);
      const projectList = s.projects.length > 0 ? ` (${s.projects.join(", ")})` : "";
      const warning = s.outOfZoneCount > 0 ? ` ⚠️${s.outOfZoneCount} hors zone` : "";
      return `• ${s.name}: ${h}h${m.toString().padStart(2, "0")}${projectList}${warning}`;
    });

    const totalH = Math.floor(totalHoursAll);
    const totalM = Math.round((totalHoursAll % 1) * 60);

    const notificationMessage = [
      `Semaine du ${weekLabel}`,
      `Total: ${totalH}h${totalM.toString().padStart(2, "0")} — ${summaries.length} employé(s)`,
      totalOutOfZone > 0 ? `⚠️ ${totalOutOfZone} pointage(s) hors zone` : "",
      "",
      ...lines,
    ].filter(Boolean).join("\n");

    const adminRoles = (userRoles || []).filter(r => r.role === "admin");
    if (adminRoles.length > 0) {
      const notifications = adminRoles.map(admin => ({
        user_id: admin.user_id,
        title: `📊 Récapitulatif hebdomadaire — ${weekLabel}`,
        message: notificationMessage,
        type: "info",
        link: "/timesheets",
      }));

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Failed to insert notifications:", notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        weekLabel,
        employeeCount: summaries.length,
        totalHours: totalHoursAll,
        totalOutOfZone,
        summaries,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("weekly-timesheet-summary error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
