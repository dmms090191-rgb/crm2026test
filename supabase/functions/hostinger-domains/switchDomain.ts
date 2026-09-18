// Changement de domaine : le nouveau est prepare ENTIEREMENT avant que l'ancien ne bouge.
//
// Regle absolue : le site ne doit jamais tomber. L'ancien domaine continue de servir le site pendant
// toute la preparation du nouveau ; il n'est detache qu'apres que le nouveau soit reellement actif
// (DNS + hebergement + verification + HTTPS). Si quoi que ce soit echoue avant, l'ancien reste tel quel.
//
// Deux garanties ajoutees apres relecture :
//   - on n'affirme JAMAIS que l'ancien domaine « continue de fonctionner » sans le savoir : la
//     deconnexion dit ce qu'elle a deja defait, et le message le reprend fidelement ;
//   - si le detachement de l'ancien echoue APRES la promotion du nouveau, l'intention est memorisee
//     (« switch_release_domain ») et la relance de l'action la reprend : l'ancien domaine ne peut pas
//     rester attache indefiniment parce qu'il a perdu son statut de principal.
import { connectApply, type SiteDomainState } from "./connect.ts";
import { disconnectApply, type ReleaseDeps, type ReleaseOutcome } from "./disconnect.ts";

export type SwitchStep = "connect" | "promote" | "release" | "done";

export interface SwitchOutcome {
  status: "ok" | "pending" | "blocked" | "unavailable";
  step: SwitchStep;
  connection_status: string;
  domain: string;
  previous_domain: string | null;
  /*
   * Sort de l'ancien domaine :
   *   « detached » : retire proprement (hebergement + configuration d'origine remise) ;
   *   « kept »     : rien n'a bouge, il fonctionne toujours ;
   *   « partial »  : il a deja cesse d'etre servi, mais tout n'a pas pu etre defait.
   */
  previous_state: "detached" | "kept" | "partial" | null;
  /* Sous-etape reelle du raccordement du nouveau domaine : l'interface ne coche rien par anticipation. */
  connect_step?: string;
  reason?: string | null;
  message?: string | null;
  details?: unknown;
}

/* Le detachement n'a rien defait du tout : l'ancien domaine sert toujours le site. */
const nothingUndone = (released: ReleaseOutcome): boolean =>
  released.undone !== undefined && released.undone.hosting.length === 0 && released.undone.dns === false;

/* Domaine dont le detachement reste a terminer, memorise lors d'une tentative precedente. */
function pendingReleaseDomain(state: SiteDomainState): string | null {
  const value = (state.technicalDetails as { switch_release_domain?: unknown }).switch_release_domain;
  return typeof value === "string" && value !== "" && value !== state.domain ? value : null;
}

const rememberPending = (deps: ReleaseDeps, next: SiteDomainState, domain: string | null) =>
  deps.setConnection({
    siteDomainId: next.id, companyId: next.companyId, status: null, marks: [],
    details: { switch_release_domain: domain },
  });

/*
 * `next` est la ligne du NOUVEAU domaine, deja associee a l'entreprise (association faite en amont,
 * qui verifie portefeuille et droits). `current` est le domaine actuellement principal, s'il existe.
 * Relancer l'action reprend la ou elle s'est arretee : rien n'est refait deux fois.
 */
export async function switchApply(
  deps: ReleaseDeps,
  input: { next: SiteDomainState; current: SiteDomainState | null },
): Promise<SwitchOutcome> {
  const { next } = input;
  const current = input.current && input.current.id !== next.id ? input.current : null;
  const base = { domain: next.domain, previous_domain: current?.domain ?? null, previous_state: null as SwitchOutcome["previous_state"] };

  // 1. Preparer completement le nouveau domaine. L'ancien n'est pas touche a cette etape.
  const connected = await connectApply(deps, next);
  if (connected.status !== "ok" || connected.connection_status !== "active") {
    deps.log({ action: "switch_domain", outcome: `connect_${connected.status}`, step: connected.step });
    return {
      ...base,
      status: connected.status === "ok" ? "pending" : connected.status,
      step: "connect",
      connect_step: connected.step,
      connection_status: connected.connection_status,
      previous_state: current ? "kept" : null,
      reason: connected.reason ?? null,
      // Message rassurant : tant que le nouveau domaine n'est pas pret, l'ancien continue de servir.
      message: current
        ? `${connected.message ?? "Preparation du nouveau domaine en cours."} Votre site reste accessible sur ${current.domain}.`
        : connected.message ?? null,
    };
  }

  // 2. Le nouveau domaine repond vraiment : il devient le domaine principal du site.
  const promoted = await deps.promoteSiteDomain({ siteDomainId: next.id, companyId: next.companyId });
  if (!promoted) {
    deps.log({ action: "switch_domain", outcome: "promote_failed" });
    return {
      ...base, status: "unavailable", step: "promote", connection_status: "active",
      previous_state: current ? "kept" : null, reason: "promote_failed",
      message: "Le nouveau domaine fonctionne, mais il n'a pas encore pu devenir le domaine principal. Reessayez.",
    };
  }

  // 3. Seulement maintenant : detacher proprement l'ancien domaine. Si une tentative precedente s'est
  //    arretee apres la promotion, on reprend le domaine memorise a ce moment-la.
  let previous = current;
  if (!previous) {
    const pending = pendingReleaseDomain(next);
    if (pending) {
      previous = await deps.getSiteDomain(next.companyId, pending);
      // Deja detache entre-temps : on efface la marque et on s'arrete la.
      if (!previous) await rememberPending(deps, next, null);
    }
  }

  if (!previous) {
    deps.log({ action: "switch_domain", outcome: "switched_without_previous" });
    return { ...base, status: "ok", step: "done", connection_status: "active", message: `${next.domain} est maintenant l'adresse de votre site.` };
  }
  const previousDomain = previous.domain;

  const released = await disconnectApply(deps, previous);
  if (released.status !== "ok") {
    // Le changement est reussi : le nouveau domaine est actif et principal. L'ancien n'a pas pu etre
    // defait completement : on memorise pour reprendre, et on dit exactement ou il en est.
    await rememberPending(deps, next, previousDomain);
    const intact = nothingUndone(released);
    deps.log({ action: "switch_domain", outcome: intact ? "previous_kept" : "previous_partial", reason: released.reason ?? null });
    return {
      ...base, previous_domain: previousDomain, status: "ok", step: "release", connection_status: "active",
      previous_state: intact ? "kept" : "partial",
      reason: released.reason ?? null,
      message: intact
        ? `${next.domain} est maintenant l'adresse de votre site. L'ancienne adresse ${previousDomain} n'a pas pu etre detachee automatiquement et continue de fonctionner.`
        : `${next.domain} est maintenant l'adresse de votre site. L'ancienne adresse ${previousDomain} ne mene plus au site, mais son retrait n'a pas pu etre termine : Talvex le reprendra.`,
      details: released.plan ?? null,
    };
  }

  await rememberPending(deps, next, null);
  deps.log({ action: "switch_domain", outcome: "switched" });
  return {
    ...base, previous_domain: previousDomain, status: "ok", step: "done", connection_status: "active",
    previous_state: "detached",
    message: `${next.domain} est maintenant l'adresse de votre site.`,
  };
}
