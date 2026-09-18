// Deconnexion d'un domaine : on defait EXACTEMENT ce que Talvex avait pose, et rien d'autre.
//
// Deux actions :
//   disconnect_plan  : LECTURE SEULE. Montre ce qui serait remis en etat, ce qui serait retire,
//                      ce qui reste intact (messagerie comprise) et ce qui bloque. N'ecrit nulle part.
//   disconnect_apply : execute, etape par etape, de facon REPRENABLE.
//
// Ce que cette action ne fait JAMAIS, par construction (aucune route pour le faire n'existe) :
// supprimer le domaine du portefeuille Hostinger, le transferer, changer son renouvellement,
// toucher un enregistrement de messagerie, ni vider une zone.
import { ProviderError } from "./hostingerClient.ts";
import { parseZone } from "./dnsPlan.ts";
import {
  buildDeletePayload, buildRestorePayload, missingAfterRelease, planDnsRelease,
  readBackupZone, readWrittenRecords, type ReleasePlan,
} from "./dnsRelease.ts";
import type { ConnectDeps, SiteDomainState } from "./connect.ts";

export interface ReleaseActor {
  /* Qui a demande l'action : journalise, comme pour l'association d'un domaine. */
  actorId?: string | null;
  actorRole?: string | null;
}

export interface ReleaseDeps extends ConnectDeps {
  /* Detache le domaine du site cote Talvex (ligne conservee pour l'historique). */
  releaseSiteDomain(input: ReleaseActor & { siteDomainId: string; companyId: string; details: Record<string, unknown> }): Promise<boolean>;
  /* Fait d'un domaine deja actif le domaine principal du site. */
  promoteSiteDomain(input: ReleaseActor & { siteDomainId: string; companyId: string }): Promise<boolean>;
}

export type ReleaseStep = "read" | "vercel" | "dns" | "verify" | "done";

export interface ReleaseOutcome {
  status: "ok" | "blocked" | "unavailable";
  step: ReleaseStep;
  connection_status: string;
  plan?: unknown;
  conflicts?: unknown;
  reason?: string | null;
  message?: string | null;
  /*
   * Ce qui a DEJA ete defait quand l'operation n'est pas allee au bout. Indispensable pour ne jamais
   * affirmer qu'un domaine « continue de fonctionner » alors qu'il a deja ete retire de l'hebergement.
   */
  undone?: { hosting: string[]; dns: boolean };
  /* false : une ecriture a eu lieu mais la verification d'apres coup n'a pas pu etre faite. */
  verified?: boolean;
}

const providerReason = (error: unknown): string => (error instanceof ProviderError ? error.code : "provider_unavailable");
const isNotFound = (error: unknown): boolean => error instanceof ProviderError && error.code === "not_found";

/* Vue publique du plan : ce que le client (et Talvex) peut lire sans jargon de fournisseur. */
function publicPlan(plan: ReleasePlan) {
  return {
    domain: plan.domain,
    restore: plan.restore.map((r) => ({ name: r.name, type: r.type, values: r.values })),
    remove: plan.remove.map((r) => ({ name: r.name, type: r.type })),
    already_clean: plan.alreadyClean,
    preserved: plan.keep,
    history_missing: plan.historyMissing,
    nothing_to_do: plan.nothingToDo,
  };
}

async function readPlan(deps: ReleaseDeps, state: SiteDomainState): Promise<
  | { ok: true; plan: ReleasePlan }
  | { ok: false; reason: string; message: string }
> {
  if (!deps.dns || !deps.vercel) return { ok: false, reason: "provider_not_configured", message: "La deconnexion n'est pas configuree sur ce serveur." };
  let zoneRaw: unknown;
  try {
    zoneRaw = await deps.dns.getZone(state.domain);
  } catch (error) {
    return { ok: false, reason: providerReason(error), message: "La configuration actuelle du domaine n'a pas pu etre lue." };
  }
  const zone = parseZone(zoneRaw, state.domain);
  if (!zone) return { ok: false, reason: "bad_response", message: "La configuration actuelle du domaine n'a pas la forme attendue." };

  const written = readWrittenRecords(state.technicalDetails);
  const backup = readBackupZone(state.technicalDetails, state.domain);
  return { ok: true, plan: planDnsRelease(state.domain, zone, written, backup) };
}

/* disconnect_plan : aucune ecriture, nulle part. */
export async function disconnectPlan(deps: ReleaseDeps, state: SiteDomainState): Promise<ReleaseOutcome> {
  const read = await readPlan(deps, state);
  if (!read.ok) {
    return { status: "unavailable", step: "read", connection_status: state.connectionStatus, reason: read.reason, message: read.message };
  }
  return {
    status: read.plan.conflicts.length > 0 ? "blocked" : "ok",
    step: "read",
    connection_status: state.connectionStatus,
    plan: publicPlan(read.plan),
    conflicts: read.plan.conflicts,
    message: read.plan.conflicts.length > 0
      ? read.plan.conflicts[0].detail
      : read.plan.historyMissing
        ? "Aucune trace des reglages poses par Talvex : le domaine sera detache sans toucher a sa configuration."
        : null,
  };
}

/*
 * disconnect_apply. Ordre voulu : on retire d'abord le domaine de l'hebergement (il cesse d'etre servi),
 * puis on remet la configuration DNS dans son etat d'avant Talvex, puis seulement on detache la ligne.
 * Chaque etape est rejouable : un domaine deja retire ou un enregistrement deja remis en etat ne sont
 * pas des erreurs. Un conflit DNS arrete tout AVANT la moindre ecriture.
 */
export async function disconnectApply(deps: ReleaseDeps, state: SiteDomainState): Promise<ReleaseOutcome> {
  const untouched = { hosting: [] as string[], dns: false };
  const read = await readPlan(deps, state);
  if (!read.ok) {
    deps.log({ action: "disconnect_apply", outcome: "read_failed", reason: read.reason });
    return { status: "unavailable", step: "read", connection_status: state.connectionStatus, reason: read.reason, message: read.message, undone: untouched };
  }
  const plan = read.plan;
  if (plan.conflicts.length > 0) {
    deps.log({ action: "disconnect_apply", outcome: "dns_conflict", records: plan.conflicts.length });
    return {
      status: "blocked", step: "dns", connection_status: state.connectionStatus, reason: "dns_conflict",
      plan: publicPlan(plan), conflicts: plan.conflicts, undone: untouched,
      message: "La configuration du domaine a ete modifiee a la main depuis le raccordement : Talvex ne l'ecrase pas.",
    };
  }

  // 1. Hebergement : retrait du domaine et de son « www » du projet. Absent = deja fait.
  const vercelDone: string[] = [];
  const vercelFailed: Array<{ host: string; reason: string }> = [];
  if (state.vercelAttachedAt !== null) {
    for (const host of [`www.${state.domain}`, state.domain]) {
      try {
        await deps.vercel!.getProjectDomain(host);
      } catch (error) {
        if (isNotFound(error)) continue;
        vercelFailed.push({ host, reason: providerReason(error) });
        continue;
      }
      try {
        await deps.vercel!.removeProjectDomain(host);
        vercelDone.push(host);
      } catch (error) {
        if (!isNotFound(error)) vercelFailed.push({ host, reason: providerReason(error) });
      }
    }
    if (vercelFailed.length > 0) {
      // On n'ecrit AUCUN DNS tant que l'hebergement n'est pas proprement detache : relancer reprend ici.
      await deps.setConnection({
        siteDomainId: state.id, companyId: state.companyId, status: null, marks: [],
        details: { release_vercel_failed: vercelFailed },
        errorCode: vercelFailed[0].reason, errorMessage: "Le retrait de l'hebergement n'a pas abouti.",
      });
      deps.log({ action: "disconnect_apply", outcome: "vercel_failed", reason: vercelFailed[0].reason });
      return {
        status: "unavailable", step: "vercel", connection_status: state.connectionStatus, reason: vercelFailed[0].reason,
        plan: publicPlan(plan), undone: { hosting: vercelDone, dns: false },
        message: "Le domaine n'a pas pu etre retire de l'hebergement. Reessayez dans un instant.",
      };
    }
  }

  // 2. DNS : remise a l'etat d'origine, puis retrait des seuls enregistrements crees par Talvex.
  const restorePayload = buildRestorePayload(plan);
  if (restorePayload) {
    try {
      await deps.dns!.putZone(state.domain, restorePayload);
    } catch (error) {
      await deps.setConnection({
        siteDomainId: state.id, companyId: state.companyId, status: null, marks: [],
        details: { release_dns_failed: providerReason(error) },
        errorCode: providerReason(error), errorMessage: "La configuration d'origine n'a pas pu etre remise.",
      });
      deps.log({ action: "disconnect_apply", outcome: "dns_restore_failed", reason: providerReason(error) });
      return {
        status: "unavailable", step: "dns", connection_status: state.connectionStatus, reason: providerReason(error),
        plan: publicPlan(plan), undone: { hosting: vercelDone, dns: false },
        message: "La configuration d'origine du domaine n'a pas pu etre remise. Reessayez dans un instant.",
      };
    }
  }
  const deletePayload = buildDeletePayload(plan);
  if (deletePayload) {
    try {
      await deps.dns!.deleteRecords(state.domain, deletePayload);
    } catch (error) {
      deps.log({ action: "disconnect_apply", outcome: "dns_remove_failed", reason: providerReason(error) });
      return {
        status: "unavailable", step: "dns", connection_status: state.connectionStatus, reason: providerReason(error),
        plan: publicPlan(plan), undone: { hosting: vercelDone, dns: true },
        message: "Les reglages poses par Talvex n'ont pas tous pu etre retires. Reessayez dans un instant.",
      };
    }
  }

  // 3. Verification d'apres coup : tout ce qui devait rester (messagerie comprise) est-il toujours la ?
  let missing: Array<{ name: string; type: string }> = [];
  let verified = true;
  if (restorePayload || deletePayload) {
    try {
      const after = parseZone(await deps.dns!.getZone(state.domain), state.domain);
      if (after) missing = missingAfterRelease(plan, after);
      else verified = false;
    } catch {
      // Relecture impossible : on ne bloque pas la deconnexion, mais on ne pretend surtout pas avoir verifie.
      verified = false;
      missing = [];
    }
    if (missing.length > 0) {
      await deps.setConnection({
        siteDomainId: state.id, companyId: state.companyId, status: null, marks: [],
        details: { release_missing_records: missing },
        errorCode: "records_missing", errorMessage: "Des enregistrements qui devaient rester ont disparu.",
      });
      deps.log({ action: "disconnect_apply", outcome: "records_missing", records: missing.length });
      return {
        status: "blocked", step: "verify", connection_status: state.connectionStatus, reason: "records_missing",
        plan: publicPlan(plan), conflicts: missing, undone: { hosting: vercelDone, dns: true }, verified: true,
        message: "Des enregistrements qui devaient rester en place ont disparu : l'equipe Talvex doit verifier avant d'aller plus loin.",
      };
    }
  }

  // 4. Cote Talvex seulement : le domaine n'est plus celui du site. La ligne reste, pour l'historique.
  const released = await deps.releaseSiteDomain({
    siteDomainId: state.id,
    companyId: state.companyId,
    details: {
      released_at: new Date().toISOString(),
      release_vercel_removed: vercelDone,
      release_dns_restored: plan.restore.map((r) => `${r.name}|${r.type}`),
      release_dns_removed: plan.remove.map((r) => `${r.name}|${r.type}`),
      release_preserved: plan.keep.length,
      release_verified: verified,
    },
  });
  if (!released) {
    deps.log({ action: "disconnect_apply", outcome: "release_write_failed" });
    return {
      status: "unavailable", step: "done", connection_status: state.connectionStatus, reason: "provider_unavailable",
      plan: publicPlan(plan), undone: { hosting: vercelDone, dns: true },
      message: "Le domaine a ete retire de l'hebergement, mais l'enregistrement n'a pas abouti. Reessayez.",
    };
  }

  deps.log({ action: "disconnect_apply", outcome: "released", restored: plan.restore.length, removed: plan.remove.length, verified });
  return {
    status: "ok", step: "done", connection_status: "disconnected", plan: publicPlan(plan),
    undone: { hosting: vercelDone, dns: true }, verified,
    // Sans relecture reussie, on ne promet pas que rien d'autre n'a bouge : on le dit.
    message: verified
      ? "Domaine deconnecte. Il reste votre propriete et votre messagerie n'a pas ete touchee."
      : "Domaine deconnecte. La verification finale n'a pas pu etre faite : elle sera refaite automatiquement.",
  };
}
