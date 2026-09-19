// Etape « Securisation » : verification legere et automatique (action serveur connect_check).
//
// Apres un raccordement, le DNS est ecrit et le domaine rattache ; il ne reste qu'a constater que le site
// repond en HTTPS. Le serveur ne le fait pas tout seul : c'est l'ecran qui revient demander, a cadence
// fixe et pendant une duree limitee, avec la verification LEGERE (jamais le raccordement complet).
//
// Module pur (aucun import d'execution) : la cadence se teste sans navigateur. Le hook React
// useSecuringPoll ne fait que le brancher sur de vrais minuteurs et sur la visibilite de l'onglet.
import type { ConnectPhase, ConnectProgress } from './siteFlowModel';
import type { StatusTone } from './siteWorkspaceModel';

export const SECURING_FIRST_CHECK_MS = 10_000;
export const SECURING_INTERVAL_MS = 20_000;
export const SECURING_MAX_MS = 5 * 60_000;

export const SECURING_TEXT = 'Sécurisation de votre domaine… cela peut prendre quelques instants.';
export const SECURING_TIMEOUT_TEXT = 'La sécurisation prend plus de temps que prévu. Votre domaine reste configuré ; réessayez dans quelques minutes.';
export const SECURING_ERROR_TEXT = 'Impossible de vérifier le domaine pour le moment. Réessayez.';
export const SECURING_RESUME_TEXT = 'La mise en service doit être reprise pour se terminer.';
export const SECURING_DONE_TEXT = 'Domaine connecté : votre site est en ligne à cette adresse.';

/* Une reponse de raccordement qui ne demande plus qu'a etre constatee : verification legere automatique. */
export function needsSecuring(progress: ConnectProgress): boolean {
  return progress.status === 'pending' && progress.connectionStatus === 'verifying';
}

/* Domaine rouvert plus tard et reste en « verifying » : la verification legere repart d'elle-meme. */
export function autoCheckOnOpen(record: { registration_status: string; connection_status: string } | null | undefined): boolean {
  return !!record && (record.registration_status === 'registered' || record.registration_status === 'external')
    && record.connection_status === 'verifying';
}

export type CheckDecision = 'done' | 'wait' | 'resume' | 'error';

/* Pannes passageres : on continue d'attendre au lieu d'alarmer le client. */
const TRANSIENT = ['rate_limited', 'busy', 'provider_unavailable', 'timeout', 'network'];

export function checkDecision(progress: ConnectProgress): CheckDecision {
  if (progress.status === 'ok') return 'done';
  if (progress.status === 'pending') return 'wait';
  if (progress.status === 'blocked') {
    return progress.reason === 'resume_required' || progress.reason === 'not_attached' ? 'resume' : 'error';
  }
  return progress.reason !== null && TRANSIENT.includes(progress.reason) ? 'wait' : 'error';
}

/* Prochaine verification, ou null si la duree maximale serait depassee. Un delai serveur plus long prime. */
export function nextCheckDelay(progress: ConnectProgress, elapsedMs: number): number | null {
  const delay = Math.max(SECURING_INTERVAL_MS, (progress.retryAfterSeconds ?? 0) * 1000);
  return elapsedMs + delay > SECURING_MAX_MS ? null : delay;
}

/* ---------- Cadence : independante de React, pilotee par des minuteurs injectes ---------- */

export type SecuringPhase = 'idle' | 'waiting' | 'checking' | 'done' | 'timeout' | 'error' | 'resume';
export interface SecuringSnapshot { phase: SecuringPhase; last: ConnectProgress | null }

export interface SecuringPollerDeps {
  check(signal: AbortSignal): Promise<ConnectProgress>;
  now(): number;
  setTimer(run: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  isHidden(): boolean;
  onChange(snapshot: SecuringSnapshot): void;
}

export function createSecuringPoller(deps: SecuringPollerDeps) {
  let phase: SecuringPhase = 'idle';
  let last: ConnectProgress | null = null;
  let timer: unknown = null;
  let controller: AbortController | null = null;
  let startedAt = 0;
  let pausedMs = 0;
  let hiddenSince: number | null = null;
  let generation = 0;

  const emit = () => deps.onChange({ phase, last });
  const clearTimer = () => { if (timer !== null) deps.clearTimer(timer); timer = null; };
  // Le temps passe onglet cache ne compte pas dans la duree maximale.
  const elapsed = () => deps.now() - startedAt - pausedMs - (hiddenSince !== null ? deps.now() - hiddenSince : 0);
  const schedule = (ms: number) => {
    clearTimer();
    if (hiddenSince !== null) return; // reprise au retour de l'onglet
    const token = generation;
    timer = deps.setTimer(() => { timer = null; if (token === generation) void run(token); }, ms);
  };

  async function run(token: number) {
    if (phase !== 'waiting' || hiddenSince !== null) return;
    phase = 'checking';
    emit();
    controller = new AbortController();
    let progress: ConnectProgress;
    try {
      progress = await deps.check(controller.signal);
    } catch {
      progress = { status: 'unavailable', step: 'https', connectionStatus: 'verifying', reason: 'network', message: null, retryAfterSeconds: null };
    }
    if (token !== generation) return; // arrete ou relance entre-temps
    last = progress;
    const decision = checkDecision(progress);
    if (decision !== 'wait') {
      phase = decision;
      emit();
      return;
    }
    const delay = nextCheckDelay(progress, elapsed());
    phase = delay === null ? 'timeout' : 'waiting';
    emit();
    if (delay !== null) schedule(delay);
  }

  /* Coupe tout sans rien annoncer (demontage de l'ecran). */
  const dispose = () => {
    generation += 1;
    clearTimer();
    controller?.abort();
    controller = null;
  };

  return {
    start(firstCheckMs = SECURING_FIRST_CHECK_MS) {
      dispose();
      startedAt = deps.now();
      pausedMs = 0;
      hiddenSince = deps.isHidden() ? deps.now() : null;
      phase = 'waiting';
      last = null;
      emit();
      schedule(firstCheckMs);
    },
    /* Action volontaire du client : on arrete et l'ecran revient a son etat de base. */
    stop() {
      dispose();
      phase = 'idle';
      last = null;
      emit();
    },
    dispose,
    /* Onglet cache : pause. Retour : reprise rapide, le temps cache ne compte pas. */
    setHidden(hidden: boolean) {
      if (hidden && hiddenSince === null) {
        hiddenSince = deps.now();
        clearTimer();
      } else if (!hidden && hiddenSince !== null) {
        pausedMs += deps.now() - hiddenSince;
        hiddenSince = null;
        if (phase === 'waiting') schedule(1_000);
      }
    },
  };
}

/* ---------- Ce que l'ecran affiche ---------- */

export interface SecuringView {
  phase: ConnectPhase;
  status: ConnectProgress['status'];
  tone: StatusTone;
  text: string;
  /* Verification automatique en cours : ni « Réessayer » ni « Continuer ». */
  polling: boolean;
  canRetry: boolean;
  /* « resume » : le bouton relance la mise en service complete ; « light » : la seule verification legere. */
  retry: 'light' | 'resume' | null;
  retryLabel: string | null;
}

export function securingView(snapshot: SecuringSnapshot): SecuringView | null {
  const step: ConnectPhase = snapshot.last?.step === 'verify' ? 'verify' : 'https';
  switch (snapshot.phase) {
    case 'idle':
      return null;
    case 'waiting':
    case 'checking':
      return { phase: step, status: 'pending', tone: 'neutral', text: SECURING_TEXT, polling: true, canRetry: false, retry: null, retryLabel: null };
    case 'done':
      return { phase: 'done', status: 'ok', tone: 'success', text: SECURING_DONE_TEXT, polling: false, canRetry: false, retry: null, retryLabel: null };
    case 'timeout':
      return { phase: step, status: 'unavailable', tone: 'warning', text: SECURING_TIMEOUT_TEXT, polling: false, canRetry: true, retry: 'light', retryLabel: 'Réessayer' };
    case 'resume':
      return { phase: step, status: 'blocked', tone: 'warning', text: SECURING_RESUME_TEXT, polling: false, canRetry: true, retry: 'resume', retryLabel: 'Reprendre la mise en service' };
    default:
      return { phase: step, status: 'unavailable', tone: 'warning', text: SECURING_ERROR_TEXT, polling: false, canRetry: true, retry: 'light', retryLabel: 'Réessayer' };
  }
}
