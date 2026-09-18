import { postToServer } from './domainSearch';
import {
  parseAttachResponse, parseConnectResponse, parseLookupResponse, unknownLookup,
  type AttachResult, type ConnectProgress, type DomainLookup,
} from './siteFlowModel';
import {
  parseDisconnectResponse, parseSwitchResponse,
  type DisconnectResult, type SwitchProgress,
} from './siteDomainManageModel';

/*
 * Etape « Connecter votre domaine » : navigateur -> serveur Talvex (hostinger-domains) -> Hostinger.
 * Le navigateur ne recoit JAMAIS le portefeuille Hostinger : il pose une question sur UN domaine precis
 * et recoit un verdict (trouve / deja utilise / introuvable), sans aucun detail sur une autre entreprise.
 */
export async function lookupDomain(companyId: string, domain: string, signal?: AbortSignal): Promise<DomainLookup> {
  const posted = await postToServer({ action: 'lookup_domain', company_id: companyId, domain }, signal);
  if (typeof posted === 'string') return unknownLookup(posted, domain);
  return parseLookupResponse(posted.status, posted.body, domain);
}

/* Association du domaine a l'entreprise ciblee. L'ecriture est faite par le serveur, jamais par le navigateur. */
export async function attachDomain(companyId: string, domain: string, signal?: AbortSignal): Promise<AttachResult> {
  const posted = await postToServer({ action: 'attach_domain', company_id: companyId, domain }, signal);
  if (typeof posted === 'string') return { status: 'unavailable', domain, reason: posted, retryAfterSeconds: null };
  return parseAttachResponse(posted.status, posted.body, domain);
}

/*
 * Raccordement : une seule action cote client. Le serveur lit la zone, ecrit uniquement ce qui sert au
 * site, rattache le domaine a l'hebergement, verifie, puis attend le certificat. Reprenable : rappeler
 * cette fonction poursuit la ou le raccordement s'etait arrete.
 */
export async function connectDomain(companyId: string, domain: string, signal?: AbortSignal): Promise<ConnectProgress> {
  const posted = await postToServer({ action: 'connect_apply', company_id: companyId, domain }, signal);
  if (typeof posted === 'string') return { status: 'unavailable', step: 'dns', connectionStatus: 'not_started', reason: posted, message: null };
  return parseConnectResponse(posted.status, posted.body);
}

/* Plan de raccordement (LECTURE SEULE) : sert a verifier ce qui serait ecrit avant de l'ecrire. */
export async function planDomainConnection(companyId: string, domain: string, signal?: AbortSignal): Promise<unknown> {
  const posted = await postToServer({ action: 'connect_plan', company_id: companyId, domain }, signal);
  return typeof posted === 'string' ? { status: 'unavailable', reason: posted } : posted.body;
}

/*
 * Changer de domaine. Le navigateur n'envoie QUE le nouveau domaine : c'est le serveur qui retrouve
 * l'ancien, ne le detache qu'apres avoir rendu le nouveau reellement actif, et ne le touche pas du tout
 * si quoi que ce soit echoue. Reprenable : rappeler cette fonction poursuit ou elle s'etait arretee.
 */
export async function switchDomain(companyId: string, domain: string, signal?: AbortSignal): Promise<SwitchProgress> {
  const posted = await postToServer({ action: 'switch_domain', company_id: companyId, domain }, signal);
  if (typeof posted === 'string') {
    return {
      status: 'unavailable', step: 'connect', domain, previousDomain: null, previousState: null,
      connectStep: null, reason: posted, message: null,
    };
  }
  return parseSwitchResponse(posted.status, posted.body, domain);
}

/* Deconnexion du domaine. Cote fournisseur, rien n'est supprime : le domaine reste la propriete du compte. */
export async function disconnectDomain(companyId: string, domain: string, signal?: AbortSignal): Promise<DisconnectResult> {
  const posted = await postToServer({ action: 'disconnect_apply', company_id: companyId, domain }, signal);
  if (typeof posted === 'string') return { status: 'unavailable', step: 'read', reason: posted, message: null };
  return parseDisconnectResponse(posted.status, posted.body);
}

/* Plan de deconnexion (LECTURE SEULE) : ce qui serait defait, ce qui resterait intact. Reserve a Talvex. */
export async function planDomainDisconnection(companyId: string, domain: string, signal?: AbortSignal): Promise<unknown> {
  const posted = await postToServer({ action: 'disconnect_plan', company_id: companyId, domain }, signal);
  return typeof posted === 'string' ? { status: 'unavailable', reason: posted } : posted.body;
}
