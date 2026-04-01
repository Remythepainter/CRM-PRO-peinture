import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

// Input schemas
const SendSmsSchema = z.object({
  action: z.literal("send-sms"),
  followUpStepStatusId: z.string().uuid("ID de statut invalide"),
  fromPhone: z.string().max(20).regex(/^\+?[0-9\s\-()]+$/, "Numéro de téléphone invalide").optional(),
});

const ProcessOverdueSchema = z.object({
  action: z.literal("process-overdue"),
});

const RequestSchema = z.discriminatedUnion("action", [
  SendSmsSchema,
  ProcessOverdueSchema,
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate input
    const rawBody = await req.json();
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Paramètres invalides", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = parsed.data;

    if (body.action === "send-sms") {
      const { data: stepStatus, error: stepError } = await supabase
        .from("follow_up_step_statuses")
        .select(`
          *,
          follow_ups!inner(
            lead_id,
            quote_value,
            leads!inner(name, phone, email)
          ),
          follow_up_sequence_steps!inner(template_body, type, label)
        `)
        .eq("id", body.followUpStepStatusId)
        .single();

      if (stepError || !stepStatus) {
        return new Response(
          JSON.stringify({ error: "Étape de suivi introuvable" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const lead = (stepStatus as any).follow_ups.leads;
      const step = (stepStatus as any).follow_up_sequence_steps;
      const quoteValue = (stepStatus as any).follow_ups.quote_value;

      const message = step.template_body
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{value\}\}/g, quoteValue.toLocaleString());

      if (step.type === "sms") {
        const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: lead.phone,
            From: body.fromPhone || "+15017122661",
            Body: message,
          }),
        });

        const twilioData = await response.json();
        if (!response.ok) {
          throw new Error(`Erreur Twilio [${response.status}]: ${JSON.stringify(twilioData)}`);
        }

        await supabase
          .from("follow_up_step_statuses")
          .update({ status: "sent", executed_at: new Date().toISOString() })
          .eq("id", body.followUpStepStatusId);

        return new Response(
          JSON.stringify({ success: true, sid: twilioData.sid, message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // email or call — mark as sent
        await supabase
          .from("follow_up_step_statuses")
          .update({ status: "sent", executed_at: new Date().toISOString() })
          .eq("id", body.followUpStepStatusId);

        return new Response(
          JSON.stringify({ success: true, type: step.type, message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (body.action === "process-overdue") {
      const { data: overdueSteps, error } = await supabase
        .from("follow_up_step_statuses")
        .select("id")
        .eq("status", "pending")
        .lt("scheduled_at", new Date().toISOString());

      if (error) throw error;

      if (overdueSteps && overdueSteps.length > 0) {
        const ids = overdueSteps.map((s) => s.id);
        await supabase
          .from("follow_up_step_statuses")
          .update({ status: "overdue" })
          .in("id", ids);
      }

      return new Response(
        JSON.stringify({ success: true, processed: overdueSteps?.length || 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Action inconnue" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
