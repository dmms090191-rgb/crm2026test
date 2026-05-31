import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_MANIFEST = {
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
  icons: [
    {
      src: "/icons/icon-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-192x192-maskable.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/icons/icon-512x512-maskable.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
  ],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");

    if (!companyId) {
      return new Response(JSON.stringify(DEFAULT_MANIFEST), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/manifest+json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data } = await supabase
      .from("company_home_pages")
      .select("app_icon_url")
      .eq("company_id", companyId)
      .maybeSingle();

    const appIconUrl = data?.app_icon_url;

    if (!appIconUrl) {
      return new Response(JSON.stringify(DEFAULT_MANIFEST), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/manifest+json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const manifest = {
      ...DEFAULT_MANIFEST,
      icons: [
        {
          src: appIconUrl,
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: appIconUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: appIconUrl,
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: appIconUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/favicon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any",
        },
      ],
    };

    return new Response(JSON.stringify(manifest), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response(JSON.stringify(DEFAULT_MANIFEST), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
});
