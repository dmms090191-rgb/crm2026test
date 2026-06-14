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

function getCredentials() {
  const apiId = Deno.env.get("VECTORIZER_API_ID");
  const apiSecret = Deno.env.get("VECTORIZER_API_SECRET");
  if (!apiId || !apiSecret) return null;
  return { apiId, apiSecret, basic: btoa(`${apiId}:${apiSecret}`) };
}

async function fetchAccountCredits(basic: string): Promise<{ credits: number | null; subscription: string | null }> {
  try {
    const resp = await fetch("https://fr.vectorizer.ai/api/v1/account", {
      method: "GET",
      headers: { Authorization: `Basic ${basic}` },
    });
    if (!resp.ok) return { credits: null, subscription: null };
    const data = await resp.json();
    const credits = data?.subscriptionCreditsRemaining ?? data?.credits ?? null;
    const subscription = data?.subscriptionPlan ?? data?.plan ?? null;
    return { credits: typeof credits === "number" ? credits : null, subscription };
  } catch {
    return { credits: null, subscription: null };
  }
}

async function handleCreditsCheck(basic: string) {
  const account = await fetchAccountCredits(basic);
  return jsonRes({ credits: account.credits, subscription: account.subscription });
}

async function handleVectorize(req: Request, basic: string) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return jsonRes({ error: "Request must be multipart/form-data" }, 400);
  }

  const formData = await req.formData();
  const imageFile = formData.get("image");
  if (!imageFile || !(imageFile instanceof File)) {
    return jsonRes({ error: "No image file provided" }, 400);
  }

  const creditsBefore = await fetchAccountCredits(basic);

  const vectorizeForm = new FormData();
  vectorizeForm.append("image", imageFile);
  vectorizeForm.append("output.file_format", "svg");

  const response = await fetch("https://fr.vectorizer.ai/api/v1/vectorize", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
    body: vectorizeForm,
  });

  if (!response.ok) {
    const errorText = await response.text();
    return jsonRes({ error: `Vectorizer.AI error (${response.status})`, details: errorText }, response.status);
  }

  const svgContent = await response.text();
  const creditsAfter = await fetchAccountCredits(basic);

  return jsonRes({
    svg: svgContent,
    creditsBefore: creditsBefore.credits,
    creditsAfter: creditsAfter.credits,
    creditsUsed: creditsBefore.credits != null && creditsAfter.credits != null
      ? creditsBefore.credits - creditsAfter.credits
      : null,
    subscription: creditsAfter.subscription,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const creds = getCredentials();
    if (!creds) {
      return jsonRes({ error: "VECTORIZER_API_ID et VECTORIZER_API_SECRET manquants" }, 500);
    }

    const url = new URL(req.url);
    if (url.searchParams.get("action") === "credits" || req.method === "GET") {
      return await handleCreditsCheck(creds.basic);
    }

    return await handleVectorize(req, creds.basic);
  } catch (err) {
    return jsonRes({ error: "Internal server error", details: String(err) }, 500);
  }
});
