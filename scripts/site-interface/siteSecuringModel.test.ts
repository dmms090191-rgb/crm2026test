// Tests de l'etape « Securisation » automatique (module pur, horloge simulee, aucun reseau).
//   node --test scripts/site-interface/siteSecuringModel.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SECURING_FIRST_CHECK_MS, SECURING_INTERVAL_MS, SECURING_MAX_MS, SECURING_TEXT, SECURING_TIMEOUT_TEXT,
  autoCheckOnOpen, checkDecision, createSecuringPoller, needsSecuring, nextCheckDelay, securingView,
  type SecuringSnapshot,
} from '../../src/lib/siteSecuringModel.ts';
import type { ConnectProgress } from '../../src/lib/siteFlowModel.ts';

const progress = (over: Partial<ConnectProgress>): ConnectProgress => ({
  status: 'pending', step: 'https', connectionStatus: 'verifying', reason: 'https_pending', message: null, retryAfterSeconds: null, ...over,
});
const PENDING = progress({});
const DONE = progress({ status: 'ok', step: 'done', connectionStatus: 'active', reason: null });

/* Horloge simulee : les minuteurs ne partent que quand on avance le temps. */
function harness(answers: Array<ConnectProgress | Error>) {
  let now = 0;
  let hidden = false;
  let nextId = 1;
  const timers = new Map<number, { at: number; run: () => void }>();
  const checksAt: number[] = [];
  const phases: string[] = [];
  let lastSnapshot: SecuringSnapshot = { phase: 'idle', last: null };
  const poller = createSecuringPoller({
    async check() {
      checksAt.push(now);
      const next = answers.length > 1 ? answers.shift()! : answers[0];
      if (next instanceof Error) throw next;
      return next;
    },
    now: () => now,
    setTimer: (run, ms) => { const id = nextId++; timers.set(id, { at: now + ms, run }); return id; },
    clearTimer: id => { timers.delete(id as number); },
    isHidden: () => hidden,
    onChange: s => { lastSnapshot = s; phases.push(s.phase); },
  });
  const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r)); };
  async function advance(ms: number) {
    const target = now + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      now = due[1].at;
      due[1].run();
      await flush();
    }
    now = target;
  }
  return {
    poller, advance, checksAt, phases,
    snapshot: () => lastSnapshot,
    pendingTimers: () => timers.size,
    setHidden(value: boolean) { hidden = value; poller.setHidden(value); },
  };
}

test('declenchement : seulement quand le serveur attend la securisation, et au retour sur un domaine en attente', () => {
  assert.equal(needsSecuring(PENDING), true);
  assert.equal(needsSecuring(progress({ step: 'verify', reason: 'not_verified_yet' })), true);
  assert.equal(needsSecuring(DONE), false);
  assert.equal(needsSecuring(progress({ status: 'unavailable', connectionStatus: 'not_started', reason: 'rate_limited' })), false);
  assert.equal(autoCheckOnOpen({ registration_status: 'registered', connection_status: 'verifying' }), true);
  assert.equal(autoCheckOnOpen({ registration_status: 'registered', connection_status: 'active' }), false);
  assert.equal(autoCheckOnOpen({ registration_status: 'released', connection_status: 'verifying' }), false);
  assert.equal(autoCheckOnOpen(null), false);
});

test('decision : succes, attente (y compris panne passagere), reprise complete, vraie erreur', () => {
  assert.equal(checkDecision(DONE), 'done');
  assert.equal(checkDecision(PENDING), 'wait');
  assert.equal(checkDecision(progress({ status: 'unavailable', reason: 'rate_limited', retryAfterSeconds: 30 })), 'wait');
  assert.equal(checkDecision(progress({ status: 'unavailable', reason: 'network' })), 'wait');
  assert.equal(checkDecision(progress({ status: 'blocked', reason: 'resume_required' })), 'resume');
  assert.equal(checkDecision(progress({ status: 'unavailable', reason: 'unauthenticated' })), 'error');
  assert.equal(checkDecision(progress({ status: 'blocked', reason: 'connect_disabled' })), 'error');
});

test('cadence : 20 s entre deux verifications, delai serveur respecte, arret au-dela de 5 minutes', () => {
  assert.equal(nextCheckDelay(PENDING, 0), SECURING_INTERVAL_MS);
  assert.equal(nextCheckDelay(progress({ status: 'unavailable', reason: 'rate_limited', retryAfterSeconds: 45 }), 0), 45_000);
  assert.equal(nextCheckDelay(PENDING, SECURING_MAX_MS - SECURING_INTERVAL_MS), SECURING_INTERVAL_MS);
  assert.equal(nextCheckDelay(PENDING, SECURING_MAX_MS - SECURING_INTERVAL_MS + 1), null);
});

test('premiere verification a 10 s, puis toutes les 20 s, arret immediat au succes', async () => {
  const h = harness([PENDING, PENDING, DONE]);
  h.poller.start();
  await h.advance(SECURING_FIRST_CHECK_MS - 1);
  assert.deepEqual(h.checksAt, [], 'rien avant 10 s');
  await h.advance(60_000);
  assert.deepEqual(h.checksAt, [10_000, 30_000, 50_000]);
  assert.equal(h.snapshot().phase, 'done');
  assert.equal(h.pendingTimers(), 0, 'plus aucune verification programmee apres le succes');
});

test('duree maximale : 5 minutes puis arret, « Réessayer » propose, relance legere', async () => {
  const h = harness([PENDING]);
  h.poller.start();
  await h.advance(10 * 60_000);
  assert.equal(h.snapshot().phase, 'timeout');
  assert.equal(h.pendingTimers(), 0);
  assert.ok(h.checksAt.length >= 14 && h.checksAt.length <= 15, `${h.checksAt.length} verifications`);
  assert.ok(h.checksAt.every(t => t <= SECURING_MAX_MS));
  const view = securingView(h.snapshot())!;
  assert.deepEqual([view.text, view.canRetry, view.retry, view.retryLabel, view.polling], [SECURING_TIMEOUT_TEXT, true, 'light', 'Réessayer', false]);
});

test('demontage de l ecran : arret immediat, meme avec une verification en vol', async () => {
  const h = harness([PENDING]);
  h.poller.start();
  await h.advance(SECURING_FIRST_CHECK_MS);
  assert.equal(h.checksAt.length, 1);
  h.poller.dispose();
  await h.advance(10 * 60_000);
  assert.equal(h.checksAt.length, 1, 'plus rien apres le demontage');
  assert.equal(h.pendingTimers(), 0);
});

test('onglet en arriere-plan : pause, puis reprise au retour ; le temps cache ne compte pas', async () => {
  const h = harness([PENDING]);
  h.poller.start();
  h.setHidden(true);
  await h.advance(30 * 60_000);
  assert.deepEqual(h.checksAt, [], 'aucune verification onglet cache');
  h.setHidden(false);
  await h.advance(1_000);
  assert.equal(h.checksAt.length, 1, 'reprise rapide au retour');
  await h.advance(2 * 60_000);
  assert.equal(h.snapshot().phase, 'waiting', 'les 30 minutes cachees ne declenchent pas le delai maximal');
});

test('retour plus tard sur un domaine en attente : verification immediate, puis succes', async () => {
  const h = harness([DONE]);
  h.poller.start(0);
  await h.advance(0);
  assert.deepEqual(h.checksAt, [0]);
  assert.equal(h.snapshot().phase, 'done');
});

test('pannes et reprise : erreur reseau passagere = on attend ; ligne a reprendre = bouton de reprise complete', async () => {
  const h = harness([new Error('reseau'), progress({ status: 'blocked', reason: 'resume_required' })]);
  h.poller.start();
  await h.advance(SECURING_FIRST_CHECK_MS);
  assert.equal(h.snapshot().phase, 'waiting', 'une coupure passagere ne stoppe pas la verification');
  await h.advance(SECURING_INTERVAL_MS);
  assert.equal(h.snapshot().phase, 'resume');
  const view = securingView(h.snapshot())!;
  assert.deepEqual([view.retry, view.retryLabel], ['resume', 'Reprendre la mise en service']);
});

test('affichage pendant la verification : texte demande, indicateur reel, aucun bouton', () => {
  const view = securingView({ phase: 'waiting', last: PENDING })!;
  assert.deepEqual([view.text, view.status, view.polling, view.canRetry, view.retry], [SECURING_TEXT, 'pending', true, false, null]);
  assert.equal(SECURING_TEXT, 'Sécurisation de votre domaine… cela peut prendre quelques instants.');
  assert.equal(securingView({ phase: 'idle', last: null }), null, 'hors verification, l ecran reprend son affichage normal');
  assert.doesNotMatch(JSON.stringify([SECURING_TEXT, SECURING_TIMEOUT_TEXT]), /DNS|Vercel|Hostinger|HTTPS|SSL|certificat/i);
});
