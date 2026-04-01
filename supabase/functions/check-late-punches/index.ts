import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This function accepts an optional body — validate if present
const OptionalBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)").optional(),
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
      // No body or invalid JSON — proceed with defaults
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get today's date in Eastern Time (Quebec)
    const now = new Date();
    const eastern = bodyData?.date || new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Montreal",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const todayStart = `${eastern}T00:00:00-04:00`;
    const todayEnd = `${eastern}T23:59:59-04:00`;

    // Get all employees (users with 'employee' role)
    const { data: employeeRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "employee");

    if (rolesError) throw rolesError;
    if (!employeeRoles || employeeRoles.length === 0) {
      return new Response(
        JSON.stringify({ message: "Aucun employé trouvé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const employeeUserIds = employeeRoles.map((r: any) => r.user_id);

    // Get today's punch-in records
    const { data: todayPunches, error: punchError } = await supabase
      .from("punch_records")
      .select("user_id")
      .eq("punch_type", "in")
      .gte("punched_at", todayStart)
      .lte("punched_at", todayEnd);

    if (punchError) throw punchError;

    const punchedUserIds = new Set(
      (todayPunches || []).map((p: any) => p.user_id)
    );

    // Find employees who haven't punched in
    const lateEmployees = employeeUserIds.filter(
      (id: string) => !punchedUserIds.has(id)
    );

    if (lateEmployees.length === 0) {
      return new Response(
        JSON.stringify({ message: "Tous les employés ont punché à temps" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get late employees' emails for the notification message
    const { data: lateUsers, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const lateUserDetails = (lateUsers?.users || [])
      .filter((u: any) => lateEmployees.includes(u.id))
      .map((u: any) => u.user_metadata?.full_name || u.email || u.id);

    // Get all admin user IDs
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) throw adminError;

    // Create notifications for each admin
    const notifications = (adminRoles || []).map((admin: any) => ({
      user_id: admin.user_id,
      title: "⚠️ Pointage en retard",
      message: `${lateUserDetails.length} employé(s) n'ont pas punché avant 9h : ${lateUserDetails.join(", ")}`,
      type: "warning",
      link: "/punch",
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);
      if (notifError) throw notifError;
    }

    return new Response(
      JSON.stringify({
        message: `${lateUserDetails.length} employé(s) en retard notifié(s) aux admins`,
        lateEmployees: lateUserDetails,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking late punches:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
