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

// ── Tool definitions for DeepSeek ──

const TOOL_DEFS = [
  {
    type: "function" as const,
    function: {
      name: "get_company_context",
      description:
        "Retrieve company information: name, description, services, opening hours, FAQ. Use this to answer general questions about the company.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_available_slots",
      description:
        "Find available appointment slots for a given date range. Returns a list of free time slots.",
      parameters: {
        type: "object",
        properties: {
          start_date: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          end_date: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
        },
        required: ["start_date"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_lead_context",
      description:
        "Retrieve information about a specific lead by email or phone. Returns name, status, vendor, and recent appointments.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Lead email address" },
          phone: { type: "string", description: "Lead phone number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "send_message",
      description: "Send a message to the client via the chat system.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The message content to send",
          },
        },
        required: ["message"],
      },
    },
  },
];

// ── Tool implementations ──

interface BrainConfig {
  business_context_text: string;
  company_name: string;
  company_description: string;
  business_sector: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  language: string;
  services: { name: string; description: string; price: string }[];
  opening_hours: Record<
    string,
    { open: string; close: string; closed: boolean }
  >;
  appointment_rules: {
    duration_minutes: number;
    buffer_minutes: number;
    max_advance_days: number;
    min_advance_hours: number;
    max_per_day: number;
  };
  faq: { question: string; answer: string }[];
  official_responses: { question: string; answer: string }[];
  tone: string;
  allowed_tools: string[];
  crm_rules: {
    default_status: string;
    auto_assign_vendor: boolean;
    require_phone: boolean;
    require_email: boolean;
  };
  knowledge_sections: { key: string; title: string; content: string; position: number }[];
}

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

async function toolGetCompanyContext(brain: BrainConfig) {
  return {
    company_name: brain.company_name,
    business_sector: brain.business_sector,
    description: brain.company_description,
    city: brain.city,
    country: brain.country,
    phone: brain.phone,
    email: brain.email,
    website: brain.website,
    services: brain.services,
    opening_hours: brain.opening_hours,
    faq: brain.faq,
  };
}

async function toolGetAvailableSlots(
  brain: BrainConfig,
  db: SupabaseAdmin,
  companyId: string,
  args: { start_date?: string; end_date?: string }
) {
  const startDate = args.start_date || new Date().toISOString().split("T")[0];
  const endDate =
    args.end_date ||
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const rules = brain.appointment_rules;
  const hours = brain.opening_hours;

  const { data: existingRdv } = await db
    .from("rdv_proposals")
    .select("appointment_utc, status")
    .eq("company_id", companyId)
    .in("status", ["pending", "confirmed"])
    .gte("appointment_utc", `${startDate}T00:00:00Z`)
    .lte("appointment_utc", `${endDate}T23:59:59Z`);

  const booked = new Set(
    (existingRdv ?? []).map(
      (r: { appointment_utc: string }) =>
        r.appointment_utc?.substring(0, 16) ?? ""
    )
  );

  const dayNames = [
    "dimanche",
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
  ];
  const slots: { date: string; time: string }[] = [];
  const current = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T23:59:59Z");
  const minAdvance = new Date(
    Date.now() + rules.min_advance_hours * 3600000
  );

  while (current <= end && slots.length < 40) {
    const dayName = dayNames[current.getUTCDay()];
    const dayConfig = hours[dayName];
    if (dayConfig && !dayConfig.closed) {
      const [openH, openM] = dayConfig.open.split(":").map(Number);
      const [closeH, closeM] = dayConfig.close.split(":").map(Number);
      const slotDuration = rules.duration_minutes + rules.buffer_minutes;
      let minuteOfDay = openH * 60 + openM;
      const closeMinute = closeH * 60 + closeM;

      let dailyCount = 0;
      while (
        minuteOfDay + rules.duration_minutes <= closeMinute &&
        dailyCount < rules.max_per_day
      ) {
        const h = String(Math.floor(minuteOfDay / 60)).padStart(2, "0");
        const m = String(minuteOfDay % 60).padStart(2, "0");
        const dateStr = current.toISOString().split("T")[0];
        const slotKey = `${dateStr}T${h}:${m}`;
        const slotTime = new Date(`${slotKey}:00Z`);

        if (slotTime > minAdvance && !booked.has(slotKey)) {
          slots.push({ date: dateStr, time: `${h}:${m}` });
          dailyCount++;
        }
        minuteOfDay += slotDuration;
      }
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return { available_slots: slots, total: slots.length };
}

async function toolGetLeadContext(
  db: SupabaseAdmin,
  companyId: string,
  args: { email?: string; phone?: string }
) {
  let query = db
    .from("leads")
    .select("id, first_name, last_name, email, phone, statut, vendor_id")
    .eq("company_id", companyId);

  if (args.email) query = query.eq("email", args.email);
  else if (args.phone) query = query.eq("phone", args.phone);
  else return { error: "email or phone required" };

  const { data } = await query.maybeSingle();
  if (!data) return { found: false };

  const { data: rdvs } = await db
    .from("rdv_proposals")
    .select("appointment_utc, status, notes")
    .eq("lead_id", data.id)
    .order("appointment_utc", { ascending: false })
    .limit(5);

  return {
    found: true,
    lead: {
      name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
      email: data.email,
      phone: data.phone,
      status: data.statut,
    },
    recent_appointments: rdvs ?? [],
  };
}

// ── Backend role validation ──

async function resolveAuthorizedCompanyId(
  // deno-lint-ignore no-explicit-any
  user: any,
  requestedCompanyId: string,
  db: SupabaseAdmin
): Promise<{ companyId: string | null; error: string | null }> {
  const role = user.app_metadata?.role as string | undefined;
  const userCompanyId = user.app_metadata?.company_id as string | undefined;

  if (role === "super_admin") {
    return { companyId: requestedCompanyId, error: null };
  }

  if (role === "admin" || role === "vendor") {
    if (!userCompanyId) {
      return { companyId: null, error: "No company_id in user metadata" };
    }
    if (userCompanyId !== requestedCompanyId) {
      return { companyId: null, error: "company_id mismatch" };
    }
    return { companyId: userCompanyId, error: null };
  }

  if (role === "client") {
    const { data: reg } = await db
      .from("registrations")
      .select("company_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!reg) {
      return { companyId: null, error: "Client has no registration" };
    }
    if (reg.company_id !== requestedCompanyId) {
      return { companyId: null, error: "company_id mismatch" };
    }
    return { companyId: reg.company_id, error: null };
  }

  return { companyId: null, error: "Unknown role" };
}

// ── System prompt builder ──

function buildSystemPrompt(brain: BrainConfig): string {
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

  // PRIORITY 1b: Official responses (highest priority answers)
  if (brain.official_responses?.length > 0) {
    const respList = brain.official_responses
      .filter((r) => r.question?.trim() && r.answer?.trim())
      .map((r) => `Q: ${r.question}\nR: ${r.answer}`)
      .join("\n\n");
    if (respList) {
      parts.push(
        "=== REPONSES OFFICIELLES (PRIORITE ABSOLUE) ===\n" +
        "Quand une question correspond a l'une de ces reponses officielles, utilise EXACTEMENT la reponse fournie. " +
        "Ne reformule pas, ne modifie pas, ne complete pas avec d'autres informations.\n\n" +
        respList
      );
    }
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

    if (brain.company_name)
      parts.push(`Entreprise: ${brain.company_name}`);
    if (brain.business_sector)
      parts.push(`Secteur: ${brain.business_sector}`);
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
          (s) =>
            `- ${s.name}${s.price ? ` (${s.price})` : ""}${s.description ? `: ${s.description}` : ""}`
        )
        .join("\n");
      parts.push(`Services proposes:\n${svcList}`);
    }

    if (brain.faq?.length > 0) {
      const faqList = brain.faq
        .map((f) => `Q: ${f.question}\nR: ${f.answer}`)
        .join("\n\n");
      parts.push(`FAQ:\n${faqList}`);
    }
  }

  const rules = brain.appointment_rules;
  if (rules) {
    parts.push(
      `Regles de RDV: duree ${rules.duration_minutes}min, tampon ${rules.buffer_minutes}min, reservation max ${rules.max_advance_days} jours a l'avance, delai min ${rules.min_advance_hours}h, max ${rules.max_per_day} RDV/jour.`
    );
  }

  if (brain.opening_hours && typeof brain.opening_hours === "object") {
    const dayNames = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
    const horaires: string[] = [];
    for (const day of dayNames) {
      const d = (brain.opening_hours as Record<string, { open: string; close: string; closed: boolean }>)[day];
      if (d && !d.closed) {
        horaires.push(`${day}: ${d.open} - ${d.close}`);
      } else if (d?.closed) {
        horaires.push(`${day}: ferme`);
      }
    }
    if (horaires.length > 0) parts.push(`Horaires d'ouverture:\n${horaires.join("\n")}`);
  }

  // Knowledge sections (structured platform knowledge)
  const knowledgeSections = (brain.knowledge_sections ?? [])
    .filter((s: { content: string }) => s.content?.trim())
    .sort((a: { position: number }, b: { position: number }) => (a.position ?? 0) - (b.position ?? 0));

  if (knowledgeSections.length > 0) {
    parts.push("=== BASE DE CONNAISSANCES ===");
    for (const sec of knowledgeSections) {
      parts.push(`--- ${sec.title} ---\n${sec.content.trim()}`);
    }
  }

  if (brain.tone) parts.push(`Instructions de ton: ${brain.tone}`);

  parts.push(
    "REGLES STRICTES:\n" +
    "- N'invente JAMAIS d'informations (telephone, email, horaires, adresse, prix, services).\n" +
    "- Utilise UNIQUEMENT les informations fournies dans ton contexte ci-dessus.\n" +
    "- Si une information n'est pas dans ton contexte, dis clairement que tu ne disposes pas encore de cette information.\n" +
    "- Utilise les outils disponibles pour repondre aux questions.\n" +
    "- Ne devine pas les horaires ou disponibilites, utilise get_available_slots.\n" +
    "- Tu es en mode lecture seule: tu peux consulter et proposer, mais tu ne peux pas modifier de donnees."
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return jsonResp({ error: "Unauthorized" }, 401);

    const { company_id, messages, session_id, is_test } = await req.json();
    if (!company_id) return jsonResp({ error: "company_id is required" }, 400);
    if (!messages || !Array.isArray(messages)) return jsonResp({ error: "messages array is required" }, 400);

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Platform brain mode: Cerveau IA SA test (super_admin only)
    const isPlatformMode = company_id === "platform";

    let verifiedCompanyId: string;
    // deno-lint-ignore no-explicit-any
    let brain: any;

    if (isPlatformMode) {
      const role = user.app_metadata?.role as string | undefined;
      if (role !== "super_admin") {
        return jsonResp({ error: "Only super_admin can test platform brain" }, 403);
      }
      verifiedCompanyId = "platform";

      const { data: platformBrain } = await db
        .from("ai_company_brain")
        .select("*")
        .eq("ai_scope", "platform")
        .is("company_id", null)
        .maybeSingle();

      if (!platformBrain) return jsonResp({ error: "No platform brain configuration found" }, 404);
      brain = platformBrain;
    } else {
      const authCheck = await resolveAuthorizedCompanyId(user, company_id, db);
      if (authCheck.error || !authCheck.companyId) {
        return jsonResp({ error: authCheck.error ?? "Forbidden" }, 403);
      }
      verifiedCompanyId = authCheck.companyId;

      const { data: companyBrain } = await db
        .from("ai_company_brain")
        .select("*")
        .eq("company_id", verifiedCompanyId)
        .eq("ai_scope", "company")
        .maybeSingle();

      if (!companyBrain) return jsonResp({ error: "No brain configuration found for this company" }, 404);
      brain = companyBrain;
    }

    const brainConfig = brain as BrainConfig;
    const systemPrompt = buildSystemPrompt(brainConfig);
    const allowedTools = brainConfig.allowed_tools ?? [];

    const tools = TOOL_DEFS.filter((t) => allowedTools.includes(t.function.name));

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const sid = session_id || `session-${Date.now()}`;
    const collectedToolCalls: { name: string; input: unknown; output: unknown }[] = [];

    let iterations = 0;
    const MAX_ITERATIONS = 3;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const deepseekBody: Record<string, unknown> = {
        model: "deepseek-chat",
        messages: chatMessages,
        max_tokens: 500,
        temperature: 0.7,
      };
      if (tools.length > 0) deepseekBody.tools = tools;

      const aiResp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify(deepseekBody),
      });

      if (!aiResp.ok) {
        const errBody = await aiResp.text();
        console.error("[talvex-ai-chat] DeepSeek error:", aiResp.status, errBody);
        return jsonResp({ error: "DeepSeek API error", status: aiResp.status }, 502);
      }

      const aiData = await aiResp.json();
      const choice = aiData.choices?.[0];
      if (!choice) return jsonResp({ error: "Empty AI response" }, 502);

      const assistantMsg = choice.message;
      chatMessages.push(assistantMsg);

      if (choice.finish_reason === "tool_calls" && assistantMsg.tool_calls?.length > 0) {
        for (const tc of assistantMsg.tool_calls) {
          const fnName = tc.function.name;
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* empty */ }

          const start = Date.now();
          let result: unknown;

          if (fnName === "get_company_context") {
            result = await toolGetCompanyContext(brainConfig);
          } else if (fnName === "get_available_slots") {
            result = await toolGetAvailableSlots(brainConfig, db, verifiedCompanyId, args as { start_date?: string; end_date?: string });
          } else if (fnName === "get_lead_context") {
            result = await toolGetLeadContext(db, verifiedCompanyId, args as { email?: string; phone?: string });
          } else if (fnName === "send_message") {
            result = { sent: true, note: "V1: message display only" };
          } else {
            result = { error: `Unknown tool: ${fnName}` };
          }

          const durationMs = Date.now() - start;
          collectedToolCalls.push({ name: fnName, input: args, output: result });

          chatMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });

          await db.from("ai_tool_logs").insert({
            company_id: verifiedCompanyId,
            session_id: sid,
            tool_name: fnName,
            tool_input: args,
            tool_output: result,
            duration_ms: durationMs,
          }).then(() => {});
        }
        continue;
      }

      const reply = assistantMsg.content?.trim() ?? "";

      await db.from("ai_conversation_logs").insert([
        { company_id: verifiedCompanyId, role: "user", content: messages[messages.length - 1]?.content ?? "", is_test: is_test ?? false, session_id: sid },
        { company_id: verifiedCompanyId, role: "assistant", content: reply, tool_calls: collectedToolCalls.length > 0 ? collectedToolCalls : null, is_test: is_test ?? false, session_id: sid },
      ]).then(() => {});

      return jsonResp({ reply, tool_calls: collectedToolCalls });
    }

    const lastMsg = chatMessages[chatMessages.length - 1];
    const fallback = typeof lastMsg?.content === "string" ? lastMsg.content : "Desole, je n'ai pas pu traiter votre demande.";
    return jsonResp({ reply: fallback, tool_calls: collectedToolCalls });

  } catch (err) {
    console.error("[talvex-ai-chat] Error:", err);
    return jsonResp({ error: String(err) }, 500);
  }
});
