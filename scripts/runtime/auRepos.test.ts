/*
 * LE CRENEAU AU REPOS NE DOIT PLUS FAIRE PLANTER L'iPHONE.
 *   node --import tsx --test scripts/runtime/auRepos.test.ts
 *
 * ---------- POURQUOI CE FICHIER NAIT LE 29 OCTOBRE 2026 ----------
 *
 * David ouvre Talvex sur son iPhone et recoit « Can't find variable: requestIdleCallback »,
 * puis l'ecran de l'ErrorBoundary. Deux appels NUS partaient en production, dans le meme
 * morceau AdminDashboard-*.js (releve du jour : 110 morceaux lus sur 110, 5 400 Ko).
 *
 * IL N'EXISTAIT AUCUN RELEVE SUR CETTE VOIE, et c'est pire que cela : aucun de nos outils
 * ne POUVAIT la voir. TypeScript type requestIdleCallback sans reserve dans lib.dom.d.ts,
 * donc le typecheck etait vert. ESLint ne connait pas les navigateurs. Et sous Node, ou
 * tournent les releves, on a mesure ceci (Node 24.15, 29/10/2026) :
 *
 *     typeof globalThis.window                 undefined
 *     typeof globalThis.requestIdleCallback    undefined
 *
 * UN RELEVE NAIF N'AURAIT DONC EXERCE AUCUNE DES DEUX BRANCHES : pas celle du navigateur,
 * qui n'existe pas ici, et pas celle du repli, que le helper n'arme justement pas hors
 * navigateur. Il aurait mesure un troisieme monde, et serait passe au vert sans rien dire
 * des deux qui comptent.
 *
 * C'est la raison pour laquelle tout ce fichier s'exerce sur planifierAuReposSur, qui
 * recoit son hote en argument : c'est la seule facon de parcourir REELLEMENT les deux
 * branches depuis une machine qui n'est ni un iPhone ni un navigateur.
 *
 * ---------- CE QUE CE FICHIER NE PRETEND PAS ----------
 *
 * Aucun iPhone n'a ete touche. Il mesure du COMPORTEMENT sur des hotes simules et des
 * CHAINES dans les sources. Il ne prouve pas que Safari iOS affiche le panel : il prouve
 * qu'aucun appel direct ne subsiste pour l'en empecher.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  planifierAuRepos,
  planifierAuReposSur,
  DELAI_DE_REPLI_MS,
  type HoteAuRepos,
} from '../../src/lib/auRepos.ts';

const lire = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* Les commentaires sont retires AVANT toute recherche. Ce depot s'est fait mordre quatre
   fois par un garde-fou qui trouvait le motif interdit dans sa propre prose — et
   auRepos.ts, comme les deux appelants, EXPLIQUE longuement le defaut qu'il corrige. */
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/** Un appel NU — `requestIdleCallback(...)` sans objet devant — donc une ReferenceError. */
const APPEL_NU = /(^|[^.\w$])(request|cancel)IdleCallback\s*\(/;

const HELPER = 'src/lib/auRepos.ts';
const MOTEUR_MIROIR = 'src/boutique3d/moteur';

function fichiersSousSrc(): string[] {
  const out: string[] = [];
  const parcourir = (d: string) => {
    for (const e of readdirSync(new URL('../../' + d, import.meta.url), { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) parcourir(p);
      else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) out.push(p);
    }
  };
  parcourir('src');
  return out;
}

/**
 * Un hote simule. `creneau` dit s'il sait demander un creneau au repos — c'est-a-dire
 * s'il est Chrome, Edge, Firefox, Tauri, Android... ou Safari iOS.
 */
function hoteSimule(options: {
  creneau: boolean;
  annulation?: boolean;
  demanderLeve?: boolean;
  annulerLeve?: boolean;
  echeance?: unknown;
}) {
  const journal = {
    creneauxDemandes: 0,
    creneauxAnnules: [] as unknown[],
    minuteursArmes: [] as number[],
    minuteursArretes: [] as unknown[],
    argumentsRecus: [] as number[],
  };
  let rappelDuCreneau: ((...args: unknown[]) => void) | null = null;
  let rappelDuMinuteur: (() => void) | null = null;

  const hote: HoteAuRepos = {
    setTimeout: (tache: () => void, delai: number) => {
      journal.minuteursArmes.push(delai);
      rappelDuMinuteur = tache;
      return { minuteur: journal.minuteursArmes.length };
    },
    clearTimeout: (jeton: unknown) => { journal.minuteursArretes.push(jeton); },
  };
  if (options.creneau) {
    hote.requestIdleCallback = (rappel: (...args: unknown[]) => void) => {
      if (options.demanderLeve) throw new Error('refus simule du moteur');
      journal.creneauxDemandes++;
      rappelDuCreneau = rappel;
      return { creneau: journal.creneauxDemandes };
    };
  }
  if (options.creneau && options.annulation !== false) {
    hote.cancelIdleCallback = (jeton: unknown) => {
      if (options.annulerLeve) throw new Error('annulation impossible, simulee');
      journal.creneauxAnnules.push(jeton);
    };
  }

  /** Fait passer le creneau, comme le navigateur le ferait — avec son IdleDeadline. */
  const declencherLeCreneau = () => {
    assert.ok(rappelDuCreneau, 'aucun creneau n a ete demande');
    rappelDuCreneau(options.echeance ?? { didTimeout: false, timeRemaining: () => 49 });
  };
  const declencherLeMinuteur = () => {
    assert.ok(rappelDuMinuteur, 'aucun minuteur n a ete arme');
    (rappelDuMinuteur as (...args: unknown[]) => void)();
  };

  const tache = (...args: unknown[]) => { journal.argumentsRecus.push(args.length); };

  return { hote, journal, tache, declencherLeCreneau, declencherLeMinuteur };
}

// =================== A. LE COMPORTEMENT, SUR LES DEUX FAMILLES DE MOTEURS

test("A1 un moteur SANS creneau au repos (Safari iOS) execute quand meme la tache", () => {
  const s = hoteSimule({ creneau: false });
  planifierAuReposSur(s.hote, s.tache);
  assert.equal(s.journal.minuteursArmes.length, 1, 'le minuteur de repli n a pas ete arme');
  assert.equal(s.journal.argumentsRecus.length, 0, 'la tache est partie trop tot');
  s.declencherLeMinuteur();
  assert.equal(s.journal.argumentsRecus.length, 1, 'la tache n est jamais partie : le prechargement est perdu');
});

test('A2 le delai du repli est celui de la constante exportee, et il est borne', () => {
  const s = hoteSimule({ creneau: false });
  planifierAuReposSur(s.hote, s.tache);
  assert.equal(s.journal.minuteursArmes[0], DELAI_DE_REPLI_MS);
  /* Les deux bornes de l arbitrage, ecrites pour qu un changement se discute : trop court,
     la tache concurrence le premier rendu ; trop long, elle arrive apres le clic. */
  assert.ok(DELAI_DE_REPLI_MS > 0, 'un delai nul remet la concurrence avec le premier rendu');
  assert.ok(DELAI_DE_REPLI_MS <= 1000, 'au-dela d une seconde, le prechargement ne sert plus le clic');
});

test("A3 l'annulation rendue par le repli arrete bien le minuteur", () => {
  const s = hoteSimule({ creneau: false });
  const annuler = planifierAuReposSur(s.hote, s.tache);
  annuler();
  assert.equal(s.journal.minuteursArretes.length, 1, 'le minuteur survit au demontage');
});

test('A4 un moteur AVEC creneau au repos l utilise, et n arme AUCUN minuteur', () => {
  const s = hoteSimule({ creneau: true });
  planifierAuReposSur(s.hote, s.tache);
  assert.equal(s.journal.creneauxDemandes, 1);
  assert.equal(s.journal.minuteursArmes.length, 0, 'le repli s est arme en plus du creneau : la tache partirait deux fois');
  s.declencherLeCreneau();
  assert.equal(s.journal.argumentsRecus.length, 1);
});

test("A5 l'annulation passe au moteur le JETON qu'il a rendu, pas autre chose", () => {
  const s = hoteSimule({ creneau: true });
  const annuler = planifierAuReposSur(s.hote, s.tache);
  annuler();
  assert.deepEqual(s.journal.creneauxAnnules, [{ creneau: 1 }],
    'un mauvais jeton laisse le creneau vivant apres le demontage du composant');
});

// =================== B. LES TROIS MOTEURS DE TRAVERS QU'ON A VOULU COUVRIR

test('B1 un moteur qui sait demander mais pas annuler retombe sur le minuteur', () => {
  /* On EXIGE les deux fonctions. Demander sans pouvoir annuler laisserait une tache
     qu aucun demontage ne reprend : le composant parti, elle pointerait encore vers lui. */
  const s = hoteSimule({ creneau: true, annulation: false });
  planifierAuReposSur(s.hote, s.tache);
  assert.equal(s.journal.creneauxDemandes, 0, 'un creneau inannulable a quand meme ete demande');
  assert.equal(s.journal.minuteursArmes.length, 1, 'ni creneau ni minuteur : la tache est perdue');
});

test('B2 un requestIdleCallback qui LEVE ne perd pas la tache, et ne la double pas', () => {
  const s = hoteSimule({ creneau: true, demanderLeve: true });
  assert.doesNotThrow(() => planifierAuReposSur(s.hote, s.tache),
    'la levee remonte jusqu au useEffect, donc jusqu a l ErrorBoundary');
  assert.equal(s.journal.minuteursArmes.length, 1, 'le repli n a pas pris la suite');
  s.declencherLeMinuteur();
  assert.equal(s.journal.argumentsRecus.length, 1, 'la tache est partie zero ou deux fois');
});

test("B3 une annulation qui leve ne casse pas le demontage du composant", () => {
  /* Le nettoyage d un useEffect est appele par React en chaine : une exception ici
     empecherait les effets SUIVANTS du meme composant de se nettoyer. */
  const s = hoteSimule({ creneau: true, annulerLeve: true });
  const annuler = planifierAuReposSur(s.hote, s.tache);
  assert.doesNotThrow(annuler);
});

test("B4 la tache ne recoit AUCUN argument, meme quand le moteur passe une echeance", () => {
  /* requestIdleCallback remet un IdleDeadline a son rappel. Le repli, lui, ne peut que le
     CONTREFAIRE — et une echeance inventee serait pire qu absente, puisque l appelant la
     croirait. Le helper coupe donc l argument DES DEUX COTES : ainsi aucun appelant ne peut
     prendre l habitude d une echeance qu il n aura pas sur iPhone. */
  const s = hoteSimule({ creneau: true, echeance: { didTimeout: false, timeRemaining: () => 49 } });
  planifierAuReposSur(s.hote, s.tache);
  s.declencherLeCreneau();
  assert.deepEqual(s.journal.argumentsRecus, [0],
    'une echeance a fuite jusqu a la tache : un appelant finirait par s y fier');
});

test('B5 hors navigateur, planifierAuRepos ne planifie RIEN du tout', async () => {
  /* Sous Node il n y a pas d ecran a preparer, et un minuteur pose la tiendrait le
     processus eveille apres la fin du releve qui l a declenche.
     ON ATTEND REELLEMENT, au-dela du delai de repli : sans cette attente, le releve
     resterait vert meme si le helper se branchait sur globalThis — qui, sous Node, PORTE
     requestIdleCallback. C est le piege central de ce fichier, et il vaut aussi ici. */
  assert.equal(typeof globalThis.window, 'undefined', 'ce releve suppose un Node sans window');
  let partie = 0;
  const annuler = planifierAuRepos(() => { partie++; });
  assert.equal(typeof annuler, 'function');
  /* ON N'ANNULE PAS AVANT D'ATTENDRE, et c'est tout l'interet de l'ordre choisi ici.
     La premiere version de ce releve appelait l'annulation d'abord : elle arretait donc
     le minuteur qu'on voulait surprendre, et la mutation « se brancher sur globalThis »
     SURVIVAIT au balayage. Le releve etait vert, et ne regardait rien. */
  await new Promise((r) => setTimeout(r, DELAI_DE_REPLI_MS + 80));
  assert.equal(partie, 0, 'une tache a ete planifiee hors navigateur : elle survit au releve qui l a creee');
  /* L'annulation d'un non-planifie ne doit pas lever pour autant : React appellera ce
     nettoyage comme les autres, sans savoir qu'il n'y avait rien a annuler. */
  assert.doesNotThrow(annuler);
});

// =================== C. PLUS AUCUN APPEL DIRECT DANS TOUT src/

test('C1 AUCUN fichier de src/ n appelle requestIdleCallback ni cancelIdleCallback en direct', () => {
  /* LA LISTE BLANCHE NE CONTIENT QUE LE HELPER, et doit le rester. C est la garantie que
     David a demandee : « aucun appel direct non protege ne doit rester ». Un appel nu est
     une ReferenceError sur Safari iOS, et depuis un useEffect il emporte tout le panel. */
  const coupables = fichiersSousSrc()
    .filter((p) => p !== HELPER && !p.startsWith(MOTEUR_MIROIR))
    .filter((p) => /(request|cancel)IdleCallback/.test(sansCommentaires(lire(p))));
  assert.deepEqual(coupables, [],
    'ces fichiers nomment requestIdleCallback hors commentaire : ils doivent passer par planifierAuRepos');
});

test('C2 le helper lui-meme ne porte aucun appel NU : il passe toujours par son hote', () => {
  const code = sansCommentaires(lire(HELPER));
  assert.doesNotMatch(code, APPEL_NU,
    'le helper est redevenu la source du defaut qu il corrige');
  /* Le typage en `unknown` est ce qui empeche le compilateur de nous rassurer a tort :
     s il redevenait une fonction, TypeScript accepterait de nouveau l appel direct. */
  assert.match(code, /requestIdleCallback\?:\s*unknown/,
    'le champ a ete retype : le compilateur recommencerait a croire la fonction toujours presente');
  assert.match(code, /typeof\s+demander\s*===\s*'function'/, 'la presence n est plus testee');
  assert.match(code, /typeof\s+annuler\s*===\s*'function'/, 'l annulation n est plus testee');
  /* Le delai vient de la CONSTANTE EXPORTEE, pas d un nombre pose la. Sans cette ligne,
     ecrire 200 en dur resterait vert — A2 compare au meme 200 et ne verrait rien. */
  assert.match(code, /setTimeout\(\s*tache\s*,\s*DELAI_DE_REPLI_MS\s*\)/,
    'le delai du repli n est plus celui de la constante : A2 ne mesure alors plus rien');
});

test('C3 les deux prechargements du panel admin passent par le helper', () => {
  /* TEMOIN POSITIF. C1 interdit l appel nu, mais resterait vert si quelqu un supprimait le
     prechargement : le defaut serait corrige en perdant la fonctionnalite. Ces deux lignes
     disent que le creneau au repos est TOUJOURS LA, et passe par le helper.
     SI LE PRECHARGEMENT DISPARAIT UN JOUR, ce releve se met a jour — il ne se contourne pas. */
  for (const p of [
    'src/pages/admin/dashboard/useAdminDashboardEffects.ts',
    'src/pages/admin/AdminDashboard.tsx',
  ]) {
    const code = sansCommentaires(lire(p));
    assert.match(code, /from '(\.\.\/)+lib\/auRepos'/, `${p} n importe plus le helper`);
    assert.match(code, /planifierAuRepos\(/, `${p} ne planifie plus rien au repos`);
  }
});

test('C4 le moteur miroir de la boutique 3D n en porte aucun non plus', () => {
  /* IL N EST PAS DANS LA LISTE BLANCHE, IL EST A PART — parce qu on ne l edite JAMAIS ici
     (c est un miroir). S il en portait un jour, ce releve doit rougir quand meme : la
     correction se ferait EN AMONT, dans le depot du moteur, pas dans celui-ci. */
  const coupables = fichiersSousSrc()
    .filter((p) => p.startsWith(MOTEUR_MIROIR))
    .filter((p) => /(request|cancel)IdleCallback/.test(sansCommentaires(lire(p))));
  assert.deepEqual(coupables, [],
    'le moteur miroir appelle requestIdleCallback : a corriger EN AMONT, jamais ici');
});
