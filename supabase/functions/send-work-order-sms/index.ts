import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

// Input schema — body is optional, only app_url is accepted
const BodySchema = z.object({
  app_url: z.string().url("URL invalide").max(200).optional(),
}).strict().optional();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate input
    const rawBody = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Paramètres invalides", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = parsed.data?.app_url || "https://peinturero.lovable.app";
    const today = new Date().toISOString().slice(0, 10);

    // Get today's schedule events that are not cancelled
    const { data: events, error: evErr } = await supabase
      .from("schedule_events")
      .select("id, title, crew_members, event_date, address")
      .eq("event_date", today)
      .neq("status", "cancelled");

    if (evErr) throw evErr;

    // Collect unique crew member names
    const memberNames = new Set<string>();
    for (const e of events ?? []) {
      for (const name of (e.crew_members as string[]) ?? []) {
        if (name.trim()) memberNames.add(name.trim());
      }
    }

    if (memberNames.size === 0) {
      return new Response(
        JSON.stringify({ message: "No employees scheduled today", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get team members with phone numbers
    const { data: members, error: mErr } = await supabase
      .from("team_members")
      .select("id, name, phone")
      .eq("status", "active");

    if (mErr) throw mErr;

    // Get the first Twilio phone number
    const phoneListRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
      },
    });

    if (!phoneListRes.ok) {
      const errBody = await phoneListRes.text();
      throw new Error(`Failed to get Twilio phone numbers [${phoneListRes.status}]`);
    }

    const phoneListData = await phoneListRes.json();
    const twilioFrom = phoneListData.incoming_phone_numbers?.[0]?.phone_number;
    if (!twilioFrom) throw new Error("No Twilio phone number found on account");

    const results: { name: string; status: string; error?: string }[] = [];

    for (const name of memberNames) {
      const member = (members ?? []).find(
        (m: any) => m.name.toLowerCase().trim() === name.toLowerCase().trim()
      );

      if (!member || !member.phone) {
        results.push({ name, status: "skipped", error: "No phone number" });
        continue;
      }

      const memberEvents = (events ?? []).filter((e: any) =>
        ((e.crew_members as string[]) ?? []).some(
          (c: string) => c.toLowerCase().trim() === name.toLowerCase().trim()
        )
      );

      const formUrl = `${appUrl}/work-order?member=${encodeURIComponent(member.id)}&date=${encodeURIComponent(today)}`;

      const message = `📋 Bon de travail – ${new Date().toLocaleDateString("fr-CA")}\n\nBonjour ${member.name},\n\nRemplissez votre bon de travail du jour :\n${formUrl}\n\n• Photos du travail\n• Description\n• Pauses\n• Matériel utilisé\n\nMerci!`;

      // Clean phone number
      let phone = member.phone.replace(/[\s\-\(\)\.]/g, "");
      if (!phone.startsWith("+")) {
        phone = phone.startsWith("1") ? `+${phone}` : `+1${phone}`;
      }

      try {
        const smsRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: phone,
            From: twilioFrom,
            Body: message,
          }),
        });

        const smsData = await smsRes.json();
        if (!smsRes.ok) {
          results.push({ name, status: "error", error: `Twilio ${smsRes.status}` });
        } else {
          results.push({ name, status: "sent" });
        }
      } catch (smsErr) {
        results.push({ name, status: "error", error: "Erreur d'envoi" });
      }
    }

    // Log activity
    const sentCount = results.filter((r) => r.status === "sent").length;
    await supabase.from("activity_log").insert({
      action: "sms_work_order_sent",
      entity_type: "work_order",
      entity_name: `${sentCount} SMS envoyés`,
      details: `Bons de travail envoyés à ${results.map((r) => r.name).join(", ")}`,
    });

    return new Response(
      JSON.stringify({ sent: sentCount, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-work-order-sms:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
