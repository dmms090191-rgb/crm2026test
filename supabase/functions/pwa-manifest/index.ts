import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function buildManifest(iconUrl: string | null) {
  const icons = iconUrl
    ? [
        { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ]
    : [
        { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-192x192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icons/icon-512x512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];

  icons.push({ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" });

  return {
    name: "Talvex",
    short_name: "Talvex",
    description: "CRM professionnel Talvex",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0ea5e9",
    orientation: "portrait",
    categories: ["business", "productivity"],
    icons,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let appIconUrl: string | null = null;

    if (companyId) {
      const { data } = await supabase
        .from("company_home_pages")
        .select("app_icon_url")
        .eq("company_id", companyId)
        .maybeSingle();
      appIconUrl = data?.app_icon_url ?? null;
    }

    if (!appIconUrl) {
      const { data } = await supabase
        .from("company_home_pages")
        .select("app_icon_url")
        .not("app_icon_url", "is", null)
        .limit(1)
        .maybeSingle();
      appIconUrl = data?.app_icon_url ?? null;
    }

    const manifest = buildManifest(appIconUrl);

    return new Response(JSON.stringify(manifest), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/manifest+json",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response(JSON.stringify(buildManifest(null)), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
});
