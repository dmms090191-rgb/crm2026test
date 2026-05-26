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

const FALLBACK_SYSTEM_PROMPT = `Tu es l'assistant IA du Super Admin de la plateforme Talvex. Regles strictes :
- Reponds toujours en francais.
- Sois court et professionnel (2-3 phrases maximum).
- Tu representes le Super Admin et tu reponds aux admins des societes clientes.
- N'invente JAMAIS d'informations.
- Si une information n'est pas dans ton contexte, dis que tu ne disposes pas encore de cette information et qu'un responsable reviendra vers eux.
- Sois accueillant et utile.`;

// deno-lint-ignore no-explicit-any
function buildBrainSystemPrompt(brain: any): string {
  const parts: string[] = [];

  parts.push(
    "Tu es l'assistant IA du Super Admin de la plateforme Talvex. Tu reponds aux admins des societes clientes au nom du Super Admin."
  );

  if (brain.business_context_text?.trim()) {
    parts.push(
      `=== CONTEXTE PRINCIPAL ===\n${brain.business_context_text.trim()}`
    );
  }

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

    if (brain.company_name) parts.push(`Plateforme: ${brain.company_name}`);
    if (brain.business_sector) parts.push(`Secteur: ${brain.business_sector}`);
    if (brain.company_description)
      parts.push(`Description: ${brain.company_description}`);

    const locationParts: string[] = [];
    if (brain.city) locationParts.push(brain.city);
    if (brain.country) locationParts.push(brain.country);
    if (locationParts.length > 0)
      parts.push(`Localisation: ${locationParts.join(", ")}`);

    const contactParts: string[] = [];
    if (brain.phone) contactParts.push(`Tel: ${brain.phone}`);
    if (brain.email) contactParts.push(`Email: ${brain.email}`);
    if (brain.website) contactParts.push(`Site: ${brain.website}`);
    if (contactParts.length > 0)
      parts.push(`Contact: ${contactParts.join(" | ")}`);

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
      const dayNames = [
        "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
      ];
      const horaires: string[] = [];
      for (const day of dayNames) {
        const d = brain.opening_hours[day];
        if (d && !d.closed) {
          horaires.push(`${day}: ${d.open} - ${d.close}`);
        } else if (d?.closed) {
          horaires.push(`${day}: ferme`);
        }
      }
      if (horaires.length > 0)
        parts.push(`Horaires d'ouverture:\n${horaires.join("\n")}`);
    }

    if (brain.faq?.length > 0) {
      const faqList = brain.faq
        .map(
          (f: { question: string; answer: string }) =>
            `Q: ${f.question}\nR: ${f.answer}`
        )
        .join("\n\n");
      parts.push(`FAQ:\n${faqList}`);
    }
  }

  // Knowledge sections (structured platform knowledge)
  const knowledgeSections = (brain.knowledge_sections ?? [])
    .filter((s: { content: string }) => s.content?.trim())
    .sort((a: { position: number }, b: { position: number }) => (a.position ?? 0) - (b.position ?? 0));

  if (knowledgeSections.length > 0) {
    parts.push("=== BASE DE CONNAISSANCES TALVEX ===");
    for (const sec of knowledgeSections) {
      parts.push(`--- ${sec.title} ---\n${sec.content.trim()}`);
    }
  }

  if (brain.tone) parts.push(`Instructions de ton: ${brain.tone}`);

  const rules = brain.appointment_rules;
  if (rules && rules.duration_minutes) {
    parts.push(
      `Regles de RDV: duree ${rules.duration_minutes}min, tampon ${rules.buffer_minutes}min, reservation max ${rules.max_advance_days} jours a l'avance, delai min ${rules.min_advance_hours}h, max ${rules.max_per_day} RDV/jour.`
    );
  }

  if (brain.forbidden_actions?.length > 0) {
    parts.push(
      "=== CE QUE TU NE DOIS JAMAIS FAIRE ===\n" +
        brain.forbidden_actions.map((a: string) => `- ${a}`).join("\n")
    );
  }

  if (brain.sensitive_requests?.length > 0) {
    parts.push(
      "=== DEMANDES SENSIBLES A TRANSMETTRE ===\n" +
        "Si l'admin mentionne l'un de ces sujets, reponds: \"Cette demande necessite une intervention du Super Admin. Votre message a ete transmis.\"\n" +
        "Sujets sensibles: " +
        brain.sensitive_requests.join(", ")
    );
  }

  parts.push(
    "REGLES STRICTES:\n" +
      "- N'invente JAMAIS d'informations (telephone, email, horaires, adresse, prix, services).\n" +
      "- Utilise UNIQUEMENT les informations fournies dans ton contexte ci-dessus.\n" +
      "- Si une information n'est pas dans ton contexte, dis clairement que tu ne disposes pas encore de cette information.\n" +
      "- Sois court et professionnel (2-3 phrases maximum).\n" +
      "- Si la question depasse tes competences, indique qu'un responsable reviendra vers eux."
  );

  return parts.join("\n\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

    if (!deepseekApiKey)
      return jsonResp({ error: "DEEPSEEK_API_KEY not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return jsonResp({ error: "Missing Authorization header" }, 401);

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !caller)
      return jsonResp({ error: "Unauthorized" }, 401);

    const { message_id, admin_id, super_admin_id } = await req.json();
    if (!message_id || !admin_id || !super_admin_id)
      return jsonResp(
        { error: "message_id, admin_id, super_admin_id required" },
        400
      );

    const db = createClient(supabaseUrl, serviceRoleKey);

    console.log("[sa-support-auto-reply] Processing message:", message_id);

    const { data: message, error: msgError } = await db
      .from("super_admin_messages")
      .select("*")
      .eq("id", message_id)
      .maybeSingle();

    if (msgError || !message) {
      console.log("[sa-support-auto-reply] Message not found:", message_id);
      return jsonResp({ error: "Message not found" }, 404);
    }

    if (message.sender_role !== "admin") {
      console.log("[sa-support-auto-reply] SKIP: sender_role is", message.sender_role);
      return jsonResp({ skipped: true, reason: "not_admin_message" });
    }

    if (message.is_ai_reply === true) {
      console.log("[sa-support-auto-reply] SKIP: is_ai_reply=true");
      return jsonResp({ skipped: true, reason: "is_ai_reply" });
    }

    const { data: existingReply } = await db
      .from("super_admin_messages")
      .select("id")
      .eq("replied_to_message_id", message_id)
      .eq("is_ai_reply", true)
      .maybeSingle();

    if (existingReply) {
      console.log("[sa-support-auto-reply] SKIP: already replied to", message_id);
      return jsonResp({ skipped: true, reason: "already_replied" });
    }

    const { data: adminUser } = await db.auth.admin.getUserById(admin_id);
    const companyId = adminUser?.user?.app_metadata?.company_id;
    if (!companyId) {
      console.log("[sa-support-auto-reply] SKIP: no company_id for admin", admin_id);
      return jsonResp({ skipped: true, reason: "no_company_id" });
    }

    const { data: company } = await db
      .from("companies")
      .select("sa_chat_ai_enabled")
      .eq("id", companyId)
      .maybeSingle();

    if (!company || company.sa_chat_ai_enabled !== true) {
      console.log("[sa-support-auto-reply] SKIP: sa_chat_ai_enabled=false for company", companyId);
      return jsonResp({ skipped: true, reason: "ai_disabled_for_company" });
    }

    // Load the PLATFORM brain (Cerveau IA global Talvex)
    const { data: brain } = await db
      .from("ai_company_brain")
      .select("*")
      .eq("ai_scope", "platform")
      .is("company_id", null)
      .maybeSingle();

    let systemPrompt: string;
    if (brain) {
      console.log("[sa-support-auto-reply] Platform brain found, building prompt with all fields");
      systemPrompt = buildBrainSystemPrompt(brain);
    } else {
      console.log("[sa-support-auto-reply] No platform brain — using fallback");
      systemPrompt = FALLBACK_SYSTEM_PROMPT;
    }

    const { data: history } = await db
      .from("super_admin_messages")
      .select("sender_role, content, is_ai_reply, created_at")
      .eq("admin_id", admin_id)
      .eq("super_admin_id", super_admin_id)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .limit(20);

    const conversationMessages = (history ?? [])
      .reverse()
      .map((msg: { sender_role: string; content: string }) => ({
        role: msg.sender_role === "admin" ? "user" : "assistant",
        content: msg.content,
      }));

    console.log(
      "[sa-support-auto-reply] Calling DeepSeek with",
      conversationMessages.length,
      "history messages"
    );

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
      console.error("[sa-support-auto-reply] DeepSeek error:", deepseekResponse.status, errBody);
      return jsonResp(
        { error: "DeepSeek API error", status: deepseekResponse.status },
        502
      );
    }

    const deepseekData = await deepseekResponse.json();
    const aiContent =
      deepseekData.choices?.[0]?.message?.content?.trim() ?? "";

    if (!aiContent)
      return jsonResp({ error: "Empty AI response" }, 502);

    const { error: insertError } = await db
      .from("super_admin_messages")
      .insert({
        content: aiContent,
        sender_role: "super_admin",
        admin_id,
        super_admin_id,
        is_ai_reply: true,
        ai_source: model,
        replied_to_message_id: message_id,
      });

    if (insertError) {
      console.error("[sa-support-auto-reply] Insert error:", insertError.message);
      return jsonResp({ error: "Failed to insert AI reply" }, 500);
    }

    console.log("[sa-support-auto-reply] AI reply inserted for message", message_id);
    return jsonResp({ success: true, model, content_length: aiContent.length });
  } catch (err) {
    console.error("[sa-support-auto-reply] Unexpected error:", err);
    return jsonResp({ error: String(err) }, 500);
  }
});
