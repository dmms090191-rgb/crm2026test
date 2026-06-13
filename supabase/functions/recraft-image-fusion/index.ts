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

const RECRAFT_OUTPAINT_URL =
  "https://external.api.recraft.ai/v1/images/outpaint";
const CREDIT_COST = 4;

const OUTPAINT_PROMPT =
  "Extend this image outward in all directions to create a wide, seamless background suitable for a full-screen desktop dashboard. " +
  "Pay special attention to extending the RIGHT side of the image to fill a wide screen. " +
  "CRITICAL: Keep ALL people, characters, and human subjects EXACTLY as they are in the original image. " +
  "Do NOT modify, reconstruct, extend, or add any body parts: no extra feet, no extra legs, no extra hands, no extra arms. " +
  "Do NOT change proportions, silhouettes, or anatomy of any person or character. " +
  "Do NOT complete or reconstruct bodies that are partially visible — leave them as they are. " +
  "ONLY extend the background: scenery, floor, ground, sky, colors, lighting, textures, and atmosphere. " +
  "Naturally continue the environment around the edges while the center subjects remain perfectly untouched. " +
  "Remove the visible rectangular frame effect by blending the extended area seamlessly. " +
  "Create a professional, clean, wide background suitable for a modern SaaS dashboard interface. " +
  "Do not add any text, logos, UI elements, watermarks, or distortions.";

const NEGATIVE_PROMPT =
  "extra foot, extra leg, duplicate feet, duplicate limbs, deformed legs, mutated body, " +
  "distorted anatomy, extra hands, extra arms, bad anatomy, changed character, cropped body, " +
  "duplicated character, modified person, reconstructed body parts, extra fingers, " +
  "malformed limbs, body horror, disfigured, mutation, deformed, blurry face, " +
  "text, logo, watermark, UI elements, interface, button, icon";

interface RecraftSize {
  aspect: string;
  w: number;
  h: number;
  ratio: number;
}

const RECRAFT_V3_SIZES: RecraftSize[] = [
  { aspect: "2:1", w: 2048, h: 1024, ratio: 2 },
  { aspect: "16:9", w: 1820, h: 1024, ratio: 16 / 9 },
  { aspect: "14:10", w: 1434, h: 1024, ratio: 14 / 10 },
  { aspect: "3:2", w: 1536, h: 1024, ratio: 3 / 2 },
  { aspect: "5:4", w: 1280, h: 1024, ratio: 5 / 4 },
  { aspect: "4:3", w: 1365, h: 1024, ratio: 4 / 3 },
  { aspect: "1:1", w: 1024, h: 1024, ratio: 1 },
];

function pickBestSize(
  targetWidth: number,
  targetHeight: number,
): RecraftSize {
  const targetRatio = targetWidth / targetHeight;

  let best = RECRAFT_V3_SIZES[0];
  let bestDiff = Infinity;

  for (const s of RECRAFT_V3_SIZES) {
    const diff = Math.abs(s.ratio - targetRatio);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }

  return best;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const recraftKey = Deno.env.get("RECRAFT_API_KEY");

    if (!recraftKey) {
      console.error("[recraft-image-fusion] RECRAFT_API_KEY is not configured");
      return jsonResponse(
        { error: "Service IA Premium indisponible. Cle API non configuree." },
        503,
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
      return jsonResponse({ error: "Non authentifie" }, 401);
    }

    const callerRole = user.app_metadata?.role;
    if (callerRole !== "admin" && callerRole !== "super_admin") {
      return jsonResponse(
        { error: "Acces refuse: role admin ou super_admin requis." },
        403,
      );
    }

    const body = await req.json();
    const imageUrl =
      typeof body.image_url === "string" ? body.image_url.trim() : "";
    const userInstruction =
      typeof body.user_instruction === "string"
        ? body.user_instruction.trim()
        : "";
    const targetWidth =
      typeof body.target_width === "number" && body.target_width > 0
        ? body.target_width
        : 1920;
    const targetHeight =
      typeof body.target_height === "number" && body.target_height > 0
        ? body.target_height
        : 1080;

    if (!imageUrl) {
      return jsonResponse({ error: "image_url est obligatoire." }, 400);
    }

    const chosenSize = pickBestSize(targetWidth, targetHeight);

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Check Recraft credits before proceeding
    const meRes = await fetch(
      "https://external.api.recraft.ai/v1/users/me",
      { headers: { Authorization: `Bearer ${recraftKey}` } },
    );

    if (!meRes.ok) {
      console.error(
        `[recraft-image-fusion] Credit check failed: ${meRes.status}`,
      );
      return jsonResponse(
        { error: "Impossible de verifier les credits Recraft." },
        502,
      );
    }

    const meData = await meRes.json();
    const availableCredits = meData?.credits ?? 0;

    if (availableCredits < CREDIT_COST) {
      return jsonResponse(
        {
          error: `Credits insuffisants. ${availableCredits} disponible(s), ${CREDIT_COST} requis.`,
          credits_available: availableCredits,
          credits_required: CREDIT_COST,
        },
        402,
      );
    }

    console.log(
      `[recraft-image-fusion] user=${user.id} credits=${availableCredits} target=${targetWidth}x${targetHeight} chosen=${chosenSize.aspect}(${chosenSize.w}x${chosenSize.h})`,
    );

    // Download source image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error(
        `[recraft-image-fusion] Failed to download source image: ${imgRes.status}`,
      );
      return jsonResponse(
        { error: "Impossible de telecharger l'image source." },
        400,
      );
    }

    const imgBlob = await imgRes.blob();

    if (imgBlob.size > 5 * 1024 * 1024) {
      return jsonResponse(
        { error: "L'image source depasse la limite de 5 Mo." },
        400,
      );
    }

    const ct = imgBlob.type || "image/png";
    const ext = ct.includes("webp")
      ? "webp"
      : ct.includes("jpeg") || ct.includes("jpg")
        ? "jpg"
        : "png";
    const fileToSend = new File([imgBlob], `source.${ext}`, { type: ct });

    // Build final prompt
    let finalPrompt = OUTPAINT_PROMPT;
    if (userInstruction) {
      finalPrompt += `\n\nUser instruction: ${userInstruction}`;
    }

    const formData = new FormData();
    formData.append("image", fileToSend);
    formData.append("prompt", finalPrompt);
    formData.append("negative_prompt", NEGATIVE_PROMPT);
    formData.append("size", chosenSize.aspect);
    formData.append("zoom_out_percentage", "40");
    formData.append("response_format", "url");
    formData.append("model", "recraftv3");

    console.log(
      `[recraft-image-fusion] Calling Recraft outpaint: size=${chosenSize.aspect}(${chosenSize.w}x${chosenSize.h}), zoom_out=40%, file_size=${fileToSend.size}, has_instruction=${!!userInstruction}`,
    );

    const recraftRes = await fetch(RECRAFT_OUTPAINT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${recraftKey}` },
      body: formData,
    });

    if (!recraftRes.ok) {
      const errText = await recraftRes.text();
      console.error(
        `[recraft-image-fusion] Recraft outpaint error ${recraftRes.status}: ${errText}`,
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
    const resultUrl = images[0]?.url;

    if (!resultUrl) {
      console.error(
        "[recraft-image-fusion] No URL in outpaint response",
        JSON.stringify(recraftData),
      );
      return jsonResponse(
        { error: "Aucune image retournee par Recraft." },
        502,
      );
    }

    console.log("[recraft-image-fusion] Recraft outpaint successful");

    // Download the result and store it in Supabase storage
    const resultImgRes = await fetch(resultUrl);
    if (!resultImgRes.ok) {
      console.error(
        `[recraft-image-fusion] Failed to download result: ${resultImgRes.status}`,
      );
      return jsonResponse(
        {
          generated_url: resultUrl,
          stored: false,
          generated_width: chosenSize.w,
          generated_height: chosenSize.h,
        },
        200,
      );
    }

    const resultBlob = await resultImgRes.blob();
    const ts = Date.now();
    const storagePath = `${user.id}/fusion-ia-${ts}.png`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("editor-backgrounds")
      .upload(storagePath, resultBlob, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadErr) {
      console.error(
        `[recraft-image-fusion] Storage upload failed: ${uploadErr.message}`,
      );
      return jsonResponse(
        {
          generated_url: resultUrl,
          stored: false,
          generated_width: chosenSize.w,
          generated_height: chosenSize.h,
        },
        200,
      );
    }

    const { data: pub } = supabaseAdmin.storage
      .from("editor-backgrounds")
      .getPublicUrl(storagePath);

    console.log(`[recraft-image-fusion] Stored: ${storagePath}`);

    // Update remaining credits in sa_ai_apis for tracking
    const { error: creditErr } = await supabaseAdmin
      .from("sa_ai_apis")
      .update({
        remaining_credit: availableCredits - CREDIT_COST,
        last_checked_at: new Date().toISOString(),
      })
      .eq("provider", "recraft");

    if (creditErr) {
      console.error(
        `[recraft-image-fusion] Credit update failed: ${creditErr.message}`,
      );
    }

    return jsonResponse(
      {
        generated_url: pub.publicUrl,
        stored: true,
        credits_used: CREDIT_COST,
        credits_remaining: availableCredits - CREDIT_COST,
        generated_width: chosenSize.w,
        generated_height: chosenSize.h,
        aspect: chosenSize.aspect,
      },
      200,
    );
  } catch (err) {
    console.error("[recraft-image-fusion] Unexpected error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
