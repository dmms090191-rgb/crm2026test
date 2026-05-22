import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_PURCHASE_PRICE_USD = 200;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function roundPrice(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeSellPrice(
  purchasePrice: number,
  marginType: string,
  marginValue: number,
  minMargin: number,
): { sellPrice: number; margin: number } {
  let margin: number;
  if (marginType === "fixed") {
    margin = marginValue;
  } else {
    margin = purchasePrice * (marginValue / 100);
    if (margin < minMargin) margin = minMargin;
  }
  return {
    sellPrice: roundPrice(purchasePrice + margin),
    margin: roundPrice(margin),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Non authentifie" }, 401);

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !caller) {
      return jsonResponse({ error: "Non authentifie" }, 401);
    }
    if (caller.app_metadata?.role !== "super_admin") {
      return jsonResponse({ error: "Acces reserve au super admin" }, 403);
    }

    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    if (!vercelToken) {
      return jsonResponse({ error: "Secret VERCEL_API_TOKEN manquant" }, 500);
    }

    const body = await req.json();
    const { action, domain } = body;
    if (!action) {
      return jsonResponse({ error: "Parametre requis: action" }, 400);
    }

    const vercelHeaders = { Authorization: `Bearer ${vercelToken}` };
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ── check-availability ──────────────────────────────────────────
    if (action === "check-availability") {
      if (!domain) return jsonResponse({ error: "Parametre requis: domain" }, 400);
      const res = await fetch(
        `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(domain)}/availability`,
        { method: "GET", headers: vercelHeaders },
      );
      const data = await res.json();
      if (!res.ok) {
        return jsonResponse({ error: data.message || `Vercel ${res.status}` });
      }
      return jsonResponse({ available: data.available === true });
    }

    // ── get-price ───────────────────────────────────────────────────
    if (action === "get-price") {
      if (!domain) return jsonResponse({ error: "Parametre requis: domain" }, 400);
      const { years } = body;
      const priceUrl = new URL(
        `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(domain)}/price`,
      );
      if (years != null) priceUrl.searchParams.set("years", String(years));
      const res = await fetch(priceUrl.toString(), {
        method: "GET",
        headers: vercelHeaders,
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400) {
          return jsonResponse({
            yearsNotSupported: true,
            error: data.message || `Duree non disponible pour cette extension`,
          });
        }
        return jsonResponse({ error: data.message || `Vercel ${res.status}` });
      }

      const purchasePrice = roundPrice(
        typeof data.purchasePrice === "number"
          ? data.purchasePrice
          : parseFloat(data.purchasePrice),
      );
      const renewalPrice = roundPrice(
        typeof data.renewalPrice === "number"
          ? data.renewalPrice
          : parseFloat(data.renewalPrice),
      );

      return jsonResponse({
        years: data.years ?? 1,
        currency: "USD",
        purchase: { vercelPrice: purchasePrice, displayPrice: purchasePrice },
        renewal: { vercelPrice: renewalPrice, displayPrice: renewalPrice },
      });
    }

    // ── buy ──────────────────────────────────────────────────────────
    if (action === "buy") {
      const { home_page_id, expectedPrice, renewalPrice: renewalPriceInput } = body;
      if (!domain) return jsonResponse({ error: "Parametre requis: domain" }, 400);
      if (!home_page_id) return jsonResponse({ error: "Parametre requis: home_page_id" }, 400);
      if (typeof expectedPrice !== "number" || expectedPrice <= 0) {
        return jsonResponse({ error: "expectedPrice invalide" }, 400);
      }
      if (expectedPrice > MAX_PURCHASE_PRICE_USD) {
        return jsonResponse({
          error: `Prix trop eleve (${expectedPrice} USD). Plafond : ${MAX_PURCHASE_PRICE_USD} USD. Contactez le support.`,
        }, 400);
      }

      const { data: page } = await supabaseAdmin
        .from("company_home_pages")
        .select("id, company_id")
        .eq("id", home_page_id)
        .maybeSingle();
      if (!page) return jsonResponse({ error: "Page introuvable" }, 404);

      const { data: existingOrder } = await supabaseAdmin
        .from("domain_orders")
        .select("id")
        .eq("home_page_id", home_page_id)
        .eq("domain_name", domain)
        .in("vercel_order_status", ["completed", "purchasing"])
        .maybeSingle();
      if (existingOrder) {
        return jsonResponse({ error: "Un achat est deja en cours ou termine pour ce domaine sur cette page." }, 400);
      }

      const { data: contact } = await supabaseAdmin
        .from("registrar_contact_info")
        .select("*")
        .eq("label", "talvex_default")
        .maybeSingle();
      if (!contact || !contact.first_name || !contact.email || !contact.phone) {
        return jsonResponse({ error: "Informations de contact registrar manquantes. Configurez la table registrar_contact_info." }, 500);
      }

      const contactInformation = {
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        address1: contact.address1,
        ...(contact.address2 ? { address2: contact.address2 } : {}),
        city: contact.city,
        state: contact.state,
        zip: contact.zip,
        country: contact.country,
        ...(contact.company_name ? { companyName: contact.company_name } : {}),
      };

      const { data: config } = await supabaseAdmin
        .from("domain_pricing_config")
        .select("margin_type, margin_value, min_margin")
        .limit(1)
        .maybeSingle();
      const marginType = config?.margin_type ?? "percentage";
      const marginValue = config?.margin_value ?? 30;
      const minMargin = config?.min_margin ?? 3;
      const pricing = computeSellPrice(expectedPrice, marginType, marginValue, minMargin);
      const renewalNum = typeof renewalPriceInput === "number" ? renewalPriceInput : 0;

      const { data: order, error: insertErr } = await supabaseAdmin
        .from("domain_orders")
        .insert({
          company_id: page.company_id,
          home_page_id,
          domain_name: domain,
          action: "purchase",
          purchase_price: expectedPrice,
          renewal_price: renewalNum,
          sell_price: pricing.sellPrice,
          margin: pricing.margin,
          years: 1,
          currency: "USD",
          payment_status: "super_admin_dev_manual",
          contact_info: contactInformation,
          vercel_order_status: "draft",
          created_by: caller.id,
        })
        .select("id")
        .single();
      if (insertErr || !order) {
        return jsonResponse({ error: `Erreur creation commande: ${insertErr?.message}` }, 500);
      }

      const buyRes = await fetch(
        `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(domain)}/buy`,
        {
          method: "POST",
          headers: { ...vercelHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            autoRenew: true,
            years: 1,
            expectedPrice,
            contactInformation,
          }),
        },
      );
      const buyData = await buyRes.json();

      if (!buyRes.ok) {
        const errMsg = buyData.message || buyData.code || `Vercel ${buyRes.status}`;
        await supabaseAdmin
          .from("domain_orders")
          .update({ vercel_order_status: "failed", error_message: errMsg })
          .eq("id", order.id);
        return jsonResponse({ error: errMsg, orderId: order.id, vercelError: true });
      }

      const vercelOrderId = buyData.orderId;
      const now = new Date().toISOString();

      await supabaseAdmin
        .from("domain_orders")
        .update({
          vercel_order_id: vercelOrderId,
          vercel_order_status: "purchasing",
        })
        .eq("id", order.id);

      await supabaseAdmin
        .from("company_home_pages")
        .update({
          custom_domain: domain,
          domain_provider: "vercel",
          domain_type: "talvex_managed",
          domain_status: "pending",
          domain_verified: false,
          domain_purchase_price: expectedPrice,
          domain_sell_price: pricing.sellPrice,
          domain_payment_status: "super_admin_dev_manual",
          domain_order_id: vercelOrderId,
          domain_auto_renew: true,
          last_domain_check_at: now,
          updated_at: now,
        })
        .eq("id", home_page_id);

      const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");
      let addedToProject = false;
      if (vercelProjectId) {
        const addRes = await fetch(
          `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
          {
            method: "POST",
            headers: { ...vercelHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ name: domain }),
          },
        );
        addedToProject = addRes.ok;
      }

      return jsonResponse({
        success: true,
        orderId: order.id,
        vercelOrderId,
        vercelOrderStatus: "purchasing",
        addedToProject,
      });
    }

    // ── order-status ────────────────────────────────────────────────
    if (action === "order-status") {
      const { orderId } = body;
      if (!orderId) return jsonResponse({ error: "Parametre requis: orderId" }, 400);

      const { data: order } = await supabaseAdmin
        .from("domain_orders")
        .select("id, vercel_order_id, home_page_id, domain_name, vercel_order_status")
        .eq("id", orderId)
        .maybeSingle();
      if (!order) return jsonResponse({ error: "Commande introuvable" }, 404);
      if (!order.vercel_order_id) {
        return jsonResponse({ error: "Pas de vercel_order_id pour cette commande" }, 400);
      }

      const res = await fetch(
        `https://api.vercel.com/v1/registrar/orders/${encodeURIComponent(order.vercel_order_id)}`,
        { method: "GET", headers: vercelHeaders },
      );
      const data = await res.json();
      if (!res.ok) {
        return jsonResponse({ error: data.message || `Vercel ${res.status}` });
      }

      const newStatus: string = data.status;
      const now = new Date().toISOString();

      const orderUpdate: Record<string, unknown> = { vercel_order_status: newStatus };
      if (newStatus === "completed") orderUpdate.completed_at = now;
      if (newStatus === "failed" && data.error) {
        orderUpdate.error_message = data.error.code || JSON.stringify(data.error);
      }
      await supabaseAdmin
        .from("domain_orders")
        .update(orderUpdate)
        .eq("id", order.id);

      if (newStatus === "completed" && order.home_page_id) {
        await supabaseAdmin
          .from("company_home_pages")
          .update({
            domain_status: "verified",
            domain_verified: true,
            updated_at: now,
          })
          .eq("id", order.home_page_id);
      }
      if (newStatus === "failed" && order.home_page_id) {
        const errMsg = data.error?.code || "Echec commande Vercel";
        await supabaseAdmin
          .from("company_home_pages")
          .update({
            domain_status: "error",
            domain_verified: false,
            domain_notes: errMsg,
            updated_at: now,
          })
          .eq("id", order.home_page_id);
      }

      return jsonResponse({
        success: true,
        vercelOrderId: order.vercel_order_id,
        previousStatus: order.vercel_order_status,
        currentStatus: newStatus,
        domains: data.domains ?? [],
      });
    }

    return jsonResponse({ error: `Action inconnue: ${action}` }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
