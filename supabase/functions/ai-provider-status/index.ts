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

    if (provider === "deepseek") {
      const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({
            provider: "deepseek",
            status: "key_missing",
            error: "Cle manquante",
            checked_at: new Date().toISOString(),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const balanceRes = await fetch("https://api.deepseek.com/user/balance", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!balanceRes.ok) {
        return new Response(
          JSON.stringify({
            provider: "deepseek",
            status: "error",
            error: `DeepSeek API ${balanceRes.status}`,
            checked_at: new Date().toISOString(),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const body = await balanceRes.json();
      const info = body.balance_infos?.[0];
      const totalBalance = info?.total_balance ?? "0";
      const currency = info?.currency ?? "USD";
      const isAvailable = body.is_available ?? false;

      return new Response(
        JSON.stringify({
          provider: "deepseek",
          status: isAvailable ? "available" : "unavailable",
          total_balance: totalBalance,
          currency,
          is_available: isAvailable,
          granted_balance: info?.granted_balance ?? "0",
          topped_up_balance: info?.topped_up_balance ?? "0",
          checked_at: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: `Provider inconnu: ${provider}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
