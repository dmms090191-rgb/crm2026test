import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const STABILITY_BASE = "https://api.stability.ai";
const MAX_PIXELS = 1_048_576;

const VALID_OUTPUT_FORMATS = ["jpeg", "png", "webp"];
const VALID_ASPECT_RATIOS = ["21:9", "16:9", "3:2", "5:4", "1:1", "4:5", "2:3", "9:16", "9:21"];
const MAX_SEED = 4294967294;

const PRESERVE_PREFIX =
  "Preserve the original characters exactly. Do not change faces, clothing, colors, poses, body shapes, accessories, or identities. Only modify or complete the specific area described. Keep the image composition, style, lighting, and color palette unchanged. ";

const PRESERVE_NEGATIVE =
  "new characters, different faces, glasses, changed clothing, changed pose, changed colors, extra limbs, deformed hands, distorted feet, cartoon redesign, different identity, different style, different lighting, altered background where not requested";

function validateParams(body: Record<string, unknown>): string | null {
  const { operation, strength, left, right, up, down, creativity, seed, output_format, aspect_ratio } = body;

  if (typeof output_format === "string" && !VALID_OUTPUT_FORMATS.includes(output_format)) {
    return `Format de sortie invalide : '${output_format}'. Valeurs acceptees : ${VALID_OUTPUT_FORMATS.join(", ")}.`;
  }
  if (typeof aspect_ratio === "string" && !VALID_ASPECT_RATIOS.includes(aspect_ratio)) {
    return `Ratio invalide : '${aspect_ratio}'. Valeurs acceptees : ${VALID_ASPECT_RATIOS.join(", ")}.`;
  }
  if (typeof seed === "number" && (seed < 0 || seed > MAX_SEED)) {
    return `Seed invalide : ${seed}. Doit etre entre 0 et ${MAX_SEED}.`;
  }

  if (operation === "img2img") {
    const s = typeof strength === "number" ? strength : 0.35;
    if (s < 0 || s > 1) {
      return `Strength invalide : ${s}. Doit etre entre 0 et 1.`;
    }
  }

  if (operation === "outpaint") {
    for (const dir of ["left", "right", "up", "down"] as const) {
      const v = body[dir];
      if (typeof v === "number" && (v < 0 || v > 2000)) {
        return `Direction '${dir}' invalide : ${v}. Doit etre entre 0 et 2000.`;
      }
    }
    const hasDir = [left, right, up, down].some((v) => typeof v === "number" && v > 0);
    if (!hasDir) {
      return "Au moins une direction (left, right, up, down) doit etre superieure a 0 pour l'extension.";
    }
    if (typeof creativity === "number" && (creativity < 0 || creativity > 1)) {
      return `Creativite invalide : ${creativity}. Doit etre entre 0 et 1.`;
    }
  }

  return null;
}

async function translatePromptToEnglish(
  prompt: string,
  deepseekKey: string,
): Promise<{ translated: string; wasTranslated: boolean }> {
  const hasNonAscii = /[^\x00-\x7F]/.test(prompt);
  const frenchIndicators = /\b(le|la|les|un|une|des|du|de|et|ou|avec|pour|dans|sur|en|est|sont|ce|cette|que|qui|au|aux|mon|ma|mes|ton|ta|tes|son|sa|ses|nous|vous|ils|elles|leur|leurs|je|tu|il|elle|mais|donc|car|ni|comme|plus|tres|bien|peu|aussi|ajouter|modifier|supprimer|agrandir|reduire|changer|mettre|faire|creer|generer|couleur|fond|image|photo|pieds|mains|visage|corps|arriere-plan|paysage|ciel|soleil|mer|montagne|arbre|fleur|maison|voiture|personne|homme|femme|enfant|animal|chat|chien|oiseau)\b/i;

  if (!hasNonAscii && !frenchIndicators.test(prompt)) {
    console.log("[stability][translate] prompt appears to be English, skipping translation");
    return { translated: prompt, wasTranslated: false };
  }

  try {
    console.log("[stability][translate] translating prompt to English via DeepSeek...");
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a translator. Translate the following image generation prompt from French to English. Output ONLY the English translation, nothing else. Keep it as a prompt for an AI image generator. Do not add explanations.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      console.error("[stability][translate] DeepSeek error:", res.status);
      return { translated: prompt, wasTranslated: false };
    }

    const data = await res.json();
    const translation = data.choices?.[0]?.message?.content?.trim();
    if (translation && translation.length > 0) {
      console.log("[stability][translate] OK:", JSON.stringify(translation).substring(0, 120));
      return { translated: translation, wasTranslated: true };
    }
    return { translated: prompt, wasTranslated: false };
  } catch (e) {
    console.error("[stability][translate] failed:", e instanceof Error ? e.message : e);
    return { translated: prompt, wasTranslated: false };
  }
}

async function fetchImageAsBlob(url: string): Promise<Blob> {
  console.log("[stability][fetch-image] fetching source image...");
  const res = await fetch(url);
  if (!res.ok) {
    console.error("[stability][fetch-image] FAILED status:", res.status);
    throw new Error(`Impossible de recuperer l'image source (HTTP ${res.status}).`);
  }
  const blob = await res.blob();
  console.log("[stability][fetch-image] OK, size:", blob.size, "bytes, type:", blob.type);
  return blob;
}

function readImageDimensions(
  bytes: Uint8Array,
  arrayBuf: ArrayBuffer,
): { w: number; h: number } {
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;

  if (isPng && bytes.length > 24) {
    const view = new DataView(arrayBuf);
    return { w: view.getUint32(16), h: view.getUint32(20) };
  }

  if (isJpeg) {
    let offset = 2;
    const view = new DataView(arrayBuf);
    while (offset < bytes.length - 9) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        return { w: view.getUint16(offset + 7), h: view.getUint16(offset + 5) };
      }
      const segLen = view.getUint16(offset + 2);
      offset += 2 + segLen;
    }
  }

  return { w: 0, h: 0 };
}

async function validateImageDimensions(blob: Blob): Promise<void> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const { w, h } = readImageDimensions(bytes, buf);
  const pixels = w * h;
  console.log("[stability][validate] image dimensions:", w, "x", h, "=", pixels, "pixels");
  if (w > 0 && h > 0 && pixels > MAX_PIXELS) {
    throw new Error(
      `Image trop grande (${w}x${h}, ${pixels.toLocaleString()} pixels). Limite : 1 megapixel. Reduisez l'image avant envoi.`,
    );
  }
}

function parseStabilityError(status: number, body: string): string {
  console.error("[stability][api-error] HTTP", status, "body:", body);

  const lower = body.toLowerCase();

  if (status === 401 || status === 403)
    return "Cle API Stability AI invalide ou expiree. Contactez l'administrateur.";
  if (status === 402)
    return "Credits Stability AI insuffisants. Veuillez recharger votre solde.";
  if (status === 404)
    return "Endpoint Stability AI introuvable. Le modele demande n'est peut-etre plus disponible.";
  if (status === 413)
    return "Image trop volumineuse pour Stability AI. Reduisez la taille du fichier.";
  if (status === 429)
    return "Trop de requetes vers Stability AI. Veuillez patienter quelques secondes.";

  if (lower.includes("insufficient") && lower.includes("credit"))
    return "Credits Stability AI insuffisants. Veuillez recharger votre solde.";
  if (lower.includes("unsupported") && lower.includes("dimension"))
    return "Dimensions de l'image non supportees par Stability AI.";
  if (lower.includes("invalid") && (lower.includes("image") || lower.includes("format")))
    return "Format d'image non supporte. Utilisez une image JPEG ou PNG.";
  if (lower.includes("content moderation") || lower.includes("nsfw"))
    return "Le contenu a ete bloque par le filtre Stability AI.";
  if (lower.includes("payload too large") || lower.includes("too large"))
    return "Image trop volumineuse pour Stability AI. Reduisez la taille du fichier.";

  let detail = "";
  try {
    const parsed = JSON.parse(body);
    detail = parsed.message || parsed.errors?.[0] || parsed.error || parsed.name || "";
  } catch { /* not JSON */ }

  return `Erreur Stability AI (HTTP ${status})${detail ? ` : ${detail}` : ""}. Veuillez reessayer.`;
}

interface StabilityResult {
  imageBlob: Blob;
  seed: number;
  finishReason: string;
}

async function parseStabilityResponse(
  res: Response,
  operationLabel: string,
): Promise<StabilityResult> {
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(parseStabilityError(res.status, errText));
  }

  const contentType = res.headers.get("content-type") || "";
  console.log("[stability][" + operationLabel + "] response status:", res.status, "content-type:", contentType);

  if (contentType.startsWith("image/")) {
    const buf = await res.arrayBuffer();
    const seed = parseInt(res.headers.get("seed") || "0", 10);
    const finishReason = res.headers.get("finish-reason") || "SUCCESS";
    console.log("[stability][" + operationLabel + "] OK (binary), size:", buf.byteLength, "bytes, seed:", seed);
    return {
      imageBlob: new Blob([buf], { type: contentType }),
      seed,
      finishReason,
    };
  }

  if (contentType.includes("application/json")) {
    const data = await res.json();
    if (!data.image) {
      throw new Error("Reponse Stability AI sans image. finish_reason: " + (data.finish_reason || "inconnu"));
    }
    const imageBytes = Uint8Array.from(atob(data.image), (c) => c.charCodeAt(0));
    console.log("[stability][" + operationLabel + "] OK (json/base64), size:", imageBytes.length, "bytes, seed:", data.seed);
    return {
      imageBlob: new Blob([imageBytes], { type: "image/png" }),
      seed: data.seed ?? 0,
      finishReason: data.finish_reason ?? "SUCCESS",
    };
  }

  throw new Error(`Reponse inattendue de Stability AI (content-type: ${contentType}).`);
}

async function callStabilityGenerate(
  apiKey: string,
  prompt: string,
  opts: {
    aspect_ratio?: string;
    model?: string;
    negative_prompt?: string;
    seed?: number;
    output_format?: string;
  },
): Promise<StabilityResult> {
  const usedModel = opts.model || "sd3.5-large";
  const endpoint = `${STABILITY_BASE}/v2beta/stable-image/generate/sd3`;
  console.log("[stability][generate] POST", endpoint, "model:", usedModel);

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("model", usedModel);
  form.append("output_format", opts.output_format || "png");
  if (opts.aspect_ratio) form.append("aspect_ratio", opts.aspect_ratio);
  if (opts.negative_prompt) form.append("negative_prompt", opts.negative_prompt);
  if (opts.seed != null) form.append("seed", String(opts.seed));

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "image/*",
    },
    body: form,
  });

  return parseStabilityResponse(res, "generate");
}

async function callStabilityImg2Img(
  apiKey: string,
  prompt: string,
  imageBlob: Blob,
  opts: {
    strength?: number;
    model?: string;
    negative_prompt?: string;
    seed?: number;
    output_format?: string;
  },
): Promise<StabilityResult> {
  const usedModel = opts.model || "sd3.5-large";
  const strength = opts.strength ?? 0.35;
  const endpoint = `${STABILITY_BASE}/v2beta/stable-image/generate/sd3`;
  console.log("[stability][img2img] POST", endpoint, "model:", usedModel, "strength:", strength, "source size:", imageBlob.size);

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("image", imageBlob, "source.png");
  form.append("mode", "image-to-image");
  form.append("model", usedModel);
  form.append("strength", String(strength));
  form.append("output_format", opts.output_format || "png");
  if (opts.negative_prompt) form.append("negative_prompt", opts.negative_prompt);
  if (opts.seed != null) form.append("seed", String(opts.seed));

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "image/*",
    },
    body: form,
  });

  return parseStabilityResponse(res, "img2img");
}

async function callStabilityOutpaint(
  apiKey: string,
  imageBlob: Blob,
  opts: {
    left?: number;
    right?: number;
    up?: number;
    down?: number;
    prompt?: string;
    creativity?: number;
    output_format?: string;
  },
): Promise<StabilityResult> {
  const endpoint = `${STABILITY_BASE}/v2beta/stable-image/edit/outpaint`;
  console.log("[stability][outpaint] POST", endpoint, "source size:", imageBlob.size, "padding:", { left: opts.left, right: opts.right, up: opts.up, down: opts.down });

  const form = new FormData();
  form.append("image", imageBlob, "source.png");
  form.append("output_format", opts.output_format || "png");
  if (opts.left) form.append("left", String(opts.left));
  if (opts.right) form.append("right", String(opts.right));
  if (opts.up) form.append("up", String(opts.up));
  if (opts.down) form.append("down", String(opts.down));
  if (opts.prompt) form.append("prompt", opts.prompt);
  if (opts.creativity != null) form.append("creativity", String(opts.creativity));

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "image/*",
    },
    body: form,
  });

  return parseStabilityResponse(res, "outpaint");
}

async function callStabilityUpscale(
  apiKey: string,
  imageBlob: Blob,
  opts: { output_format?: string },
): Promise<StabilityResult> {
  const endpoint = `${STABILITY_BASE}/v2beta/stable-image/upscale/fast`;
  console.log("[stability][upscale] POST", endpoint, "source size:", imageBlob.size);

  const form = new FormData();
  form.append("image", imageBlob, "source.png");
  form.append("output_format", opts.output_format || "png");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "image/*",
    },
    body: form,
  });

  return parseStabilityResponse(res, "upscale");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("[stability] === new request ===");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[stability] REJECTED: no auth header");
      return json({ error: "Non authentifie." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      console.log("[stability] REJECTED: auth failed", userErr?.message);
      return json({ error: "Non authentifie." }, 401);
    }

    const role = user.app_metadata?.role;
    console.log("[stability] user:", user.id, "role:", role);
    if (role !== "admin" && role !== "super_admin") {
      console.log("[stability] REJECTED: forbidden role");
      return json({ error: "Acces refuse." }, 403);
    }

    const apiKey = Deno.env.get("STABILITY_API_KEY");
    if (!apiKey) {
      console.error("[stability] FATAL: STABILITY_API_KEY is not set!");
      return json({ error: "Cle Stability AI non configuree sur le serveur." }, 500);
    }
    console.log("[stability] STABILITY_API_KEY present, length:", apiKey.length);

    const body = await req.json();
    const {
      operation,
      prompt,
      image_url,
      aspect_ratio,
      model,
      negative_prompt,
      seed,
      strength,
      preserve_mode,
      left,
      right,
      up,
      down,
      creativity,
    } = body;

    if (!operation) return json({ error: "Parametre 'operation' requis." }, 400);

    console.log("[stability] operation:", operation, "model:", model || "sd3.5-large", "hasPrompt:", !!prompt, "hasImage:", !!image_url, "aspect:", aspect_ratio || "default");

    const validationErr = validateParams(body);
    if (validationErr) {
      console.log("[stability] REJECTED: validation failed:", validationErr);
      return json({ error: validationErr }, 400);
    }

    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
    let englishPrompt = prompt || "";
    let promptTranslated = false;
    if (prompt && deepseekKey) {
      const tr = await translatePromptToEnglish(prompt, deepseekKey);
      englishPrompt = tr.translated;
      promptTranslated = tr.wasTranslated;
    }

    let result: StabilityResult;
    let usedModel = model || "sd3.5-large";
    let creditsUsed = 0;

    if (operation === "generate") {
      if (!prompt) return json({ error: "Le prompt est requis pour generer une image." }, 400);
      result = await callStabilityGenerate(apiKey, englishPrompt, {
        aspect_ratio: aspect_ratio || "16:9",
        model,
        negative_prompt,
        seed,
      });
      creditsUsed = usedModel.includes("turbo") ? 4 : usedModel.includes("medium") ? 3.5 : 6.5;
    } else if (operation === "img2img") {
      if (!prompt || !image_url)
        return json({ error: "Le prompt et l'image source sont requis." }, 400);
      const srcBlob = await fetchImageAsBlob(image_url);
      await validateImageDimensions(srcBlob);

      let img2imgPrompt = englishPrompt;
      let img2imgNegative = negative_prompt || "";
      let img2imgStrength = strength;

      if (preserve_mode) {
        img2imgPrompt = PRESERVE_PREFIX + englishPrompt;
        img2imgNegative = img2imgNegative
          ? `${PRESERVE_NEGATIVE}, ${img2imgNegative}`
          : PRESERVE_NEGATIVE;
        if (img2imgStrength == null) img2imgStrength = 0.20;
        console.log("[stability][img2img] preserve_mode ON, strength:", img2imgStrength);
      }

      result = await callStabilityImg2Img(apiKey, img2imgPrompt, srcBlob, {
        strength: img2imgStrength,
        model,
        negative_prompt: img2imgNegative || undefined,
        seed,
      });
      creditsUsed = usedModel.includes("turbo") ? 4 : usedModel.includes("medium") ? 3.5 : 6.5;
    } else if (operation === "outpaint") {
      if (!image_url)
        return json({ error: "L'image source est requise pour l'extension." }, 400);
      const srcBlob = await fetchImageAsBlob(image_url);
      await validateImageDimensions(srcBlob);
      result = await callStabilityOutpaint(apiKey, srcBlob, {
        left,
        right,
        up,
        down,
        prompt: englishPrompt || undefined,
        creativity,
      });
      usedModel = "outpaint";
      creditsUsed = 4;
    } else if (operation === "upscale") {
      if (!image_url) return json({ error: "L'image source est requise pour l'agrandissement." }, 400);
      const srcBlob = await fetchImageAsBlob(image_url);
      await validateImageDimensions(srcBlob);
      result = await callStabilityUpscale(apiKey, srcBlob, {});
      usedModel = "upscale-fast";
      creditsUsed = 0.25;
    } else {
      return json({ error: `Operation inconnue : '${operation}'.` }, 400);
    }

    console.log("[stability] generation OK, reading dimensions & uploading...");

    const resultBuf = await result.imageBlob.arrayBuffer();
    const resultBytes = new Uint8Array(resultBuf);
    const dims = readImageDimensions(resultBytes, resultBuf);
    const actualWidth = dims.w || 1024;
    const actualHeight = dims.h || 1024;
    console.log("[stability] actual generated dimensions:", actualWidth, "x", actualHeight);

    const uploadBlob = new Blob([resultBuf], { type: result.imageBlob.type || "image/png" });

    const storagePath = `${user.id}/gen_${Date.now()}.png`;
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: uploadErr } = await serviceClient.storage
      .from("ai-images")
      .upload(storagePath, uploadBlob, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadErr) {
      console.error("[stability][upload] FAILED:", uploadErr.message);
      return json({ error: "Impossible de sauvegarder l'image generee. Veuillez reessayer." }, 500);
    }

    const { data: urlData } = serviceClient.storage
      .from("ai-images")
      .getPublicUrl(storagePath);

    const usedAspect = aspect_ratio || (operation === "generate" ? "16:9" : null);
    console.log("[stability] === SUCCESS === op:", operation, "model:", usedModel, "credits:", creditsUsed, "seed:", result.seed, "dims:", actualWidth, "x", actualHeight, "aspect:", usedAspect);

    return json({
      success: true,
      image_url: urlData.publicUrl,
      storage_path: storagePath,
      seed: result.seed,
      model: usedModel,
      width: actualWidth,
      height: actualHeight,
      credits_used: creditsUsed,
      operation,
      aspect_ratio_used: usedAspect || undefined,
      prompt_translated: promptTranslated,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[stability] === CATCH ERROR ===", errMsg);
    return json({ error: errMsg }, 500);
  }
});
