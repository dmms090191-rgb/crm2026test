import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_SYSTEM_PROMPT = `Vous êtes l'assistant support Talvex. Règles strictes :
- Répondez toujours en français.
- Soyez court et professionnel (2-3 phrases maximum).
- N'inventez jamais d'informations.
- Ne promettez jamais de prix, contrat ou rendez-vous.
- Si la question dépasse vos compétences, indiquez qu'un conseiller humain peut reprendre la conversation.
- Terminez toujours en mentionnant qu'un conseiller est disponible si besoin.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({ error: "DEEPSEEK_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { message_id } = await req.json();
    if (!message_id) {
      return new Response(
        JSON.stringify({ error: "message_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    console.log("[chat-auto-reply] Processing message_id:", message_id);

    // 1. Fetch the triggering message
    const { data: message, error: msgError } = await supabaseAdmin
      .from("client_messages")
      .select("*")
      .eq("id", message_id)
      .maybeSingle();

    if (msgError || !message) {
      console.log("[chat-auto-reply] Message not found:", message_id, msgError?.message);
      return new Response(
        JSON.stringify({ error: "Message not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[chat-auto-reply] Message found — sender:", message.sender, "| company_id:", message.company_id, "| client_auth_id:", message.client_auth_id, "| is_ai_reply:", message.is_ai_reply);

    // 2. Anti-loop: only respond to client messages that are not AI-generated
    if (message.sender !== "client") {
      console.log("[chat-auto-reply] SKIP: sender is", message.sender);
      return new Response(
        JSON.stringify({ skipped: true, reason: "not_client_message" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (message.is_ai_reply === true) {
      console.log("[chat-auto-reply] SKIP: is_ai_reply=true");
      return new Response(
        JSON.stringify({ skipped: true, reason: "is_ai_reply" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Anti-duplicate: check if we already replied to this message
    const { data: existingReply } = await supabaseAdmin
      .from("client_messages")
      .select("id")
      .eq("replied_to_message_id", message_id)
      .eq("is_ai_reply", true)
      .maybeSingle();

    if (existingReply) {
      console.log("[chat-auto-reply] SKIP: already replied to", message_id);
      return new Response(
        JSON.stringify({ skipped: true, reason: "already_replied" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Check company_id
    const companyId = message.company_id;
    if (!companyId) {
      console.log("[chat-auto-reply] SKIP: no company_id on message");
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_company_id" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Load optional config for system_prompt / model (not used as gate)
    const { data: config } = await supabaseAdmin
      .from("chat_automation_config")
      .select("system_prompt, model")
      .eq("company_id", companyId)
      .maybeSingle();

    // 6. Check per-lead AI toggle — sole source of truth
    const clientAuthId = message.client_auth_id;
    if (!clientAuthId) {
      console.log("[chat-auto-reply] SKIP: no client_auth_id");
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_client_auth_id" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("ai_enabled")
      .eq("id", clientAuthId)
      .eq("company_id", companyId)
      .maybeSingle();

    console.log("[chat-auto-reply] Lead lookup — found:", !!lead, "| ai_enabled:", lead?.ai_enabled, "| error:", leadError?.message ?? "none");

    if (!lead || lead.ai_enabled !== true) {
      console.log("[chat-auto-reply] SKIP: lead_ai_disabled for lead", clientAuthId);
      return new Response(
        JSON.stringify({ skipped: true, reason: "lead_ai_disabled" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[chat-auto-reply] All checks passed — calling DeepSeek API");

    // 6. Load conversation history (last 20 messages for context)
    const { data: history } = await supabaseAdmin
      .from("client_messages")
      .select("sender, content, is_ai_reply, created_at")
      .eq("client_auth_id", message.client_auth_id)
      .or("deleted.is.null,deleted.eq.false")
      .order("created_at", { ascending: false })
      .limit(20);

    const conversationMessages = (history ?? [])
      .reverse()
      .map((msg: { sender: string; content: string; is_ai_reply: boolean }) => ({
        role: msg.sender === "client" ? "user" : "assistant",
        content: msg.content,
      }));

    // 7. Load context cards for richer system prompt
    const { data: contextCards } = await supabaseAdmin
      .from("crm_context_cards")
      .select("title, content")
      .eq("company_id", companyId)
      .order("position", { ascending: true });

    let systemPrompt = config?.system_prompt || DEFAULT_SYSTEM_PROMPT;

    if (contextCards && contextCards.length > 0) {
      const contextBlock = contextCards
        .map(
          (c: { title: string; content: string }) =>
            `[${c.title}]\n${c.content}`
        )
        .join("\n\n");
      systemPrompt += `\n\nContexte métier :\n${contextBlock}`;
    }

    // 8. Call DeepSeek API
    const model = config?.model || "deepseek-chat";

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
      console.error("[chat-auto-reply] DeepSeek API error (status " + deepseekResponse.status + "):", errBody);
      return new Response(
        JSON.stringify({
          error: "DeepSeek API error",
          status: deepseekResponse.status,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const deepseekData = await deepseekResponse.json();
    const aiContent =
      deepseekData.choices?.[0]?.message?.content?.trim() ?? "";

    if (!aiContent) {
      return new Response(
        JSON.stringify({ error: "Empty AI response" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 9. Insert AI reply into client_messages
    const { error: insertError } = await supabaseAdmin
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
      return new Response(
        JSON.stringify({ error: "Failed to insert AI reply" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[chat-auto-reply] AI reply inserted successfully for message", message_id);

    return new Response(
      JSON.stringify({ success: true, model }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[chat-auto-reply] Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
