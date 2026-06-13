import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non authentifie" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Non authentifie" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") ?? "deepseek";

    const json = (body: Record<string, unknown>, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (provider === "deepseek") {
      const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
      if (!apiKey) {
        return json({
          provider: "deepseek",
          status: "key_missing",
          error: "Cle manquante",
          checked_at: new Date().toISOString(),
        });
      }

      const balanceRes = await fetch("https://api.deepseek.com/user/balance", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!balanceRes.ok) {
        return json({
          provider: "deepseek",
          status: "error",
          error: `DeepSeek API ${balanceRes.status}`,
          checked_at: new Date().toISOString(),
        });
      }

      const body = await balanceRes.json();
      const info = body.balance_infos?.[0];
      const totalBalance = info?.total_balance ?? "0";
      const currency = info?.currency ?? "USD";
      const isAvailable = body.is_available ?? false;

      return json({
        provider: "deepseek",
        status: isAvailable ? "available" : "unavailable",
        total_balance: totalBalance,
        currency,
        is_available: isAvailable,
        granted_balance: info?.granted_balance ?? "0",
        topped_up_balance: info?.topped_up_balance ?? "0",
        checked_at: new Date().toISOString(),
      });
    }

    if (provider === "recraft") {
      const apiKey = Deno.env.get("RECRAFT_API_KEY");
      if (!apiKey) {
        return json({
          provider: "recraft",
          status: "key_missing",
          key_configured: false,
          error: "Cle manquante",
          checked_at: new Date().toISOString(),
        });
      }

      const meRes = await fetch("https://external.api.recraft.ai/v1/users/me", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!meRes.ok) {
        const errText = await meRes.text();
        console.error(`[ai-provider-status] Recraft /users/me ${meRes.status}: ${errText}`);
        return json({
          provider: "recraft",
          status: "error",
          key_configured: true,
          error: `Recraft API ${meRes.status}`,
          checked_at: new Date().toISOString(),
        });
      }

      const me = await meRes.json();
      const credits = me?.credits;

      return json({
        provider: "recraft",
        status: "available",
        key_configured: true,
        total_balance: credits != null ? String(credits) : null,
        currency: "units",
        checked_at: new Date().toISOString(),
      });
    }

    if (provider === "stability") {
      const apiKey = Deno.env.get("STABILITY_API_KEY");
      if (!apiKey) {
        return json({
          provider: "stability",
          status: "key_missing",
          key_configured: false,
          error: "Cle manquante",
          checked_at: new Date().toISOString(),
        });
      }

      const balanceRes = await fetch(
        "https://api.stability.ai/v1/user/balance",
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );

      if (!balanceRes.ok) {
        const errText = await balanceRes.text();
        console.error(
          `[ai-provider-status] Stability /user/balance ${balanceRes.status}: ${errText}`,
        );
        return json({
          provider: "stability",
          status: "error",
          key_configured: true,
          error: `Stability API ${balanceRes.status}`,
          checked_at: new Date().toISOString(),
        });
      }

      const body = await balanceRes.json();
      const credits = body?.credits;

      return json({
        provider: "stability",
        status: "available",
        key_configured: true,
        total_balance: credits != null ? String(Math.round(credits * 100) / 100) : null,
        currency: "credits",
        checked_at: new Date().toISOString(),
      });
    }

    return json({ error: `Provider inconnu: ${provider}` }, 400);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
