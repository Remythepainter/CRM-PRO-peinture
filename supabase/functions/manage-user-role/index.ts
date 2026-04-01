import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input schemas
const ListSchema = z.object({
  action: z.literal("list"),
});

const ResetPasswordSchema = z.object({
  action: z.literal("reset_password"),
  targetUserId: z.string().uuid("ID utilisateur invalide"),
});

const UpdateRoleSchema = z.object({
  action: z.literal("update_role"),
  targetUserId: z.string().uuid("ID utilisateur invalide"),
  newRole: z.enum(["admin", "manager", "employee"], { message: "Rôle invalide" }),
});

const RequestSchema = z.discriminatedUnion("action", [
  ListSchema,
  ResetPasswordSchema,
  UpdateRoleSchema,
]);

// In-memory rate limiter: max 10 mutating actions per admin per 60s window
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is admin
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (callerRole?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate input
    const rawBody = await req.json();
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Paramètres invalides", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = parsed.data;

    // Rate limit mutating actions
    if (body.action !== "list") {
      if (!checkRateLimit(caller.id)) {
        return new Response(JSON.stringify({ error: "Trop de requêtes. Réessayez dans une minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (body.action === "list") {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
      const latestRoles = new Map<string, string>();

      [...(roles ?? [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .forEach((entry) => {
          if (!latestRoles.has(entry.user_id)) {
            latestRoles.set(entry.user_id, entry.role);
          }
        });

      const result = users.users.map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || "",
        role: latestRoles.get(u.id) || "employee",
        created_at: u.created_at,
      }));

      return new Response(JSON.stringify({ users: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "reset_password") {
      const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(body.targetUserId);
      if (getUserError || !targetUser?.user?.email) {
        return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: targetUser.user.email,
      });

      if (linkError) throw linkError;

      return new Response(JSON.stringify({ success: true, email: targetUser.user.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "update_role") {
      if (body.targetUserId === caller.id) {
        return new Response(JSON.stringify({ error: "Vous ne pouvez pas modifier votre propre rôle" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", body.targetUserId);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: body.targetUserId, role: body.newRole });
      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-user-role error:", err);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
