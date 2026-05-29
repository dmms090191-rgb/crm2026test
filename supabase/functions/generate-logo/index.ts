import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- V3-only constants ----------

const NEGATIVE_PROMPT =
  "people, humans, workers, characters, mascots, faces, hands, silhouettes, " +
  "scenes, landscapes, buildings, construction, tools, gears, cogs, machinery, " +
  "panels, signs, billboards, speech bubbles, " +
  "rays, sunbursts, starbursts, lens flares, sparkle effects, " +
  "busy backgrounds, patterns, decorations, ornaments, borders, frames, " +
  "badges, shields, emblems, crests, banners, ribbons, " +
  "detailed illustrations, drawings, sketches, paintings, " +
  "3D effects, shadows, drop shadows, bevels, embossing, " +
  "photo-realism, realistic textures, photographic elements";

const VALID_V3_STYLES = [
  "Vector art",
  "Line art",
  "Bold stroke",
  "Roundish flat",
  "Emotional flat",
  "Engraving",
] as const;

// ---------- Preset definitions ----------

const VALID_PRESETS = [
  "typographic",
  "abstract_symbol",
  "app_icon",
  "monogram",
  "color_variant",
] as const;
type Preset = typeof VALID_PRESETS[number];

function buildPresetPrompt(
  preset: Preset,
  brandName: string,
  userHints: string,
  siblingPresets?: Preset[],
): string {
  const brand = brandName || "BRAND";
  const initial = brand.charAt(0).toUpperCase();

  const hasSibling = siblingPresets && siblingPresets.length > 0;
  const isPartOfLogoSet = hasSibling && siblingPresets.some(
    (s) => s === "typographic" || s === "color_variant" || s === "monogram",
  );

  const base: Record<Preset, string> = {
    typographic:
      `Clean premium wordmark logo. Text only: ${brand}. Modern geometric bold typography. Minimal professional SaaS brand. No icon, no people, no objects, no scene, no decoration.`,
    abstract_symbol:
      isPartOfLogoSet
        ? `Abstract geometric symbol derived from the brand ${brand}. Same visual identity, same style, same color palette as the main logo. Simple flat vector mark. No text, no people, no objects, no scene, no decoration.`
        : "Abstract geometric symbol icon only. Simple flat vector mark. No text, no people, no objects, no scene, no decoration.",
    app_icon:
      isPartOfLogoSet
        ? `App icon for the brand ${brand}. This icon must be a coherent derivative of the ${brand} main logo: same visual identity, same design language, same color scheme, same style. Rounded square shape, flat design, single centered symbol inspired by the brand, minimal. No text, no people, no scene, no decoration.`
        : "Simple app icon. Rounded square shape, flat design, single centered geometric symbol, minimal. No text, no people, no scene, no decoration.",
    monogram:
      `Single letter ${initial} monogram logo. Geometric elegant letterform. Clean minimal vector. No people, no objects, no scene, no decoration.`,
    color_variant:
      `Clean premium wordmark logo. Text: ${brand}. Bold modern sans-serif. Vibrant color palette. No icon, no people, no objects, no scene, no decoration.`,
  };

  let result = base[preset];
  if (userHints) {
    result += " " + userHints;
  }
  return result;
}

// ---------- V3 helpers ----------

function buildV3Prompt(
  userPrompt: string,
  brandName: string,
  logoType: "symbol_and_text" | "symbol_only",
): string {
  const parts: string[] = [
    "Professional vector logo. Minimal geometric symbol, flat design, 2-3 colors max, readable at small size.",
  ];

  if (brandName) {
    if (logoType === "symbol_and_text") {
      parts.push(`Logo for brand "${brandName}".`);
    } else {
      parts.push(`Abstract symbol for "${brandName}".`);
    }
  }

  parts.push(userPrompt);

  let result = parts.join(" ");
  if (result.length > 1000) {
    result = result.slice(0, 1000);
  }
  return result;
}

function buildTextLayout(
  brandName: string,
): { text: string; bbox: number[][] }[] | null {
  if (!brandName) return null;
  const upper = brandName.toUpperCase();
  const len = upper.length;
  const charW = 0.06;
  const totalW = Math.min(len * charW, 0.8);
  const x0 = (1 - totalW) / 2;
  const x1 = x0 + totalW;
  const words = upper.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  if (words.length === 1) {
    return [
      {
        text: words[0],
        bbox: [
          [x0, 0.82],
          [x1, 0.82],
          [x1, 0.92],
          [x0, 0.92],
        ],
      },
    ];
  }

  const layout: { text: string; bbox: number[][] }[] = [];
  let cursor = x0;
  const gap = 0.03;
  const totalChars = words.reduce((s, w) => s + w.length, 0);
  const availW = totalW - gap * (words.length - 1);

  for (const word of words) {
    const wW = (word.length / totalChars) * availW;
    layout.push({
      text: word,
      bbox: [
        [cursor, 0.82],
        [cursor + wW, 0.82],
        [cursor + wW, 0.92],
        [cursor, 0.92],
      ],
    });
    cursor += wW + gap;
  }
  return layout;
}

// ---------- Recraft API call helper ----------

interface RecraftControls {
  colors?: { rgb: number[] }[];
  background_color?: { rgb: number[] };
  no_text?: boolean;
}

async function callRecraftV4(
  recraftKey: string,
  prompt: string,
  numImages: number,
  controls: RecraftControls | null,
): Promise<string[]> {
  const payload: Record<string, unknown> = {
    prompt,
    model: "recraftv4_1_vector",
    size: "1:1",
    n: numImages,
    response_format: "url",
  };
  if (controls && Object.keys(controls).length > 0) {
    payload.controls = controls;
  }

  const res = await fetch(
    "https://external.api.recraft.ai/v1/images/generations",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${recraftKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      detail = parsed?.error?.message || parsed?.message || errText;
    } catch {
      // keep raw text
    }
    throw new Error(`Recraft (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const images: { url: string }[] = data?.data ?? [];
  return images.map((img) => img.url).filter(Boolean);
}

// ---------- Storage helper ----------

async function storeImages(
  supabaseAdmin: ReturnType<typeof createClient>,
  companyId: string,
  urls: string[],
  tsPrefix: number,
  indexOffset: number,
): Promise<string[]> {
  const stored: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const imgRes = await fetch(urls[i]);
      if (!imgRes.ok) {
        stored.push(urls[i]);
        continue;
      }
      const blob = await imgRes.blob();
      const isSvg = blob.type.includes("svg");
      const ext = isSvg ? "svg" : "png";
      const ct = isSvg ? "image/svg+xml" : "image/png";
      const filePath = `${companyId}/logo-ai-${tsPrefix}-${indexOffset + i}.${ext}`;

      const { error: upErr } = await supabaseAdmin.storage
        .from("company-logos")
        .upload(filePath, blob, { contentType: ct, upsert: true });

      if (upErr) {
        console.error(`[generate-logo] Storage upload failed: ${upErr.message}`);
        stored.push(urls[i]);
        continue;
      }

      const { data: pub } = supabaseAdmin.storage
        .from("company-logos")
        .getPublicUrl(filePath);
      stored.push(pub.publicUrl);
    } catch (dlErr) {
      console.error("[generate-logo] Error storing image:", dlErr);
      stored.push(urls[i]);
    }
  }
  return stored;
}

// ---------- Main handler ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const recraftKey = Deno.env.get("RECRAFT_API_KEY");

    if (!recraftKey) {
      console.error("[generate-logo] RECRAFT_API_KEY is not configured");
      return jsonResponse(
        { error: "Service de generation indisponible." },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized: invalid token" }, 401);
    }

    const callerRole = user.app_metadata?.role;
    if (callerRole !== "admin" && callerRole !== "super_admin") {
      return jsonResponse(
        { error: "Forbidden: admin or super_admin role required" },
        403,
      );
    }

    // ---------- Parse body ----------

    const body = await req.json();
    const engine = body.engine === "v3" ? "v3" : "v4_1";
    const userPrompt =
      typeof body.prompt === "string" ? body.prompt.trim() : "";
    const brandName =
      typeof body.brand_name === "string" ? body.brand_name.trim() : "";
    const numImages = Math.min(
      Math.max(typeof body.n === "number" ? Math.floor(body.n) : 1, 1),
      4,
    );
    const companyId =
      typeof body.company_id === "string" ? body.company_id.trim() : "";

    // Colors (V4.1 controls)
    const rawColors = Array.isArray(body.colors) ? body.colors : null;
    const rawBgColor = Array.isArray(body.background_color)
      ? body.background_color
      : null;

    // Build V4.1 controls object
    const v4Controls: RecraftControls = {};
    if (rawColors && rawColors.length > 0) {
      const validColors = rawColors
        .filter(
          (c: unknown) =>
            Array.isArray(c) &&
            c.length === 3 &&
            c.every((v: unknown) => typeof v === "number"),
        )
        .map((c: number[]) => ({ rgb: c }));
      if (validColors.length > 0) {
        v4Controls.colors = validColors;
      }
    }
    if (
      rawBgColor &&
      rawBgColor.length === 3 &&
      rawBgColor.every((v: unknown) => typeof v === "number")
    ) {
      v4Controls.background_color = { rgb: rawBgColor };
    }

    // Parse presets: support both `presets` (array) and `preset` (single string)
    const presetsArray: Preset[] = [];
    if (Array.isArray(body.presets)) {
      for (const p of body.presets) {
        if (
          typeof p === "string" &&
          (VALID_PRESETS as readonly string[]).includes(p)
        ) {
          presetsArray.push(p as Preset);
        }
      }
    }

    const singlePreset: Preset | null =
      typeof body.preset === "string" &&
      (VALID_PRESETS as readonly string[]).includes(body.preset)
        ? (body.preset as Preset)
        : null;

    // ---------- Multi-preset path (V4.1 only) ----------

    if (presetsArray.length > 0 && engine === "v4_1") {
      console.log(
        `[generate-logo] Multi-preset: ${presetsArray.join(",")} user=${user.id} brand="${brandName}" n=${numImages}`,
      );

      const groups: { preset: string; image_urls: string[] }[] = [];
      const ts = Date.now();
      let totalStored = 0;

      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseAdmin = companyId
        ? createClient(supabaseUrl, serviceKey)
        : null;

      const otherPresets = (p: Preset) =>
        presetsArray.filter((s) => s !== p);

      for (let pi = 0; pi < presetsArray.length; pi++) {
        const preset = presetsArray[pi];
        const prompt = buildPresetPrompt(
          preset,
          brandName,
          userPrompt,
          otherPresets(preset),
        );

        console.log(
          `[generate-logo] Generating preset ${pi + 1}/${presetsArray.length}: ${preset}`,
        );

        const urls = await callRecraftV4(
          recraftKey,
          prompt,
          numImages,
          Object.keys(v4Controls).length > 0 ? v4Controls : null,
        );

        if (urls.length === 0) {
          groups.push({ preset, image_urls: [] });
          continue;
        }

        let finalUrls = urls;
        if (companyId && supabaseAdmin) {
          finalUrls = await storeImages(
            supabaseAdmin,
            companyId,
            urls,
            ts,
            totalStored,
          );
          totalStored += finalUrls.length;
        }

        groups.push({ preset, image_urls: finalUrls });
      }

      console.log(
        `[generate-logo] Multi-preset done: ${groups.length} group(s), ${totalStored} stored`,
      );

      const generationGroupId =
        presetsArray.length > 1
          ? `gen-${ts}-${crypto.randomUUID().slice(0, 8)}`
          : null;

      return jsonResponse(
        {
          success: true,
          generation_group_id: generationGroupId,
          groups: groups.map((g) => ({
            preset: g.preset,
            urls: g.image_urls,
          })),
        },
        200,
      );
    }

    // ---------- Single-preset / legacy path ----------

    const preset = singlePreset ?? (presetsArray.length === 1 ? presetsArray[0] : null);
    const logoType =
      body.logo_type === "symbol_only" ? "symbol_only" : "symbol_and_text";
    const recraftStyle: string =
      typeof body.recraft_style === "string" &&
      (VALID_V3_STYLES as readonly string[]).includes(body.recraft_style)
        ? body.recraft_style
        : "Vector art";

    let finalPrompt: string;

    if (preset) {
      finalPrompt = buildPresetPrompt(preset, brandName, userPrompt);
    } else if (engine === "v4_1") {
      if (!userPrompt) {
        return jsonResponse(
          { error: "Le prompt ou un preset est obligatoire." },
          400,
        );
      }
      finalPrompt = userPrompt;
      if (finalPrompt.length > 10000) {
        finalPrompt = finalPrompt.slice(0, 10000);
      }
    } else {
      if (!userPrompt) {
        return jsonResponse({ error: "Le prompt est obligatoire." }, 400);
      }
      finalPrompt = buildV3Prompt(userPrompt, brandName, logoType);
    }

    const recraftPayload: Record<string, unknown> = {
      prompt: finalPrompt,
      size: "1:1",
      n: numImages,
      response_format: "url",
    };

    if (engine === "v4_1") {
      recraftPayload.model = "recraftv4_1_vector";
      if (Object.keys(v4Controls).length > 0) {
        recraftPayload.controls = v4Controls;
      }
    } else {
      recraftPayload.model = "recraftv3_vector";
      recraftPayload.style = recraftStyle;
      recraftPayload.negative_prompt = NEGATIVE_PROMPT;

      if (logoType === "symbol_only") {
        recraftPayload.controls = { no_text: true };
      } else if (brandName) {
        const layout = buildTextLayout(brandName);
        if (layout) {
          recraftPayload.text_layout = layout;
        }
      }
    }

    console.log(
      `[generate-logo] engine=${engine} user=${user.id} preset=${preset ?? "none"} brand="${brandName}" n=${numImages}`,
    );

    const recraftRes = await fetch(
      "https://external.api.recraft.ai/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${recraftKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recraftPayload),
      },
    );

    if (!recraftRes.ok) {
      const errText = await recraftRes.text();
      console.error(
        `[generate-logo] Recraft API error ${recraftRes.status}: ${errText}`,
      );

      let detail = errText;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed?.error?.message || parsed?.message || errText;
      } catch {
        // keep raw text
      }

      return jsonResponse(
        { error: `Erreur Recraft (${recraftRes.status}): ${detail}` },
        502,
      );
    }

    const recraftData = await recraftRes.json();
    const images: { url: string }[] = recraftData?.data ?? [];
    const recraftUrls = images.map((img) => img.url).filter(Boolean);

    if (recraftUrls.length === 0) {
      return jsonResponse(
        { error: "Aucune image retournee par Recraft." },
        502,
      );
    }

    if (!companyId) {
      return jsonResponse(
        { success: true, image_url: recraftUrls[0], image_urls: recraftUrls },
        200,
      );
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const ts = Date.now();
    const storedUrls = await storeImages(
      supabaseAdmin,
      companyId,
      recraftUrls,
      ts,
      0,
    );

    console.log(
      `[generate-logo] Stored ${storedUrls.length} image(s) in Supabase storage`,
    );

    return jsonResponse(
      {
        success: true,
        image_url: storedUrls[0],
        image_urls: storedUrls,
      },
      200,
    );
  } catch (err) {
    console.error("[generate-logo] Unexpected error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
