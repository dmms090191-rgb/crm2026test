import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const FALLBACK_SYSTEM_PROMPT = `Vous êtes l'assistant support de cette entreprise. Règles strictes :
- Répondez toujours en français.
- Soyez court et professionnel (2-3 phrases maximum).
- N'inventez JAMAIS d'informations (téléphone, email, horaires, services, prix).
- Si une information n'est pas dans votre contexte, dites que vous ne disposez pas encore de cette information.
- Ne promettez jamais de prix, contrat ou rendez-vous.
- Si la question dépasse vos compétences, indiquez qu'un conseiller humain peut reprendre la conversation.`;

// ── Build system prompt from ai_company_brain ──

// deno-lint-ignore no-explicit-any
function buildBrainSystemPrompt(brain: any): string {
  const lang = brain.language || "fr";
  const parts: string[] = [];

  if (lang === "fr") {
    parts.push("Tu es l'assistant IA de l'entreprise. Reponds toujours en francais.");
  } else if (lang === "en") {
    parts.push("You are the company's AI assistant. Always respond in English.");
  } else {
    parts.push(`Tu es l'assistant IA de l'entreprise. Reponds dans la langue: ${lang}.`);
  }

  // PRIORITY 1: Free-text business context
  if (brain.business_context_text?.trim()) {
    parts.push(
      `=== CONTEXTE PRINCIPAL DE L'ENTREPRISE ===\n${brain.business_context_text.trim()}`
    );
  }

  // PRIORITY 2: Structured fields (supplementary)
  const hasStructured =
    brain.company_name ||
    brain.business_sector ||
    brain.company_description ||
    brain.city ||
    brain.phone ||
    brain.email ||
    brain.website ||
    (brain.services?.length > 0) ||
    (brain.faq?.length > 0);

  if (hasStructured) {
    parts.push("=== INFORMATIONS COMPLEMENTAIRES ===");

    if (brain.company_name) parts.push(`Entreprise: ${brain.company_name}`);
    if (brain.business_sector) parts.push(`Secteur: ${brain.business_sector}`);
    if (brain.company_description) parts.push(`Description: ${brain.company_description}`);

    const locationParts: string[] = [];
    if (brain.city) locationParts.push(brain.city);
    if (brain.country) locationParts.push(brain.country);
    if (locationParts.length > 0) parts.push(`Localisation: ${locationParts.join(", ")}`);

    const contactParts: string[] = [];
    if (brain.phone) contactParts.push(`Tel: ${brain.phone}`);
    if (brain.email) contactParts.push(`Email: ${brain.email}`);
    if (brain.website) contactParts.push(`Site: ${brain.website}`);
    if (contactParts.length > 0) parts.push(`Contact: ${contactParts.join(" | ")}`);

    if (brain.services?.length > 0) {
      const svcList = brain.services
        .map(
          (s: { name: string; price?: string; description?: string }) =>
            `- ${s.name}${s.price ? ` (${s.price})` : ""}${s.description ? `: ${s.description}` : ""}`
        )
        .join("\n");
      parts.push(`Services proposes:\n${svcList}`);
    }

    if (brain.opening_hours && typeof brain.opening_hours === "object") {
      const dayNames = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
      const horaires: string[] = [];
      for (const day of dayNames) {
        const d = brain.opening_hours[day];
        if (d && !d.closed) {
          horaires.push(`${day}: ${d.open} - ${d.close}`);
        } else if (d?.closed) {
          horaires.push(`${day}: ferme`);
        }
      }
      if (horaires.length > 0) parts.push(`Horaires d'ouverture:\n${horaires.join("\n")}`);
    }

    if (brain.faq?.length > 0) {
      const faqList = brain.faq
        .map((f: { question: string; answer: string }) => `Q: ${f.question}\nR: ${f.answer}`)
        .join("\n\n");
      parts.push(`FAQ:\n${faqList}`);
    }
  }

  if (brain.tone) parts.push(`Instructions de ton: ${brain.tone}`);

  const rules = brain.appointment_rules;
  if (rules && rules.duration_minutes) {
    parts.push(
      `Regles de RDV: duree ${rules.duration_minutes}min, tampon ${rules.buffer_minutes}min, reservation max ${rules.max_advance_days} jours a l'avance, delai min ${rules.min_advance_hours}h, max ${rules.max_per_day} RDV/jour.`
    );
  }

  parts.push(
    "REGLES STRICTES:\n" +
    "- N'invente JAMAIS d'informations (telephone, email, horaires, adresse, prix, services).\n" +
    "- Utilise UNIQUEMENT les informations fournies dans ton contexte ci-dessus.\n" +
    "- Si une information n'est pas dans ton contexte, dis clairement que tu ne disposes pas encore de cette information.\n" +
    "- Sois court et professionnel (2-3 phrases maximum).\n" +
    "- Si la question depasse tes competences, indique qu'un conseiller humain peut reprendre la conversation."
  );

  return parts.join("\n\n");
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

    if (!deepseekApiKey) return jsonResp({ error: "DEEPSEEK_API_KEY not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "Missing Authorization header" }, 401);

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !caller) return jsonResp({ error: "Unauthorized: invalid token" }, 401);

    const { message_id } = await req.json();
    if (!message_id) return jsonResp({ error: "message_id is required" }, 400);

    const db = createClient(supabaseUrl, serviceRoleKey);

    console.log("[chat-auto-reply] Processing message_id:", message_id);

    // 1. Fetch the triggering message
    const { data: message, error: msgError } = await db
      .from("client_messages")
      .select("*")
      .eq("id", message_id)
      .maybeSingle();

    if (msgError || !message) {
      console.log("[chat-auto-reply] Message not found:", message_id);
      return jsonResp({ error: "Message not found" }, 404);
    }

    console.log("[chat-auto-reply] Message found — sender:", message.sender, "| company_id:", message.company_id);

    // 2. Anti-loop: only respond to client messages
    if (message.sender !== "client") {
      console.log("[chat-auto-reply] SKIP: sender is", message.sender);
      return jsonResp({ skipped: true, reason: "not_client_message" });
    }

    if (message.is_ai_reply === true) {
      console.log("[chat-auto-reply] SKIP: is_ai_reply=true");
      return jsonResp({ skipped: true, reason: "is_ai_reply" });
    }

    // 3. Anti-duplicate
    const { data: existingReply } = await db
      .from("client_messages")
      .select("id")
      .eq("replied_to_message_id", message_id)
      .eq("is_ai_reply", true)
      .maybeSingle();

    if (existingReply) {
      console.log("[chat-auto-reply] SKIP: already replied to", message_id);
      return jsonResp({ skipped: true, reason: "already_replied" });
    }

    // 4. Resolve company_id
    const companyId = message.company_id;
    if (!companyId) {
      console.log("[chat-auto-reply] SKIP: no company_id on message");
      return jsonResp({ skipped: true, reason: "no_company_id" });
    }

    // 5. Check per-lead AI toggle
    const clientAuthId = message.client_auth_id;
    if (!clientAuthId) {
      console.log("[chat-auto-reply] SKIP: no client_auth_id");
      return jsonResp({ skipped: true, reason: "no_client_auth_id" });
    }

    const { data: lead } = await db
      .from("leads")
      .select("ai_enabled")
      .eq("id", clientAuthId)
      .eq("company_id", companyId)
      .maybeSingle();

    console.log("[chat-auto-reply] Lead lookup — found:", !!lead, "| ai_enabled:", lead?.ai_enabled);

    if (!lead || lead.ai_enabled !== true) {
      console.log("[chat-auto-reply] SKIP: lead_ai_disabled for lead", clientAuthId);
      return jsonResp({ skipped: true, reason: "lead_ai_disabled" });
    }

    // 6. Load the company's AI Brain (Cerveau IA)
    const { data: brain } = await db
      .from("ai_company_brain")
      .select("*")
      .eq("company_id", companyId)
      .eq("ai_scope", "company")
      .maybeSingle();

    let systemPrompt: string;

    if (brain) {
      console.log("[chat-auto-reply] Brain found for company:", companyId);
      systemPrompt = buildBrainSystemPrompt(brain);
    } else {
      console.log("[chat-auto-reply] No brain found for company:", companyId, "— using fallback");

      // Fallback: try legacy chat_automation_config + context cards
      const { data: config } = await db
        .from("chat_automation_config")
        .select("system_prompt, model")
        .eq("company_id", companyId)
        .maybeSingle();

      systemPrompt = config?.system_prompt || FALLBACK_SYSTEM_PROMPT;

      const { data: contextCards } = await db
        .from("crm_context_cards")
        .select("title, content")
        .eq("company_id", companyId)
        .order("position", { ascending: true });

      if (contextCards && contextCards.length > 0) {
        const contextBlock = contextCards
          .map((c: { title: string; content: string }) => `[${c.title}]\n${c.content}`)
          .join("\n\n");
        systemPrompt += `\n\nContexte metier :\n${contextBlock}`;
      }

      systemPrompt += "\n\nREGLES STRICTES: N'invente JAMAIS d'informations. Si une information n'est pas dans ton contexte, dis que tu ne disposes pas encore de cette information.";
    }

    console.log("[chat-auto-reply] All checks passed — calling DeepSeek API");

    // 7. Load conversation history (last 20 messages)
    const { data: history } = await db
      .from("client_messages")
      .select("sender, content, is_ai_reply, created_at")
      .eq("client_auth_id", message.client_auth_id)
      .or("deleted.is.null,deleted.eq.false")
      .order("created_at", { ascending: false })
      .limit(20);

    const conversationMessages = (history ?? [])
      .reverse()
      .map((msg: { sender: string; content: string }) => ({
        role: msg.sender === "client" ? "user" : "assistant",
        content: msg.content,
      }));

    // 8. Call DeepSeek API
    const model = "deepseek-chat";

    const deepseekResponse = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationMessages,
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      }
    );

    if (!deepseekResponse.ok) {
      const errBody = await deepseekResponse.text();
      console.error("[chat-auto-reply] DeepSeek error:", deepseekResponse.status, errBody);
      return jsonResp({ error: "DeepSeek API error", status: deepseekResponse.status }, 502);
    }

    const deepseekData = await deepseekResponse.json();
    const aiContent = deepseekData.choices?.[0]?.message?.content?.trim() ?? "";

    if (!aiContent) return jsonResp({ error: "Empty AI response" }, 502);

    // 9. Insert AI reply
    const { error: insertError } = await db
      .from("client_messages")
      .insert({
        content: aiContent,
        sender: "admin",
        client_auth_id: message.client_auth_id,
        vendor_id: message.vendor_id || null,
        company_id: companyId,
        is_ai_reply: true,
        ai_source: model,
        replied_to_message_id: message_id,
      });

    if (insertError) {
      console.error("[chat-auto-reply] Insert error:", insertError.message);
      return jsonResp({ error: "Failed to insert AI reply" }, 500);
    }

    console.log("[chat-auto-reply] AI reply inserted for message", message_id);
    return jsonResp({ success: true, model, brain_used: !!brain });

  } catch (err) {
    console.error("[chat-auto-reply] Unexpected error:", err);
    return jsonResp({ error: String(err) }, 500);
  }
});
