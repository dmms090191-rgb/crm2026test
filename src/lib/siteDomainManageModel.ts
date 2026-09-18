/*
 * Gestion du domaine d'un site, cote client : CHANGER de domaine et DECONNECTER.
 * Modele pur (aucun import d'execution) : testable avec node --test.
 *
 * Principe d'ecriture des messages : aucun jargon (ni DNS, ni hebergeur, ni fournisseur), jamais le nom
 * d'une autre entreprise, et toujours dire ce qui reste vrai pour le client (son site, ses e-mails,
 * la propriete de son domaine).
 */
import type { StatusTone } from './siteWorkspaceModel';
import type { ConnectPhase } from './siteFlowModel';

/*
 * Meme phrase d'attente que le parcours d'ajout (siteFlowModel.connectRetryText). Elle est recopiee ici
 * parce qu'un modele pur ne doit importer AUCUNE valeur d'un autre module (regle des tests node --test) ;
 * un test compare les deux mot pour mot, toute divergence future echoue.
 */
export function retryHint(reason: string | null): string {
  switch (reason) {
    case 'unauthenticated':
      return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
    case 'forbidden':
      return "Vous n'avez pas accès à cette entreprise.";
    case 'rate_limited':
    case 'busy':
      return 'Trop de vérifications en peu de temps. Réessayez dans une minute.';
    case 'provider_not_configured':
      return 'Cette vérification sera bientôt disponible.';
    default:
      return 'Réessayez dans quelques instants.';
  }
}

/* ---------- Avancement montre au client ----------
 * Deux listes : une pour « ajouter un domaine », une pour « en changer » (une etape de plus, la bascule).
 * Aucun mot technique n'y figure : ni DNS, ni certificat, ni le nom d'un fournisseur.
 */

/* « activate » n'existe pas cote serveur : c'est la bascule vers le nouveau domaine, montree au client. */
export type UiPhase = ConnectPhase | 'activate';

export interface DomainStepGroup {
  key: string;
  label: string;
  phases: UiPhase[];
}

export const DOMAIN_STEPS: DomainStepGroup[] = [
  { key: 'prepare', label: 'Préparation du domaine', phases: ['attach'] },
  { key: 'connect', label: 'Connexion', phases: ['dns', 'vercel', 'verify'] },
  { key: 'secure', label: 'Sécurisation', phases: ['https'] },
  { key: 'done', label: 'Terminé', phases: ['done'] },
];

export const SWITCH_STEPS: DomainStepGroup[] = [
  { key: 'prepare', label: 'Préparation du nouveau domaine', phases: ['attach'] },
  { key: 'connect', label: 'Connexion', phases: ['dns', 'vercel', 'verify'] },
  { key: 'secure', label: 'Sécurisation', phases: ['https'] },
  { key: 'activate', label: 'Activation', phases: ['activate'] },
  { key: 'done', label: 'Terminé', phases: ['done'] },
];

export type StepState = 'done' | 'current' | 'todo' | 'failed';
type ProgressStatus = 'ok' | 'pending' | 'blocked' | 'unavailable';

const groupOf = (steps: DomainStepGroup[], phase: UiPhase): number => {
  const index = steps.findIndex(group => group.phases.includes(phase));
  return index === -1 ? 1 : index;
};

export function domainStepState(index: number, current: UiPhase, status: ProgressStatus, steps: DomainStepGroup[] = DOMAIN_STEPS): StepState {
  const at = groupOf(steps, current);
  if (status === 'ok' && current === 'done') return 'done';
  if (index < at) return 'done';
  if (index > at) return 'todo';
  return status === 'blocked' || status === 'unavailable' ? 'failed' : 'current';
}

/* ---------- Changement de domaine ---------- */

export type SwitchStep = 'connect' | 'promote' | 'release' | 'done';

export interface SwitchProgress {
  status: ProgressStatus;
  step: SwitchStep;
  /* Nouveau domaine demande. */
  domain: string | null;
  /* Ancien domaine, tel que le serveur l'a retrouve (le navigateur ne le choisit jamais). */
  previousDomain: string | null;
  /*
   * Sort de l'ancien domaine :
   *   'detached' : retire proprement ; 'kept' : intact, il fonctionne toujours ;
   *   'partial'  : il ne mene deja plus au site, mais son retrait n'est pas termine.
   */
  previousState: 'detached' | 'kept' | 'partial' | null;
  /* Sous-etape reelle du raccordement (fournie par le serveur), sinon null. */
  connectStep: ConnectPhase | null;
  reason: string | null;
  message: string | null;
}

/* Etapes telles que le SERVEUR les nomme (a ne pas confondre avec SWITCH_STEPS, qui est l'affichage client). */
const SWITCH_SERVER_STEPS: SwitchStep[] = ['connect', 'promote', 'release', 'done'];
const CONNECT_PHASES: ConnectPhase[] = ['attach', 'dns', 'vercel', 'verify', 'https', 'done'];
const STATUSES: ProgressStatus[] = ['ok', 'pending', 'blocked', 'unavailable'];

export function parseSwitchResponse(httpStatus: number, body: unknown, asked: string): SwitchProgress {
  const fail = (reason: string): SwitchProgress => ({
    status: 'unavailable', step: 'connect', domain: asked, previousDomain: null, previousState: null,
    connectStep: null, reason, message: null,
  });
  if (httpStatus === 401) return fail('unauthenticated');
  if (httpStatus === 403) return fail('forbidden');
  const r = (body as { ok?: unknown; result?: Record<string, unknown> } | null)?.result;
  if (httpStatus !== 200 || (body as { ok?: unknown } | null)?.ok !== true || typeof r !== 'object' || r === null) {
    return fail('provider_unavailable');
  }
  if (!STATUSES.includes(r.status as ProgressStatus)) return fail('provider_unavailable');
  const previousState = r.previous_state === 'detached' || r.previous_state === 'kept' || r.previous_state === 'partial'
    ? r.previous_state
    : null;
  return {
    status: r.status as ProgressStatus,
    step: SWITCH_SERVER_STEPS.includes(r.step as SwitchStep) ? (r.step as SwitchStep) : 'connect',
    domain: typeof r.domain === 'string' ? r.domain : asked,
    previousDomain: typeof r.previous_domain === 'string' ? r.previous_domain : null,
    previousState,
    connectStep: CONNECT_PHASES.includes(r.connect_step as ConnectPhase) ? (r.connect_step as ConnectPhase) : null,
    reason: typeof r.reason === 'string' ? r.reason : null,
    message: typeof r.message === 'string' ? r.message : null,
  };
}

/* Phase affichee pendant un changement, y compris l'etape « Activation » propre a ce parcours. */
export function switchPhase(progress: SwitchProgress): UiPhase {
  if (progress.status === 'ok' && (progress.step === 'done' || progress.step === 'release')) return 'done';
  // On n'anticipe jamais : sans sous-etape connue, l'ecran reste sur « Connexion ».
  if (progress.step === 'connect') return progress.connectStep ?? 'dns';
  // Le nouveau domaine repond deja ; il ne reste que la bascule.
  return 'activate';
}

/*
 * Comme pour le raccordement : AUCUN texte du serveur n'est affiché tel quel. Le serveur donne l'état,
 * la raison, le nouveau et l'ancien domaine ; la phrase montrée au client est écrite ici.
 */
const SWITCH_PENDING: Record<string, string> = {
  https_pending: 'Sécurisation du nouveau domaine en cours.',
  dns_propagating: 'Le nouveau domaine se met en place : cela peut prendre quelques minutes.',
  not_verified_yet: 'Vérification du nouveau domaine en cours.',
};

export function switchMessage(progress: SwitchProgress): { tone: StatusTone; text: string; canRetry: boolean } {
  const nouveau = progress.domain ?? 'Ce domaine';
  const ancien = progress.previousDomain;
  if (progress.status === 'ok') {
    if (progress.previousState === 'kept' && ancien) {
      return {
        tone: 'warning', canRetry: false,
        text: `${nouveau} est maintenant l'adresse de votre site. L'ancienne adresse ${ancien} fonctionne toujours : Talvex la retirera, ou l'équipe s'en chargera si une vérification est nécessaire.`,
      };
    }
    if (progress.previousState === 'partial' && ancien) {
      return {
        tone: 'warning', canRetry: false,
        text: `${nouveau} est maintenant l'adresse de votre site. L'ancienne adresse ${ancien} ne mène plus au site ; son retrait sera terminé automatiquement.`,
      };
    }
    return { tone: 'success', text: `${nouveau} est maintenant l'adresse de votre site.`, canRetry: false };
  }
  if (progress.status === 'pending') {
    const base = (progress.reason && SWITCH_PENDING[progress.reason]) ?? 'Préparation du nouveau domaine : cela peut prendre quelques minutes.';
    return { tone: 'neutral', canRetry: true, text: ancien ? `${base} Votre site reste accessible sur ${ancien}.` : base };
  }
  if (progress.reason === 'taken') {
    return { tone: 'danger', text: 'Ce domaine est déjà utilisé. Choisissez un autre domaine.', canRetry: false };
  }
  if (progress.reason === 'not_in_portfolio') {
    return { tone: 'danger', text: "Ce domaine n'est pas disponible aujourd'hui. Vérifiez l'orthographe.", canRetry: false };
  }
  if (progress.reason === 'connect_disabled') {
    return { tone: 'neutral', text: 'Le changement de domaine sera activé très bientôt.', canRetry: false };
  }
  if (progress.reason === 'dns_conflict') {
    return {
      tone: 'warning', canRetry: false,
      text: `La configuration de ${nouveau} demande une intervention de l'équipe Talvex : rien n'a été modifié.${ancien ? ` Votre site reste accessible sur ${ancien}.` : ''}`,
    };
  }
  const tail = ancien ? ` Votre site reste accessible sur ${ancien}.` : '';
  // Une session expiree ou un droit manquant se disent tels quels ; tout le reste reste volontairement generique.
  const base = progress.reason === 'unauthenticated' || progress.reason === 'forbidden'
    ? retryHint(progress.reason)
    : 'Impossible de connecter le domaine pour le moment. Réessayez.';
  return { tone: 'warning', text: `${base}${tail}`, canRetry: true };
}

/* ---------- Deconnexion ---------- */

export type DisconnectStep = 'read' | 'vercel' | 'dns' | 'verify' | 'done';

export interface DisconnectResult {
  status: 'ok' | 'blocked' | 'unavailable';
  step: DisconnectStep;
  reason: string | null;
  message: string | null;
}

const DISCONNECT_STEPS: DisconnectStep[] = ['read', 'vercel', 'dns', 'verify', 'done'];

export function parseDisconnectResponse(httpStatus: number, body: unknown): DisconnectResult {
  const fail = (reason: string): DisconnectResult => ({ status: 'unavailable', step: 'read', reason, message: null });
  if (httpStatus === 401) return fail('unauthenticated');
  if (httpStatus === 403) return fail('forbidden');
  const r = (body as { ok?: unknown; result?: Record<string, unknown> } | null)?.result;
  if (httpStatus !== 200 || (body as { ok?: unknown } | null)?.ok !== true || typeof r !== 'object' || r === null) {
    return fail('provider_unavailable');
  }
  if (r.status !== 'ok' && r.status !== 'blocked' && r.status !== 'unavailable') return fail('provider_unavailable');
  return {
    status: r.status,
    step: DISCONNECT_STEPS.includes(r.step as DisconnectStep) ? (r.step as DisconnectStep) : 'read',
    reason: typeof r.reason === 'string' ? r.reason : null,
    message: typeof r.message === 'string' ? r.message : null,
  };
}

export function disconnectMessage(result: DisconnectResult): { tone: StatusTone; text: string; canRetry: boolean } {
  if (result.status === 'ok') {
    return {
      tone: 'success',
      text: 'Domaine déconnecté. Il reste votre propriété et vos e-mails ne sont pas touchés.',
      canRetry: false,
    };
  }
  if (result.reason === 'dns_conflict') {
    return {
      tone: 'warning',
      text: "La configuration de ce domaine a été modifiée en dehors de Talvex : par sécurité, rien n'a été changé. Contactez l'équipe Talvex.",
      canRetry: false,
    };
  }
  if (result.reason === 'records_missing') {
    return {
      tone: 'danger',
      text: "Une vérification de sécurité a échoué : l'équipe Talvex doit intervenir avant d'aller plus loin.",
      canRetry: false,
    };
  }
  if (result.reason === 'not_attached') {
    return { tone: 'warning', text: "Ce domaine n'est pas celui de votre site.", canRetry: false };
  }
  if (result.reason === 'connect_disabled') {
    return { tone: 'neutral', text: 'La déconnexion automatique sera activée très bientôt.', canRetry: false };
  }
  const base = result.reason === 'unauthenticated' || result.reason === 'forbidden'
    ? retryHint(result.reason)
    : 'Impossible de déconnecter le domaine pour le moment. Réessayez.';
  return { tone: 'warning', text: base, canRetry: true };
}

/* Texte de confirmation : ce que le client doit comprendre AVANT de valider. */
export const DISCONNECT_CONFIRM = {
  title: 'Déconnecter ce domaine ?',
  points: [
    'Votre site et vos réglages seront conservés. Seule l’adresse personnalisée sera déconnectée.',
    'Le domaine reste votre propriété et vos e-mails continuent de fonctionner.',
  ],
  confirm: 'Déconnecter',
  cancel: 'Annuler',
} as const;
