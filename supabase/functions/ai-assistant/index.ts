import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.union([
    z.string().max(50000),
    z.array(z.object({
      type: z.string(),
    }).passthrough()),
  ]),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(100),
});

const SYSTEM_PROMPT = `Tu es l'assistant IA intégré à l'application de gestion PRO Peinture Rémy Ouellette. Tu réponds TOUJOURS en français québécois professionnel.

L'application est un CRM/ERP pour une entreprise de peinture commerciale et résidentielle au Québec. Voici les fonctionnalités :

📊 **Tableau de bord** — Vue d'ensemble : KPIs (revenus, soumissions, taux conversion), heures de la semaine, prospects chauds.

👥 **Prospects** — Gestion des prospects : nom, courriel, téléphone, adresse, type de projet (intérieur/extérieur/commercial), source, urgence, score. Statuts : nouveau, contacté, qualifié, soumission envoyée, gagné, perdu.

📈 **Pipeline** — Entonnoir de vente : étapes (nouveau → contact → visite → soumission → négociation → gagné/perdu), valeur des deals, probabilité de fermeture.

📄 **Soumissions** — Création de soumissions avec items de ligne, calcul de marge, taxes TPS/TVQ, modèles (intérieur, extérieur, commercial, résidentiel), export PDF.

🔄 **Suivis** — Séquences de relance automatisées par courriel/SMS avec étapes programmées.

📅 **Calendrier** — Planification des événements, travaux, visites avec assignation d'équipe.

🏗 **Projets** — Suivi de projets : budget, dépenses, dates, notes, photos, enregistrements vocaux transcrits, suivi des heures.

📦 **Inventaire** — Gestion du stock : peinture, outils, matériaux avec alertes de stock bas.

💰 **Rentabilité** — Analyse de la profitabilité par projet : revenus vs dépenses, marges, coûts de main-d'œuvre.

👷 **Équipe** — Gestion des membres : taux horaire (avec centimes), taux CCQ (commercial, résidentiel léger, résidentiel lourd), DAS employeur, postes personnalisables.

⚙️ **Paramètres** — Profil, infos entreprise, logo, numéros de taxes, licence RBQ, gestion des rôles (admin/employé).

🎨 **Personnalisation** — Couleurs, taille de police, sections visibles, thème global ou par utilisateur.

Règles :
- Sois concis et pratique
- Utilise des emojis pour la clarté
- Donne des exemples concrets liés à la peinture quand pertinent
- Si on te demande comment faire quelque chose, donne les étapes précises dans l'app
- Ne parle JAMAIS en anglais sauf pour les termes techniques sans équivalent français`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = parsed.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes. Réessayez dans un instant." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
