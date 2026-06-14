import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ZONE_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#d946ef", "#84cc16", "#e11d48", "#0ea5e9", "#a855f7",
];

async function runReplicate(apiToken: string, imageBase64: string) {
  const dataUri = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/png;base64,${imageBase64}`;

  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Prefer: "wait=120",
    },
    body: JSON.stringify({
      version:
        "fe97b453a6455861e3bec01b4e2f7f28962e36f7f27e922b7acb6dd8ae95f10b",
      input: {
        image: dataUri,
        iou_threshold: 0.7,
        points_per_side: 32,
        pred_iou_thresh: 0.88,
        stability_score_thresh: 0.92,
        use_m2m: true,
        multimask_output: false,
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Replicate error ${createRes.status}: ${errText}`);
  }

  let prediction = await createRes.json();

  if (prediction.status === "starting" || prediction.status === "processing") {
    const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      prediction = await pollRes.json();
      if (prediction.status === "succeeded" || prediction.status === "failed") break;
    }
  }

  if (prediction.status === "failed") {
    throw new Error(prediction.error || "Replicate prediction failed");
  }

  return prediction.output;
}

interface RawMask {
  bbox: number[];
  area: number;
  predicted_iou: number;
  stability_score: number;
  segmentation?: string;
  mask_url?: string;
}

function processOutput(output: unknown, imgW: number, imgH: number) {
  const imgArea = imgW * imgH;
  let masks: RawMask[] = [];

  if (Array.isArray(output)) {
    masks = output as RawMask[];
  } else if (typeof output === "object" && output !== null) {
    const obj = output as Record<string, unknown>;
    if (Array.isArray(obj.masks)) masks = obj.masks as RawMask[];
    else if (Array.isArray(obj.annotations)) masks = obj.annotations as RawMask[];
    else if (typeof obj.combined_mask === "string") {
      return { zones: [], combinedMaskUrl: obj.combined_mask as string };
    }
  }

  const filtered = masks
    .filter((m) => {
      const areaRatio = (m.area || 0) / imgArea;
      return areaRatio > 0.005 && areaRatio < 0.85;
    })
    .sort((a, b) => (b.area || 0) - (a.area || 0))
    .slice(0, 20);

  const zones = filtered.map((m, i) => {
    const [x, y, x2, y2] = m.bbox || [0, 0, 0, 0];
    const w = x2 - x;
    const h = y2 - y;
    const areaRatio = (m.area || 0) / imgArea;
    const aspectRatio = w / Math.max(h, 1);
    const label = guessLabel(areaRatio, aspectRatio, w, h, i);

    return {
      id: `ai_zone_${i}`,
      label,
      type: classifyType(areaRatio, aspectRatio),
      confidence: m.predicted_iou || m.stability_score || 0.8,
      bbox: { x, y, w, h },
      area: m.area || 0,
      color: ZONE_COLORS[i % ZONE_COLORS.length],
      maskUrl: m.mask_url || m.segmentation || null,
    };
  });

  return { zones, combinedMaskUrl: null };
}

function guessLabel(areaRatio: number, aspect: number, w: number, h: number, idx: number): string {
  if (areaRatio > 0.3) return `Zone principale ${idx + 1}`;
  if (areaRatio > 0.15 && Math.abs(aspect - 1) < 0.3) return `Cercle / Forme ronde`;
  if (areaRatio > 0.08) return `Forme majeure ${idx + 1}`;
  if (aspect > 3 || aspect < 0.33) return `Trait decoratif ${idx + 1}`;
  if (areaRatio < 0.015) return `Detail / Petite forme ${idx + 1}`;
  return `Zone ${idx + 1}`;
}

function classifyType(areaRatio: number, aspect: number): string {
  if (areaRatio > 0.15 && Math.abs(aspect - 1) < 0.3) return "shape";
  if (aspect > 3 || aspect < 0.33) return "decoration";
  if (areaRatio < 0.02) return "detail";
  return "region";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiToken = Deno.env.get("REPLICATE_API_TOKEN");

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonRes({ error: "Corps de requete invalide (JSON attendu)." }, 400);
    }

    const { imageBase64, imageWidth, imageHeight, ping } = body;

    if (ping) {
      return jsonRes({ status: "ok", hasToken: !!apiToken });
    }

    if (!apiToken) {
      return jsonRes(
        { error: "REPLICATE_API_TOKEN manquant.", details: "Configurez le secret dans les parametres Edge Functions de Supabase." },
        500,
      );
    }

    if (!imageBase64) {
      return jsonRes({ error: "Image manquante." }, 400);
    }

    const imgW = (imageWidth as number) || 512;
    const imgH = (imageHeight as number) || 512;

    const b64 = String(imageBase64);
    const sizeEstimate = Math.round((b64.length * 3) / 4);
    if (sizeEstimate > 10_000_000) {
      return jsonRes({ error: "Image trop volumineuse.", details: `Taille estimee: ${Math.round(sizeEstimate / 1_000_000)} Mo. Max: 10 Mo.` }, 400);
    }

    const output = await runReplicate(apiToken, b64);
    const result = processOutput(output, imgW, imgH);

    return jsonRes({
      zones: result.zones,
      combinedMaskUrl: result.combinedMaskUrl,
      imageWidth: imgW,
      imageHeight: imgH,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("segment-logo-zones error:", msg);
    const safeMsg = msg.includes("Bearer") || msg.includes("token")
      ? "Erreur d'authentification Replicate."
      : msg;
    return jsonRes({ error: "Erreur pendant l'analyse IA.", details: safeMsg }, 500);
  }
});
