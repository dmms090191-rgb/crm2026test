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

const RECRAFT_BASE = "https://external.api.recraft.ai/v1/images";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const recraftKey = Deno.env.get("RECRAFT_API_KEY");

    if (!recraftKey) {
      console.error("[edit-logo] RECRAFT_API_KEY is not configured");
      return jsonResponse(
        { error: "Service d'edition indisponible." },
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

    const body = await req.json();
    const action = body.action;
    const companyId =
      typeof body.company_id === "string" ? body.company_id.trim() : "";

    if (action !== "remove-background") {
      return jsonResponse(
        { error: "Action invalide. Seule 'remove-background' est supportee." },
        400,
      );
    }

    // Accept either image_url (URL to fetch) or image_base64 (PNG as data URI or raw base64)
    let imgBlob: Blob;
    const imageBase64 =
      typeof body.image_base64 === "string"
        ? body.image_base64.trim()
        : "";
    const imageUrl =
      typeof body.image_url === "string" ? body.image_url.trim() : "";

    if (imageBase64) {
      const raw = imageBase64.startsWith("data:")
        ? imageBase64.split(",")[1]
        : imageBase64;
      const binaryStr = atob(raw);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      imgBlob = new Blob([bytes], { type: "image/png" });
      console.log(
        `[edit-logo] action=${action} user=${user.id} source=base64 size=${imgBlob.size}`,
      );
    } else if (imageUrl) {
      console.log(
        `[edit-logo] action=${action} user=${user.id} url=${imageUrl.substring(0, 100)}`,
      );
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        console.error(
          `[edit-logo] Failed to download source image: ${imgRes.status}`,
        );
        return jsonResponse(
          { error: "Impossible de telecharger l'image source." },
          400,
        );
      }
      imgBlob = await imgRes.blob();
      console.log(
        `[edit-logo] downloaded: content-type=${imgBlob.type} size=${imgBlob.size}`,
      );
    } else {
      return jsonResponse(
        { error: "image_url ou image_base64 est obligatoire." },
        400,
      );
    }

    // Build file for Recraft (must be PNG/JPG/WEBP)
    const ct = imgBlob.type || "image/png";
    const ext = ct.includes("webp")
      ? "webp"
      : ct.includes("jpeg") || ct.includes("jpg")
        ? "jpg"
        : "png";
    const fileToSend = new File([imgBlob], `logo.${ext}`, { type: ct });

    // Call Recraft removeBackground
    const formData = new FormData();
    formData.append("file", fileToSend);
    formData.append("response_format", "url");

    console.log(
      `[edit-logo] Calling Recraft removeBackground, file size=${fileToSend.size}, type=${ct}`,
    );

    const recraftRes = await fetch(`${RECRAFT_BASE}/removeBackground`, {
      method: "POST",
      headers: { Authorization: `Bearer ${recraftKey}` },
      body: formData,
    });

    if (!recraftRes.ok) {
      const errText = await recraftRes.text();
      console.error(
        `[edit-logo] Recraft removeBackground error ${recraftRes.status}: ${errText}`,
      );
      let detail = errText;
      try {
        const p = JSON.parse(errText);
        detail = p?.error?.message || p?.message || errText;
      } catch {
        /* keep raw */
      }
      return jsonResponse(
        { error: `Erreur Recraft (${recraftRes.status}): ${detail}` },
        502,
      );
    }

    const data = await recraftRes.json();
    const recraftUrl: string | undefined = data?.image?.url;
    if (!recraftUrl) {
      console.error(
        "[edit-logo] No URL in removeBackground response",
        JSON.stringify(data),
      );
      return jsonResponse(
        { error: "Aucune image retournee par Recraft." },
        502,
      );
    }

    console.log("[edit-logo] Recraft removeBackground successful");

    // Download result and store
    const resultRes = await fetch(recraftUrl);
    if (!resultRes.ok) {
      console.error(
        `[edit-logo] Failed to download Recraft result: ${resultRes.status}`,
      );
      return jsonResponse({ success: true, image_url: recraftUrl }, 200);
    }

    const resultBlob = await resultRes.blob();
    return await storeAndRespond(resultBlob, companyId, supabaseUrl);
  } catch (err) {
    console.error("[edit-logo] Unexpected error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

async function storeAndRespond(
  resultBlob: Blob,
  companyId: string,
  supabaseUrl: string,
): Promise<Response> {
  if (!companyId) {
    const bytes = new Uint8Array(await resultBlob.arrayBuffer());
    const b64 = btoa(String.fromCharCode(...bytes));
    const dataUrl = `data:${resultBlob.type || "image/png"};base64,${b64}`;
    return jsonResponse({ success: true, image_url: dataUrl }, 200);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    const ts = Date.now();
    const filePath = `${companyId}/logo-edited-${ts}.png`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("company-logos")
      .upload(filePath, resultBlob, {
        contentType: "image/png",
        upsert: true,
      });

    if (upErr) {
      console.error(`[edit-logo] Storage upload failed: ${upErr.message}`);
      return jsonResponse(
        { error: "Erreur lors de la sauvegarde du fichier." },
        500,
      );
    }

    const { data: pub } = supabaseAdmin.storage
      .from("company-logos")
      .getPublicUrl(filePath);

    console.log(`[edit-logo] Stored edited image: ${filePath}`);
    return jsonResponse({ success: true, image_url: pub.publicUrl }, 200);
  } catch (storeErr) {
    console.error("[edit-logo] Error storing result:", storeErr);
    return jsonResponse({ error: String(storeErr) }, 500);
  }
}
