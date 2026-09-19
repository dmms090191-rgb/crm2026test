/*
 * Parcours du module Site : DOMAINE -> TEMPLATE -> SITE.
 * L'etape est deduite de l'etat reel (domaine associe, template choisi) : aucun assistant a refaire
 * quand tout est deja configure. Aucun import d'execution hors modeles purs : testable avec node --test.
 */
import type { StatusTone } from './siteWorkspaceModel';

export type SiteStep = 'domaine' | 'template' | 'site';

export interface SiteFlowState {
  /* Etape a afficher par defaut a l'ouverture. */
  step: SiteStep;
  hasDomain: boolean;
  hasTemplate: boolean;
  domain: string | null;
}

/*
 * Le domaine vient de domainSummary (site_domains, sinon ancienne colonne du site) et le template de
 * l'etat reel du site : ce modele ne devine rien et n'importe rien a l'execution.
 */
export function siteFlowState(input: { domain: string | null; hasTemplate: boolean }): SiteFlowState {
  const hasDomain = input.domain !== null && input.domain !== '';
  return {
    step: !hasDomain ? 'domaine' : !input.hasTemplate ? 'template' : 'site',
    hasDomain,
    // Un template reellement choisi reste un acquis, meme sans domaine : son site existe.
    hasTemplate: input.hasTemplate,
    domain: hasDomain ? input.domain : null,
  };
}

/*
 * Etapes accessibles : on ne saute jamais une etape jamais franchie, mais tout ce qui existe deja
 * reste atteignable. Un site qui a deja un template garde l'acces a son site et a la bibliotheque,
 * meme si son domaine a ete retire.
 */
export function reachableSteps(state: SiteFlowState): SiteStep[] {
  if (state.hasTemplate) return ['domaine', 'template', 'site'];
  if (state.hasDomain) return ['domaine', 'template'];
  return ['domaine'];
}

export function resolveStep(state: SiteFlowState, requested: SiteStep | null): SiteStep {
  return requested && reachableSteps(state).includes(requested) ? requested : state.step;
}

/* ---------- Etape 1 : connecter un domaine deja achete ---------- */

export type ConnectStatus =
  /* Present dans le portefeuille Talvex et libre pour cette entreprise. */
  | 'available'
  /* Deja associe a CETTE entreprise. */
  | 'already_yours'
  /* Deja utilise ailleurs : jamais de detail sur l'entite proprietaire. */
  | 'taken'
  | 'not_found'
  | 'invalid'
  | 'unavailable';

export interface DomainLookup {
  status: ConnectStatus;
  domain: string | null;
  expiresAt: string | null;
  reason: string | null;
  retryAfterSeconds: number | null;
}

const LOOKUP_STATUSES: ConnectStatus[] = ['available', 'already_yours', 'taken', 'not_found', 'invalid', 'unavailable'];
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?){1,2}$/;

export function unknownLookup(reason: string, domain: string | null = null): DomainLookup {
  return { status: 'unavailable', domain, expiresAt: null, reason, retryAfterSeconds: null };
}

/* Verification locale minimale : le serveur revalide tout (nom, droits, portefeuille). */
export function precheckDomainInput(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/?#].*$/, '').replace(/\.+$/, '').replace(/^www\./, '');
  if (value === '') return { ok: false, message: 'Entrez le nom de domaine, par exemple : johanna.com' };
  if (value.length > 253 || !DOMAIN_RE.test(value)) return { ok: false, message: 'Entrez le domaine complet, par exemple : monsite.fr' };
  return { ok: true, value };
}

/* Reponse du serveur -> verdict sur. Toute forme inattendue devient « verification impossible ». */
export function parseLookupResponse(httpStatus: number, body: unknown, asked: string): DomainLookup {
  if (httpStatus === 401) return unknownLookup('unauthenticated', asked);
  if (httpStatus === 403) return unknownLookup('forbidden', asked);
  const r = (body as { ok?: unknown; result?: Record<string, unknown> } | null)?.result;
  if (httpStatus !== 200 || (body as { ok?: unknown } | null)?.ok !== true || typeof r !== 'object' || r === null) {
    return unknownLookup('provider_unavailable', asked);
  }
  if (!LOOKUP_STATUSES.includes(r.status as ConnectStatus)) return unknownLookup('provider_unavailable', asked);
  const retry = Number.isSafeInteger(r.retry_after_seconds) && (r.retry_after_seconds as number) > 0 ? (r.retry_after_seconds as number) : null;
  return {
    status: r.status as ConnectStatus,
    domain: typeof r.domain === 'string' && DOMAIN_RE.test(r.domain) ? r.domain : asked,
    expiresAt: typeof r.expires_at === 'string' ? r.expires_at : null,
    reason: typeof r.reason === 'string' ? r.reason : null,
    retryAfterSeconds: retry,
  };
}

export interface LookupFeedback {
  tone: StatusTone;
  title: string;
  hint: string;
  /* Le bouton « Choisir ce domaine » n'apparait que pour un domaine reellement disponible. */
  canChoose: boolean;
}

/* Messages client : jamais le nom d'une autre entreprise, jamais de jargon fournisseur. */
export function lookupFeedback(lookup: DomainLookup): LookupFeedback {
  switch (lookup.status) {
    case 'available':
      return { tone: 'success', title: 'Domaine trouvé', hint: 'Ce domaine est disponible pour votre site.', canChoose: true };
    case 'already_yours':
      return { tone: 'success', title: 'Ce domaine est déjà le vôtre', hint: 'Il est déjà associé à votre site.', canChoose: false };
    case 'taken':
      return { tone: 'danger', title: 'Ce domaine est déjà utilisé', hint: 'Choisissez un autre domaine.', canChoose: false };
    case 'not_found':
      return { tone: 'danger', title: 'Domaine introuvable', hint: "Vérifiez l'orthographe. Ce domaine doit déjà vous appartenir avant d'être connecté.", canChoose: false };
    case 'invalid':
      return { tone: 'warning', title: 'Nom de domaine invalide', hint: 'Entrez le domaine complet, par exemple : monsite.fr', canChoose: false };
    default:
      return { tone: 'warning', title: 'Vérification impossible pour le moment', hint: connectRetryText(lookup.reason, lookup.retryAfterSeconds), canChoose: false };
  }
}

export function connectRetryText(reason: string | null, wait: number | null): string {
  const delay = wait && wait > 0 ? `${wait} s` : 'une minute';
  switch (reason) {
    case 'unauthenticated':
      return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
    case 'forbidden':
      return "Vous n'avez pas accès à cette entreprise.";
    case 'rate_limited':
    case 'busy':
      return `Trop de vérifications en peu de temps. Réessayez dans ${delay}.`;
    case 'provider_not_configured':
      return 'Cette vérification sera bientôt disponible.';
    default:
      return 'Réessayez dans quelques instants.';
  }
}

/* ---------- Association du domaine ---------- */

export type AttachStatus = 'attached' | 'taken' | 'not_found' | 'invalid' | 'unavailable';

export interface AttachResult {
  status: AttachStatus;
  domain: string | null;
  reason: string | null;
  retryAfterSeconds: number | null;
}

const ATTACH_STATUSES: AttachStatus[] = ['attached', 'taken', 'not_found', 'invalid', 'unavailable'];

export function parseAttachResponse(httpStatus: number, body: unknown, asked: string): AttachResult {
  const fail = (reason: string): AttachResult => ({ status: 'unavailable', domain: asked, reason, retryAfterSeconds: null });
  if (httpStatus === 401) return fail('unauthenticated');
  if (httpStatus === 403) return fail('forbidden');
  const r = (body as { ok?: unknown; result?: Record<string, unknown> } | null)?.result;
  if (httpStatus !== 200 || (body as { ok?: unknown } | null)?.ok !== true || typeof r !== 'object' || r === null) return fail('provider_unavailable');
  if (!ATTACH_STATUSES.includes(r.status as AttachStatus)) return fail('provider_unavailable');
  const retry = Number.isSafeInteger(r.retry_after_seconds) && (r.retry_after_seconds as number) > 0 ? (r.retry_after_seconds as number) : null;
  return {
    status: r.status as AttachStatus,
    domain: typeof r.domain === 'string' ? r.domain : asked,
    reason: typeof r.reason === 'string' ? r.reason : null,
    retryAfterSeconds: retry,
  };
}

export function attachMessage(result: AttachResult): { tone: StatusTone; text: string } {
  switch (result.status) {
    case 'attached':
      return { tone: 'success', text: `${result.domain} est maintenant le domaine de votre site.` };
    case 'taken':
      return { tone: 'danger', text: 'Ce domaine est déjà utilisé. Choisissez un autre domaine.' };
    case 'not_found':
      return { tone: 'danger', text: "Ce domaine n'a pas été trouvé. Vérifiez l'orthographe." };
    case 'invalid':
      return { tone: 'warning', text: 'Entrez le domaine complet, par exemple : monsite.fr' };
    default:
      return { tone: 'warning', text: `Le domaine n'a pas pu être associé. ${connectRetryText(result.reason, result.retryAfterSeconds)}` };
  }
}

/* ---------- Raccordement automatique du domaine ---------- */

export type ConnectPhase = 'attach' | 'dns' | 'vercel' | 'verify' | 'https' | 'done';

export interface ConnectProgress {
  status: 'ok' | 'pending' | 'blocked' | 'unavailable';
  step: ConnectPhase;
  connectionStatus: string;
  reason: string | null;
  message: string | null;
  /* Refus temporaire : delai annonce par le serveur avant de pouvoir reprendre (jamais jete). */
  retryAfterSeconds: number | null;
}

const PHASES: ConnectPhase[] = ['attach', 'dns', 'vercel', 'verify', 'https', 'done'];
const CONNECT_STATUSES = ['ok', 'pending', 'blocked', 'unavailable'];

export function parseConnectResponse(httpStatus: number, body: unknown): ConnectProgress {
  const fail = (reason: string): ConnectProgress => ({ status: 'unavailable', step: 'dns', connectionStatus: 'not_started', reason, message: null, retryAfterSeconds: null });
  if (httpStatus === 401) return fail('unauthenticated');
  if (httpStatus === 403) return fail('forbidden');
  const r = (body as { ok?: unknown; result?: Record<string, unknown> } | null)?.result;
  if (httpStatus !== 200 || (body as { ok?: unknown } | null)?.ok !== true || typeof r !== 'object' || r === null) return fail('provider_unavailable');
  if (!CONNECT_STATUSES.includes(r.status as string)) return fail('provider_unavailable');
  return {
    status: r.status as ConnectProgress['status'],
    step: PHASES.includes(r.step as ConnectPhase) ? (r.step as ConnectPhase) : 'dns',
    connectionStatus: typeof r.connection_status === 'string' ? r.connection_status : 'not_started',
    reason: typeof r.reason === 'string' ? r.reason : null,
    message: typeof r.message === 'string' ? r.message : null,
    retryAfterSeconds: Number.isSafeInteger(r.retry_after_seconds) && (r.retry_after_seconds as number) > 0 ? (r.retry_after_seconds as number) : null,
  };
}

/* Refus temporaire qui se reprend tout seul : delai court et annonce par le serveur, sinon null. */
export function autoRetryDelay(progress: ConnectProgress): number | null {
  const temporary = progress.status === 'unavailable' && (progress.reason === 'rate_limited' || progress.reason === 'busy');
  return temporary && progress.retryAfterSeconds !== null && progress.retryAfterSeconds <= 90 ? progress.retryAfterSeconds : null;
}

/* Etapes montrees au client pendant le raccordement, sans aucun jargon technique. */
export const CONNECT_STEPS: Array<{ phase: ConnectPhase; label: string }> = [
  { phase: 'attach', label: 'Domaine associé à votre site' },
  { phase: 'dns', label: 'Configuration du domaine' },
  { phase: 'verify', label: 'Vérification' },
  { phase: 'https', label: 'Sécurisation (HTTPS)' },
];

export function connectStepState(step: ConnectPhase, current: ConnectPhase, status: ConnectProgress['status']): 'done' | 'current' | 'todo' | 'failed' {
  const order = PHASES.indexOf(step);
  const at = PHASES.indexOf(current);
  if (status === 'ok' && current === 'done') return 'done';
  if (order < at) return 'done';
  if (order > at) return 'todo';
  return status === 'blocked' || status === 'unavailable' ? 'failed' : 'current';
}

/*
 * Textes du raccordement, ecrits ICI et jamais repris du serveur : les messages serveur peuvent contenir
 * le nom du fournisseur ou du vocabulaire technique (IPv6, CNAME, CAA...), qui n'a rien a faire sous les
 * yeux du client. Le serveur fournit un ETAT et une RAISON ; la phrase est choisie par l'interface.
 */
const CONNECT_PENDING: Record<string, string> = {
  https_pending: 'Sécurisation de votre adresse en cours. Cela prend généralement quelques minutes.',
  dns_propagating: 'Votre domaine se met en place. Cela prend généralement quelques minutes.',
  not_verified_yet: 'Vérification en cours : cela prend généralement quelques minutes.',
};

const CONNECT_BLOCKED: Record<string, string> = {
  dns_conflict: "La configuration de ce domaine demande une intervention de l'équipe Talvex : rien n'a été modifié.",
  not_in_portfolio: "Ce domaine n'est pas utilisable aujourd'hui. Vérifiez l'orthographe.",
  taken: 'Ce domaine est déjà utilisé.',
  not_attached: "Ce domaine n'est pas celui de votre site.",
};

export function connectMessage(progress: ConnectProgress, autoRetrying = false): { tone: StatusTone; text: string; canRetry: boolean } {
  if (progress.status === 'ok' && progress.step === 'done') {
    return { tone: 'success', text: 'Domaine connecté : votre site est en ligne à cette adresse.', canRetry: false };
  }
  if (progress.status === 'pending') {
    const text = (progress.reason && CONNECT_PENDING[progress.reason]) ?? 'Raccordement en cours : cela peut prendre quelques minutes.';
    return { tone: 'neutral', text, canRetry: true };
  }
  if (progress.reason === 'connect_disabled') {
    return { tone: 'neutral', text: 'Votre domaine est bien associé. Le raccordement automatique sera activé très bientôt.', canRetry: false };
  }
  if (progress.status === 'blocked') {
    const text = (progress.reason && CONNECT_BLOCKED[progress.reason]) ?? "La mise en service de ce domaine demande une vérification de l'équipe Talvex.";
    return { tone: 'warning', text, canRetry: false };
  }
  // Refus temporaire : on dit quand, et, si une reprise est programmee, qu'elle se fera toute seule.
  if (autoRetryDelay(progress) !== null) {
    return autoRetrying
      ? { tone: 'neutral', text: `Trop d'opérations en peu de temps : reprise automatique dans ${progress.retryAfterSeconds} s.`, canRetry: false }
      : { tone: 'warning', text: `Trop d'opérations en peu de temps. Réessayez dans ${progress.retryAfterSeconds} s.`, canRetry: true };
  }
  // Une session expiree ou un droit manquant se disent tels quels ; tout le reste reste volontairement generique.
  const text = progress.reason === 'unauthenticated' || progress.reason === 'forbidden'
    ? connectRetryText(progress.reason, null)
    : 'Impossible de connecter le domaine pour le moment. Réessayez.';
  return { tone: 'warning', text, canRetry: true };
}
