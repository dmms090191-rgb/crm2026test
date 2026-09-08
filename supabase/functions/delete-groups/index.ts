import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

type Ref = { bucket: string; path: string };
type Candidate = { email: string; auth_user_id: string };

const key = (r: Ref) => `${r.bucket}::${r.path}`;
const gone = (m: string) => /not found/i.test(m);

/**
 * Nettoyage post-COMMIT : Auth -> Clients -> Storage.
 * Idempotent : chaque element traite est note dans le job, un rejeu le saute.
 */
async function processJob(admin: SupabaseClient, job: Record<string, any>) {
  const errors: unknown[] = [...(job.errors ?? [])];
  const authDone = new Set<string>(job.auth_done ?? []);
  const clientsDone = new Set<string>(job.clients_done ?? []);
  const clientsKept = new Set<string>(job.clients_kept ?? []);
  const storageDone = new Set<string>((job.storage_done ?? []).map((r: Ref) => key(r)));

  const save = () =>
    admin.from("group_deletion_jobs").update({
      auth_done: [...authDone],
      clients_done: [...clientsDone],
      clients_kept: [...clientsKept],
      storage_done: (job.storage_targets ?? []).filter((r: Ref) => storageDone.has(key(r))),
      errors,
    }).eq("id", job.id);

  // ---- Auth : vendeurs, admins, compte du Groupe ----
  for (const id of (job.auth_to_delete ?? []) as string[]) {
    if (authDone.has(id)) continue;
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error && !gone(error.message)) errors.push({ phase: "auth", id, error: error.message });
    else authDone.add(id);
    await save();
  }

  // ---- Clients : candidats resolus en SQL. Aucun listUsers, aucune limite. ----
  for (const c of (job.client_candidates ?? []) as Candidate[]) {
    if (clientsDone.has(c.email) || clientsKept.has(c.email)) continue;

    const { data: linked, error: lErr } = await admin.rpc("client_still_linked", { p_email: c.email });
    if (lErr) {
      errors.push({ phase: "clients", email: c.email, error: lErr.message });
      await save();
      continue;
    }
    if (linked === true) {
      clientsKept.add(c.email); // encore rattache a une autre branche : compte conserve
      await save();
      continue;
    }

    const { error } = await admin.auth.admin.deleteUser(c.auth_user_id);
    if (error && !gone(error.message)) errors.push({ phase: "clients", email: c.email, error: error.message });
    else clientsDone.add(c.email);
    await save();
  }

  // ---- Storage : 4 buckets, groupes par bucket ----
  const pending = (job.storage_targets ?? []).filter((r: Ref) => !storageDone.has(key(r)));
  const buckets = new Map<string, Ref[]>();
  for (const r of pending) buckets.set(r.bucket, [...(buckets.get(r.bucket) ?? []), r]);

  for (const [bucket, refs] of buckets) {
    const { error } = await admin.storage.from(bucket).remove(refs.map((r) => decodeURIComponent(r.path)));
    if (error) errors.push({ phase: "storage", bucket, count: refs.length, error: error.message });
    else refs.forEach((r) => storageDone.add(key(r)));
    await save();
  }

  // ---- « ok » exige database + auth + clients + storage ----
  const authOk = authDone.size === (job.auth_to_delete ?? []).length;
  const clientsOk = clientsDone.size + clientsKept.size === (job.client_candidates ?? []).length;
  const storageOk = storageDone.size === (job.storage_targets ?? []).length;
  const status = authOk && clientsOk && storageOk ? "ok" : "partial";

  await admin.from("group_deletion_jobs").update({
    auth_status: authOk && clientsOk ? "done" : "partial",
    storage_status: storageOk ? "done" : "partial",
    completed_at: status === "ok" ? new Date().toISOString() : null,
  }).eq("id", job.id);

  return {
    job_id: job.id,
    group_label: job.group_label,
    status,
    counts: job.counts,
    auth: { deleted: authDone.size, expected: (job.auth_to_delete ?? []).length },
    clients: { deleted: [...clientsDone], kept_shared: [...clientsKept] },
    storage: { removed: storageDone.size, expected: (job.storage_targets ?? []).length },
    domains_left_at_registrar: job.domains,
    errors,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // Client porteur du JWT REEL : controle d'acces ET appel du RPC.
    const asCaller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller }, error: aErr } = await asCaller.auth.getUser();
    if (aErr || !caller) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "resume" ? "resume" : body.mode === "delete_company" ? "delete_company" : "delete";
    const callerRole = caller.app_metadata?.role;

    // Suppression d'un GROUPE : Talvex Administrateur uniquement.
    // Suppression d'une SOCIETE : Talvex, ou un Groupe pour SES propres Societes.
    // Le perimetre fin (parent_company_id) est verifie dans la fonction SQL.
    const allowed = mode === "delete_company"
      ? callerRole === "super_admin" || callerRole === "company_super_admin"
      : callerRole === "super_admin";
    if (!allowed) {
      return json({ error: "Forbidden: insufficient role for this operation" }, 403);
    }

    // service_role : Auth Admin API, Storage, journal. Aucun contexte utilisateur requis.
    const admin = createClient(url, svc);
    const report: unknown[] = [];

    if (mode === "resume") {
      let q = admin.from("group_deletion_jobs").select("*").or("auth_status.neq.done,storage_status.neq.done");
      if (Array.isArray(body.job_ids) && body.job_ids.length) q = q.in("id", body.job_ids);
      const { data: jobs, error } = await q;
      if (error) return json({ error: error.message }, 500);
      for (const job of jobs ?? []) report.push(await processJob(admin, job));
    } else if (mode === "delete_company") {
      // ---- Suppression d'une SOCIETE : perimetre strictement limite a elle-meme ----
      const ids: string[] = Array.isArray(body.company_ids) ? body.company_ids : [];
      if (!ids.length) return json({ error: "company_ids required" }, 400);

      for (const companyId of ids) {
        const entry: Record<string, unknown> = { company_id: companyId };

        // Toutes les gardes de perimetre sont dans la fonction SQL, appelee avec
        // le JWT REEL : super_admin, ou company_super_admin proprietaire du parent.
        const { data: res, error: rpcErr } = await asCaller.rpc("delete_company_cascade", {
          p_company_id: companyId,
        });
        if (rpcErr) {
          entry.status = "error"; entry.phase = "database"; entry.error = rpcErr.message;
          report.push(entry); continue;
        }

        const { data: job } = await admin.from("group_deletion_jobs").select("*").eq("id", res.job_id).single();
        report.push({ ...entry, ...(await processJob(admin, job)) });
      }
    } else {
      const ids: string[] = Array.isArray(body.group_user_ids) ? body.group_user_ids : [];
      if (!ids.length) return json({ error: "group_user_ids required" }, 400);

      // Boucle EXPLICITE : un perimetre resolu et verifie par Groupe.
      for (const groupUserId of ids) {
        const entry: Record<string, unknown> = { group_user_id: groupUserId };

        // Resolution SERVEUR : jamais un company_id fourni par le client.
        const { data: gu } = await admin.auth.admin.getUserById(groupUserId);
        const u = gu?.user;
        if (!u) {
          entry.status = "error"; entry.error = "Compte introuvable";
          report.push(entry); continue;
        }
        if (u.app_metadata?.role !== "company_super_admin") {
          entry.status = "error"; entry.error = "Ce compte n'est pas un Groupe";
          report.push(entry); continue;
        }
        const companyId = u.app_metadata?.company_id as string | undefined;
        if (!companyId) {
          entry.status = "error"; entry.error = "Aucun company_id";
          report.push(entry); continue;
        }
        entry.email = u.email;

        // Etage SQL : atomique. Appele avec le JWT REEL pour que get_my_role()
        // voie le vrai super_admin. SECURITY DEFINER fournit les privileges.
        const { data: res, error: rpcErr } = await asCaller.rpc("delete_group_cascade", {
          p_group_company_id: companyId,
        });
        if (rpcErr) {
          entry.status = "error"; entry.phase = "database"; entry.error = rpcErr.message;
          report.push(entry); continue; // rien supprime pour ce Groupe
        }

        const { data: job } = await admin.from("group_deletion_jobs").select("*").eq("id", res.job_id).single();
        report.push({ ...entry, ...(await processJob(admin, job)) });
      }
    }

    return json({ ok: report.every((r: any) => r.status === "ok"), mode, report });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
