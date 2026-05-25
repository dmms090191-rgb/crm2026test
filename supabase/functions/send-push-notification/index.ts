import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64 + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function uint8ToBase64Url(bytes: Uint8Array): string {
  let b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatUint8(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

async function generateVapidAuthHeader(
  endpoint: string,
  vapidSubject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp, sub: vapidSubject };

  const headerB64 = uint8ToBase64Url(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const payloadB64 = uint8ToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privKeyRaw = base64UrlToUint8Array(vapidPrivateKey);
  const pubKeyRaw = base64UrlToUint8Array(vapidPublicKey);

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: uint8ToBase64Url(privKeyRaw),
    x: uint8ToBase64Url(pubKeyRaw.slice(1, 33)),
    y: uint8ToBase64Url(pubKeyRaw.slice(33, 65)),
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(unsignedToken)
    )
  );
  const sigB64 = uint8ToBase64Url(sig);
  const token = `${unsignedToken}.${sigB64}`;

  return {
    authorization: `vapid t=${token}, k=${vapidPublicKey}`,
    cryptoKey: `p256ecdsa=${vapidPublicKey}`,
  };
}

async function encryptPayload(
  p256dhKey: string,
  authSecret: string,
  payload: string
): Promise<{ body: Uint8Array; salt: string; publicKey: string }> {
  const userPublicKey = base64UrlToUint8Array(p256dhKey);
  const userAuth = base64UrlToUint8Array(authSecret);

  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  const userImportedKey = await crypto.subtle.importKey(
    "raw",
    userPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: userImportedKey },
      localKeyPair.privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prkInfoInput = concatUint8(userAuth, authInfo);
  const prkKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const ikm = new Uint8Array(
    await crypto.subtle.sign("HMAC", prkKey, prkInfoInput)
  );

  const saltKey = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(
    await crypto.subtle.sign("HMAC", saltKey, ikm)
  );

  const cekInfo = concatUint8(
    new TextEncoder().encode("Content-Encoding: aesgcm\0"),
    new Uint8Array([0, 0, 0x00, 0x41]),
    userPublicKey,
    new Uint8Array([0, 0x41]),
    localPublicKeyRaw
  );
  const nonceInfo = concatUint8(
    new TextEncoder().encode("Content-Encoding: nonce\0"),
    new Uint8Array([0, 0, 0x00, 0x41]),
    userPublicKey,
    new Uint8Array([0, 0x41]),
    localPublicKeyRaw
  );

  const cekPrk = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const cekFull = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      cekPrk,
      concatUint8(cekInfo, new Uint8Array([1]))
    )
  );
  const cek = cekFull.slice(0, 16);

  const noncePrk = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const nonceFull = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      noncePrk,
      concatUint8(nonceInfo, new Uint8Array([1]))
    )
  );
  const nonce = nonceFull.slice(0, 12);

  const paddedPayload = concatUint8(
    new Uint8Array([0, 0]),
    new TextEncoder().encode(payload)
  );

  const encKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      encKey,
      paddedPayload
    )
  );

  return {
    body: encrypted,
    salt: uint8ToBase64Url(salt),
    publicKey: uint8ToBase64Url(localPublicKeyRaw),
  };
}

async function sendPush(
  sub: PushSubscriptionRow,
  payload: PushPayload,
  vapidSubject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ ok: boolean; status: number }> {
  const payloadJson = JSON.stringify(payload);
  const { body, salt, publicKey } = await encryptPayload(
    sub.p256dh,
    sub.auth,
    payloadJson
  );
  const vapid = await generateVapidAuthHeader(
    sub.endpoint,
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aesgcm",
      "Encryption": `salt=${salt}`,
      "Crypto-Key": `dh=${publicKey};${vapid.cryptoKey}`,
      Authorization: vapid.authorization,
      TTL: "86400",
    },
    body: body,
  });

  return { ok: res.ok, status: res.status };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@talvex.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (body.type === "test") {
      const { data: subs } = await adminClient
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth")
        .eq("user_id", user.id)
        .eq("enabled", true);

      if (!subs || subs.length === 0) {
        return new Response(
          JSON.stringify({ error: "No active subscriptions" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const payload: PushPayload = {
        title: "Talvex",
        body: "Les notifications telephone sont activees.",
        url: "/",
        tag: "talvex-test",
      };

      let sent = 0;
      for (const sub of subs) {
        const result = await sendPush(
          sub,
          payload,
          vapidSubject,
          vapidPublicKey,
          vapidPrivateKey
        );
        if (result.ok) {
          sent++;
          await adminClient
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", sub.id);
        } else if (result.status === 404 || result.status === 410) {
          await adminClient
            .from("push_subscriptions")
            .update({ enabled: false })
            .eq("id", sub.id);
        }
      }

      return new Response(JSON.stringify({ sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.type === "message") {
      const targetUserId = body.target_user_id;
      const title = body.title || "Talvex";
      const msgBody = body.body || "Nouveau message";
      const url = body.url || "/";
      const tag = body.tag || "talvex-message";

      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "target_user_id required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: subs } = await adminClient
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth")
        .eq("user_id", targetUserId)
        .eq("enabled", true);

      if (!subs || subs.length === 0) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload: PushPayload = { title, body: msgBody, url, tag };
      let sent = 0;

      for (const sub of subs) {
        const result = await sendPush(
          sub,
          payload,
          vapidSubject,
          vapidPublicKey,
          vapidPrivateKey
        );
        if (result.ok) {
          sent++;
          await adminClient
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", sub.id);
        } else if (result.status === 404 || result.status === 410) {
          await adminClient
            .from("push_subscriptions")
            .update({ enabled: false })
            .eq("id", sub.id);
        }
      }

      return new Response(JSON.stringify({ sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Unknown notification type" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
