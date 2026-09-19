// Verification LEGERE d'un raccordement deja engage (action connect_check).
//
// Sert a finir l'etape « Securisation » sans relancer tout le raccordement : apres connect_apply, le DNS
// est deja ecrit et le domaine deja rattache ; il ne reste qu'a constater que tout est pret.
//
// Par construction, ses dependances sont un SOUS-ENSEMBLE STRICT de celles du raccordement :
//   - aucun acces au DNS (ni lecture de zone, ni ecriture) : aucun appel Hostinger n'est possible ;
//   - pas d'addProjectDomain : aucun rattachement a l'hebergement n'est possible ;
//   - aucune creation de ligne : seule la ligne existante peut passer de « verifying » a « active ».
// Le critere final est celui de connect_apply : Vercel voit les bons enregistrements (misconfigured faux)
// et le site repond en HTTPS depuis Vercel (la sonde echoue d'elle-meme si le certificat est invalide).
import { ProviderError } from "./hostingerClient.ts";
import { readVercelConfig, readVercelVerified } from "./connectClients.ts";
import type { ConnectDeps, ConnectOutcome, SiteDomainState } from "./connect.ts";

export interface CheckDeps {
  setConnection: ConnectDeps["setConnection"];
  vercel: {
    getProjectDomain(domain: string): Promise<unknown>;
    getDomainConfig(domain: string): Promise<unknown>;
    verifyProjectDomain(domain: string): Promise<unknown>;
  } | null;
  probeHttps: ConnectDeps["probeHttps"];
  log: ConnectDeps["log"];
}

const providerReason = (error: unknown): string => (error instanceof ProviderError ? error.code : "provider_unavailable");

/* Une verification legere n'a de sens que sur une ligne deja raccordee, en attente de securisation. */
export function isLightCheckable(state: SiteDomainState): boolean {
  return state.connectionStatus === "verifying";
}

export async function connectCheck(deps: CheckDeps, state: SiteDomainState): Promise<ConnectOutcome> {
  if (state.connectionStatus === "active") {
    return { status: "ok", step: "done", connection_status: "active", message: "Domaine connecte." };
  }
  if (!isLightCheckable(state)) {
    // Rien a constater : le raccordement lui-meme doit etre repris (connect_apply), jamais ici.
    return { status: "blocked", step: "https", connection_status: state.connectionStatus, reason: "resume_required",
      message: "La mise en service doit etre reprise." };
  }
  if (!deps.vercel) {
    return { status: "unavailable", step: "https", connection_status: state.connectionStatus, reason: "provider_not_configured" };
  }

  // 1. Le domaine est-il toujours rattache au projet ? S'il ne l'est plus, on ne le rattache PAS ici.
  let projectDomain: unknown;
  try {
    projectDomain = await deps.vercel.getProjectDomain(state.domain);
  } catch (error) {
    if (error instanceof ProviderError && error.code === "not_found") {
      deps.log({ action: "connect_check", outcome: "resume_required" });
      return { status: "blocked", step: "https", connection_status: state.connectionStatus, reason: "resume_required",
        message: "Le domaine n'est plus rattache a l'hebergement : la mise en service doit etre reprise." };
    }
    return { status: "unavailable", step: "https", connection_status: state.connectionStatus, reason: providerReason(error) };
  }

  // 2. Verification d'appartenance : completee si besoin (demande a l'hebergeur, sans rien ecrire au DNS).
  let verified = readVercelVerified(projectDomain);
  if (!verified) {
    try {
      verified = readVercelVerified(await deps.vercel.verifyProjectDomain(state.domain));
    } catch (error) {
      return { status: "pending", step: "verify", connection_status: state.connectionStatus, reason: providerReason(error) };
    }
    if (!verified) {
      return { status: "pending", step: "verify", connection_status: state.connectionStatus, reason: "not_verified_yet" };
    }
    await deps.setConnection({ siteDomainId: state.id, companyId: state.companyId, status: "verifying", marks: ["verified"] });
  }

  // 3. L'hebergeur voit-il les bons enregistrements ? (drapeau fourni par Vercel, aucune lecture de zone)
  let config: ReturnType<typeof readVercelConfig>;
  try {
    config = readVercelConfig(await deps.vercel.getDomainConfig(state.domain));
  } catch (error) {
    return { status: "unavailable", step: "https", connection_status: state.connectionStatus, reason: providerReason(error) };
  }
  if (!config) return { status: "unavailable", step: "https", connection_status: state.connectionStatus, reason: "bad_response" };
  if (config.misconfigured) {
    return { status: "pending", step: "https", connection_status: state.connectionStatus, reason: "dns_propagating" };
  }

  // 4. Le site repond-il en HTTPS depuis l'hebergeur, avec un certificat valide ?
  if (!(await deps.probeHttps(state.domain))) {
    return { status: "pending", step: "https", connection_status: state.connectionStatus, reason: "https_pending" };
  }

  // 5. Tout est pret : la MEME ligne passe en « active », exactement comme a la fin de connect_apply.
  await deps.setConnection({
    siteDomainId: state.id, companyId: state.companyId, status: "active", marks: ["https", "active"],
    details: { connected_at: new Date().toISOString() },
  });
  deps.log({ action: "connect_check", outcome: "connected" });
  return { status: "ok", step: "done", connection_status: "active", message: "Domaine connecte." };
}
