// Raccordement automatique d'un domaine deja associe : zone DNS Hostinger -> projet Vercel -> verification -> HTTPS.
//
// Deux actions seulement :
//   connect_plan  : LECTURE SEULE. Lit la zone et la configuration attendue par Vercel, et renvoie
//                   exactement ce qui serait ecrit. N'ecrit rien, nulle part.
//   connect_apply : execute le plan, etape par etape, de facon REPRENABLE (relancer apres une panne
//                   ou un delai reprend ou cela s'est arrete). Sauvegarde la zone avant d'ecrire.
//
// Jamais : reset de zone, suppression d'enregistrement, ecriture d'un MX / SPF / DKIM / DMARC,
// ni d'un enregistrement sans rapport avec le site.
import { ProviderError } from "./hostingerClient.ts";
import { readVercelChallenge, readVercelConfig, readVercelVerified } from "./connectClients.ts";
import { buildZonePayload, parseZone, planDnsChanges, type DnsPlan, type PlanChange, type VercelExpectation } from "./dnsPlan.ts";

export interface SiteDomainState {
  id: string;
  companyId: string;
  domain: string;
  connectionStatus: string;
  dnsConfiguredAt: string | null;
  vercelAttachedAt: string | null;
  verifiedAt: string | null;
  activatedAt: string | null;
  technicalDetails: Record<string, unknown>;
}

export interface ConnectDeps {
  getSiteDomain(companyId: string, domain: string): Promise<SiteDomainState | null>;
  setConnection(input: {
    siteDomainId: string; companyId: string; status: string | null; marks: string[];
    details?: Record<string, unknown>; errorCode?: string | null; errorMessage?: string | null;
  }): Promise<boolean>;
  dns: {
    getZone(domain: string): Promise<unknown>;
    listSnapshots(domain: string): Promise<unknown>;
    putZone(domain: string, payload: { overwrite: boolean; zone: unknown[] }): Promise<unknown>;
    /* Retrait d'ENREGISTREMENTS DNS cibles (jamais du domaine) : utilise seulement par la deconnexion. */
    deleteRecords(domain: string, payload: { filters: Array<{ name: string; type: string }> }): Promise<unknown>;
  } | null;
  vercel: {
    getProject(): Promise<unknown>;
    getDomainConfig(domain: string): Promise<unknown>;
    getProjectDomain(domain: string): Promise<unknown>;
    addProjectDomain(domain: string): Promise<unknown>;
    verifyProjectDomain(domain: string): Promise<unknown>;
    removeProjectDomain(domain: string): Promise<unknown>;
  } | null;
  /* Verification finale que le site repond vraiment en HTTPS sur ce domaine. */
  probeHttps(domain: string): Promise<boolean>;
  log(event: Record<string, string | number | boolean | null>): void;
}

export type ConnectStep = "attach" | "dns" | "vercel" | "verify" | "https" | "done";

export interface ConnectOutcome {
  status: "ok" | "pending" | "blocked" | "unavailable";
  step: ConnectStep;
  connection_status: string;
  plan?: unknown;
  conflicts?: unknown;
  reason?: string | null;
  message?: string | null;
}

const providerReason = (error: unknown): string => (error instanceof ProviderError ? error.code : "provider_unavailable");

/*
 * Memoire de ce que Talvex a ecrit sur ce domaine, cumulee d'une execution a l'autre : c'est elle qui
 * permet, le jour de la deconnexion, de defaire EXACTEMENT ce que Talvex a pose.
 * Regle essentielle : la valeur « previous » gardee est TOUJOURS celle d'AVANT Talvex. Si une deuxieme
 * ecriture remplace une valeur que Talvex avait deja posee (l'hebergeur change d'adresse, par exemple),
 * on met a jour la valeur posee mais on conserve l'origine, sans quoi une deconnexion « restaurerait »
 * une valeur de l'hebergeur au lieu de la configuration d'origine du client.
 */
export function mergeAppliedChanges(previous: unknown, changes: PlanChange[]): PlanChange[] {
  const rows = new Map<string, PlanChange>();
  if (Array.isArray(previous)) {
    for (const item of previous) {
      if (typeof item !== "object" || item === null) continue;
      const row = item as PlanChange;
      if (typeof row.name !== "string" || typeof row.type !== "string" || !Array.isArray(row.values)) continue;
      rows.set(`${row.name}|${row.type}`, row);
    }
  }
  for (const change of changes) {
    const key = `${change.name}|${change.type}`;
    const known = rows.get(key);
    rows.set(key, known ? { ...change, previous: known.previous } : change);
  }
  return [...rows.values()];
}

/*
 * Valeurs generiques que Vercel renvoie quand la demande n'est PAS rattachee au bon projet.
 * Elles sont perimees pour notre projet (mesure reelle : l'apex sert 216.198.79.1 et un CNAME propre).
 * Regle absolue : on ne les ecrit jamais ; en les voyant, on s'arrete.
 */
const GENERIC_IPV4 = "76.76.21.21";
const GENERIC_CNAME = "cname.vercel-dns.com";
const isGeneric = (config: { ipv4: string[]; cname: string | null }): boolean =>
  config.ipv4.includes(GENERIC_IPV4) || (config.cname ?? "").trim().toLowerCase().replace(/\.$/, "") === GENERIC_CNAME;

/* Etat + configuration attendue, sans rien ecrire. Utilise par connect_plan ET par connect_apply. */
async function readSituation(deps: ConnectDeps, domain: string): Promise<
  | { ok: true; expectation: VercelExpectation; plan: DnsPlan; zoneRaw: unknown; projectName: string }
  | { ok: false; reason: string; message: string }
> {
  if (!deps.dns || !deps.vercel) return { ok: false, reason: "provider_not_configured", message: "Le raccordement n'est pas configure sur ce serveur." };

  let zoneRaw: unknown;
  try {
    zoneRaw = await deps.dns.getZone(domain);
  } catch (error) {
    return { ok: false, reason: providerReason(error), message: "La zone DNS de ce domaine n'a pas pu etre lue." };
  }
  const zone = parseZone(zoneRaw, domain);
  if (!zone) return { ok: false, reason: "bad_response", message: "La zone DNS n'a pas la forme attendue." };

  // Le projet doit etre lisible : sans cela, la configuration renvoyee n'est pas celle du projet.
  let projectName: string | null = null;
  try {
    const project = await deps.vercel.getProject();
    const name = typeof project === "object" && project !== null ? (project as { name?: unknown }).name : null;
    projectName = typeof name === "string" && name !== "" ? name : null;
  } catch (error) {
    return { ok: false, reason: providerReason(error), message: "Le projet d'hebergement n'est pas lisible : configuration a verifier avant tout raccordement." };
  }
  if (!projectName) {
    return { ok: false, reason: "project_unreachable", message: "Le projet d'hebergement n'a pas pu etre identifie : aucun raccordement n'est tente." };
  }

  let configRaw: unknown;
  let domainRaw: unknown = null;
  try {
    configRaw = await deps.vercel.getDomainConfig(domain);
  } catch (error) {
    return { ok: false, reason: providerReason(error), message: "La configuration attendue par l'hebergeur n'a pas pu etre lue." };
  }
  try {
    domainRaw = await deps.vercel.getProjectDomain(domain);
  } catch (error) {
    // 404 = domaine pas encore rattache au projet : normal avant le premier raccordement.
    if (!(error instanceof ProviderError) || error.code !== "not_found") {
      return { ok: false, reason: providerReason(error), message: "L'etat du domaine chez l'hebergeur n'a pas pu etre lu." };
    }
  }
  const config = readVercelConfig(configRaw);
  if (!config) return { ok: false, reason: "bad_response", message: "La configuration attendue n'a pas la forme attendue." };
  if (isGeneric(config)) {
    return {
      ok: false, reason: "generic_config",
      message: "L'hebergeur a renvoye des valeurs generiques, pas celles de ce projet : aucun enregistrement ne sera ecrit.",
    };
  }
  if (config.ipv4.length === 0 && !config.cname) {
    return { ok: false, reason: "no_expected_config", message: "L'hebergeur n'a fourni aucune valeur pour ce domaine." };
  }

  const expectation: VercelExpectation = { ...config, challenge: readVercelChallenge(domainRaw) };
  return { ok: true, expectation, plan: planDnsChanges(domain, zone, expectation), zoneRaw, projectName };
}

/* connect_plan : ce qui serait ecrit, ce qui est preserve, ce qui bloque. Aucune ecriture. */
export async function connectPlan(deps: ConnectDeps, state: SiteDomainState): Promise<ConnectOutcome & { expected?: unknown }> {
  const situation = await readSituation(deps, state.domain);
  if (!situation.ok) {
    return { status: "unavailable", step: "dns", connection_status: state.connectionStatus, reason: situation.reason, message: situation.message };
  }
  return {
    status: situation.plan.conflicts.length > 0 ? "blocked" : "ok",
    step: "dns",
    connection_status: state.connectionStatus,
    plan: {
      domain: state.domain,
      project: situation.projectName,
      changes: situation.plan.changes,
      preserved: situation.plan.preserved,
      already_correct: situation.plan.alreadyCorrect,
      current_zone: situation.plan.current,
    },
    conflicts: situation.plan.conflicts,
    expected: { ipv4: situation.expectation.ipv4, cname: situation.expectation.cname, challenge: situation.expectation.challenge !== null },
  };
}

/*
 * connect_apply : une seule action cote client. Chaque etape est rejouable et ne refait jamais ce qui
 * est deja fait. Un echec laisse un etat explicite (dns_failed / verification_failed) et un message clair.
 */
export async function connectApply(deps: ConnectDeps, state: SiteDomainState): Promise<ConnectOutcome> {
  const fail = async (step: ConnectStep, status: string, reason: string, message: string): Promise<ConnectOutcome> => {
    // Un domaine deja actif ne redevient pas « en echec » parce qu'une relecture a rate : on garde son
    // etat (status null) et on note seulement l'erreur.
    const keep = state.connectionStatus === "active";
    await deps.setConnection({
      siteDomainId: state.id, companyId: state.companyId, status: keep ? null : status, marks: [],
      errorCode: reason, errorMessage: message,
    });
    deps.log({ action: "connect_apply", outcome: `${step}_failed`, reason });
    return { status: "unavailable", step, connection_status: keep ? state.connectionStatus : status, reason, message };
  };

  const situation = await readSituation(deps, state.domain);
  if (!situation.ok) return await fail("dns", "dns_failed", situation.reason, situation.message);
  if (situation.plan.conflicts.length > 0) {
    await deps.setConnection({
      siteDomainId: state.id, companyId: state.companyId, status: "dns_failed", marks: [],
      details: { dns_conflicts: situation.plan.conflicts },
      errorCode: "dns_conflict", errorMessage: situation.plan.conflicts[0].detail,
    });
    return { status: "blocked", step: "dns", connection_status: "dns_failed", conflicts: situation.plan.conflicts, reason: "dns_conflict", message: situation.plan.conflicts[0].detail };
  }

  // 1. DNS : sauvegarde de la zone AVANT toute ecriture, puis ecriture strictement ciblee.
  let applied = mergeAppliedChanges((state.technicalDetails as { dns_applied?: unknown }).dns_applied, []);
  const payload = buildZonePayload(situation.plan);
  if (payload) {
    // La sauvegarde de la zone est celle d'AVANT Talvex : on ne la remplace jamais par une zone deja modifiee.
    const firstBackup = (state.technicalDetails as { dns_backup?: unknown }).dns_backup === undefined;
    await deps.setConnection({
      siteDomainId: state.id, companyId: state.companyId, status: "dns_configuring", marks: [],
      details: {
        ...(firstBackup ? { dns_backup: { taken_at: new Date().toISOString(), zone: situation.zoneRaw } } : {}),
        dns_planned: situation.plan.changes,
      },
    });
    try {
      await deps.dns!.putZone(state.domain, payload);
    } catch (error) {
      return await fail("dns", "dns_failed", providerReason(error), "Les enregistrements DNS n'ont pas pu etre ecrits.");
    }
    await deps.setConnection({
      siteDomainId: state.id, companyId: state.companyId, status: "dns_configuring", marks: ["dns"],
      details: { dns_applied: (applied = mergeAppliedChanges(applied, situation.plan.changes)) },
    });
    deps.log({ action: "connect_apply", outcome: "dns_written", changes: situation.plan.changes.length });
  } else if (state.dnsConfiguredAt === null) {
    // Zone deja correcte : on marque quand meme l'etape franchie.
    await deps.setConnection({ siteDomainId: state.id, companyId: state.companyId, status: "dns_configuring", marks: ["dns"], details: { dns_already_correct: true } });
  }

  // 2. Rattachement au projet (idempotent : deja rattache = succes).
  let projectDomain: unknown = null;
  try {
    projectDomain = await deps.vercel!.getProjectDomain(state.domain);
  } catch (error) {
    if (!(error instanceof ProviderError) || error.code !== "not_found") {
      return await fail("vercel", "verification_failed", providerReason(error), "Le domaine n'a pas pu etre lu chez l'hebergeur.");
    }
    try {
      projectDomain = await deps.vercel!.addProjectDomain(state.domain);
    } catch (addError) {
      const reason = providerReason(addError);
      const message = reason === "invalid_request"
        ? "Ce domaine est deja utilise par un autre projet d'hebergement."
        : "Le domaine n'a pas pu etre ajoute a l'hebergement.";
      return await fail("vercel", "verification_failed", reason, message);
    }
  }
  /*
   * « www » : son CNAME pointe desormais vers l'hebergeur, il doit donc etre connu du projet, sinon son
   * certificat est invalide. Ajout non bloquant : le domaine principal reste prioritaire.
   */
  const wwwHost = `www.${state.domain}`;
  let wwwKnown = false;
  try {
    await deps.vercel!.getProjectDomain(wwwHost);
    wwwKnown = true;
  } catch (error) {
    if (error instanceof ProviderError && error.code === "not_found") {
      try {
        await deps.vercel!.addProjectDomain(wwwHost);
        wwwKnown = true;
      } catch (addError) {
        deps.log({ action: "connect_apply", outcome: "www_not_added", reason: providerReason(addError) });
      }
    }
  }
  await deps.setConnection({ siteDomainId: state.id, companyId: state.companyId, status: "verifying", marks: ["vercel"], details: { www_attached: wwwKnown } });

  // 3. Verification d'appartenance : declenchee automatiquement quand elle est possible.
  let verified = readVercelVerified(projectDomain);
  if (!verified) {
    const challenge = readVercelChallenge(projectDomain);
    if (challenge) {
      // Le defi TXT doit d'abord exister dans la zone : on repasse par le plan (ecriture ciblee du seul _vercel).
      const again = await readSituation(deps, state.domain);
      if (again.ok) {
        const txtChanges = again.plan.changes.filter((c) => c.type === "TXT");
        const txtPayload = buildZonePayload({ ...again.plan, changes: txtChanges });
        if (txtPayload) {
          try {
            await deps.dns!.putZone(state.domain, txtPayload);
            await deps.setConnection({
              siteDomainId: state.id, companyId: state.companyId, status: "verifying", marks: [],
              details: { vercel_challenge_written: true, dns_applied: (applied = mergeAppliedChanges(applied, txtChanges)) },
            });
          } catch (error) {
            return await fail("verify", "verification_failed", providerReason(error), "La preuve de propriete n'a pas pu etre ecrite.");
          }
        }
      }
    }
    try {
      const result = await deps.vercel!.verifyProjectDomain(state.domain);
      verified = readVercelVerified(result);
    } catch (error) {
      const reason = providerReason(error);
      // La propagation DNS peut prendre quelques minutes : ce n'est pas un echec definitif.
      deps.log({ action: "connect_apply", outcome: "verify_pending", reason });
      return { status: "pending", step: "verify", connection_status: "verifying", reason, message: "Verification en cours : la propagation peut prendre quelques minutes." };
    }
  }
  if (!verified) {
    return { status: "pending", step: "verify", connection_status: "verifying", reason: "not_verified_yet", message: "Verification en cours : la propagation peut prendre quelques minutes." };
  }
  await deps.setConnection({ siteDomainId: state.id, companyId: state.companyId, status: "verifying", marks: ["verified"] });

  // 4. Configuration DNS reellement vue par l'hebergeur, puis reponse HTTPS du site.
  const check = await readSituation(deps, state.domain);
  if (check.ok && check.expectation.misconfigured) {
    return { status: "pending", step: "https", connection_status: "verifying", reason: "dns_propagating", message: "Les nouveaux enregistrements ne sont pas encore visibles partout." };
  }
  const https = await deps.probeHttps(state.domain);
  if (!https) {
    return { status: "pending", step: "https", connection_status: "verifying", reason: "https_pending", message: "Le certificat de securite est en cours d'emission." };
  }

  await deps.setConnection({ siteDomainId: state.id, companyId: state.companyId, status: "active", marks: ["https", "active"], details: { connected_at: new Date().toISOString() } });
  deps.log({ action: "connect_apply", outcome: "connected" });
  return { status: "ok", step: "done", connection_status: "active", message: "Domaine connecte." };
}
