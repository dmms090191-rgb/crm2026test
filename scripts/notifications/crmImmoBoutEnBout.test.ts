/**
 * LA COUTURE : une alerte CRM Immo, de sa derivation jusqu'au journal.
 * Lancer :  node --import tsx --test scripts/notifications/crmImmoBoutEnBout.test.ts
 *
 * ---------- LE TROU QUE CE FICHIER FERME ----------
 *
 * Le 23 octobre 2026, la table notification_history a ete relevee a ZERO ligne alors que
 * deux alertes avaient bel et bien existe — et la suite de tests etait ENTIEREMENT VERTE.
 *
 * Pourquoi personne ne l'a vu : il y avait d'un cote plus de mille lignes de tests de
 * DERIVATION (declenchement.test.ts, alertes.test.ts), de l'autre quelques centaines de
 * tests de FABRIQUE (historique.test.ts), et RIEN entre les deux. Chaque moitie etait
 * juste ; c'est leur couture qui ne tenait a rien.
 *
 * Ce fichier tient cette couture, et rien d'autre : il part d'un dossier et d'un contrat,
 * fait naitre l'alerte a 08:00, la suit dans le journal, la marque lue puis traitee, et
 * verifie qu'elle y RESTE — parce qu'un journal n'oublie pas ce qui a eu lieu.
 *
 * ---------- CE QU'IL NE REFAIT PAS ----------
 *
 * Ni la regle des 08:00 ni l'arithmetique des dates : declenchement.test.ts les tient, et
 * les redire ici ferait deux verites a maintenir. On ne prend ici que les instants qui
 * SEPARENT les etats, pour que la couture soit lisible.
 */
import { readFileSync } from 'node:fs';
import {
  deriverAlertes, filtrer, compteBadge, HEURE_DECLENCHEMENT,
  type Alerte, type EtatConnu, type DossierPourAlertes,
} from '../../src/lib/crmImmoAlertes.ts';
import type { PeriodeDossier } from '../../src/lib/crmImmoEcheancier.ts';
import { construireLignes, cleDeLigne } from '../../src/lib/notificationHistory.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const DEST = { companyId: 'co-1', userId: 'us-1' };

/* Un bail d'un seul mois : la premiere echeance est aussi la derniere, ce qui rend le
   releve lisible sans dependre de l'echeancier complet. */
const DOSSIER: DossierPourAlertes = {
  id: 'dossier-1', nom: 'Dupont', prenom: 'Jean',
  locataire: 'Jean Dupont', proprietaire: 'Sarah Cohen',
  date_entree: '2026-11-01', date_fin_contrat: '2026-11-30', jour_encaissement: 20,
};
const PERIODES: PeriodeDossier[] = [{
  id: 'contrat-1', dossier_id: 'dossier-1',
  debut: '2026-11-01', fin: '2026-11-30', jour_encaissement: 20, cloturee: false,
}];

const alertes = (jour: string, minutes: number, etats: EtatConnu[] = []): Alerte[] =>
  deriverAlertes({ dossiers: [DOSSIER], etats, moment: { jour, minutes }, periodes: PERIODES });
const loyers = (a: Alerte[]) => a.filter(x => x.genre === 'loyer');
const journal = (a: Alerte[]) => construireLignes({ 'crm-immo': a }, DEST);

console.log('\n=== 1. ELLE NAIT A 08:00, ET LE JOURNAL LA RECOIT ===\n');
{
  /*
   * La veille a 07:59, le LOYER n'existe pas encore.
   *
   * On filtre sur le loyer, et c'est une precision qui compte : la fin de contrat du
   * 30 novembre, elle, se declenche des le 29 OCTOBRE — un mois calendaire moins un
   * jour. Les deux alertes du meme dossier ne naissent donc pas le meme jour, et un
   * releve qui compterait tout confondrait les deux regles.
   */
  const avant = loyers(alertes('2026-11-19', HEURE_DECLENCHEMENT - 1));
  t('07:59 la veille : aucun loyer, donc aucune ligne de journal pour lui',
    avant.length === 0 && journal(avant).length === 0);

  /* 08:00 : elle nait. */
  const a = loyers(alertes('2026-11-19', HEURE_DECLENCHEMENT));
  t('08:00 : l alerte de loyer existe', a.length === 1);

  const l = journal(a);
  t('et le journal en fait UNE ligne', l.length === 1);
  t('la ligne porte le dossier comme source', l[0].source_id === 'dossier-1');
  t('son occurrence est le couple genre:periode', l[0].occurrence === 'loyer:2026-11');
  t('elle se range a la date de l ECHEANCE, pas a l instant du releve',
    l[0].occurred_at === '2026-11-20T12:00:00.000Z');
  t('jamais lue, jamais traitee : les deux dates sont nulles',
    l[0].read_at === null && l[0].treated_at === null);
  t('le destinataire et la Societe sont ceux qu on lui a donnes',
    l[0].company_id === 'co-1' && l[0].recipient_user_id === 'us-1');
}

console.log('\n=== 2. ON LA MARQUE LUE : LA CLOCHE ET LE JOURNAL SUIVENT ENSEMBLE ===\n');
{
  const LU = '2026-11-19T08:30:00.000Z';
  const etats: EtatConnu[] = [
    { dossier_id: 'dossier-1', genre: 'loyer', periode: '2026-11', lue_le: LU },
  ];
  const a = loyers(alertes('2026-11-19', 9 * 60, etats));

  t('l alerte est marquee lue', a.length === 1 && a[0].lue && !a[0].traitee);
  t('elle reste ACTIVE dans la cloche : lue n est pas traitee',
    filtrer(a, 'actives').length === 1);
  t('mais elle sort du badge, qui ne compte que les non lues',
    compteBadge(a) === 0);

  const l = journal(a);
  t('le journal la garde', l.length === 1);
  t('et read_at porte LA DATE REELLE, celle de crm_immo_etats',
    l[0].read_at === LU);
  t('treated_at reste nul tant qu on ne l a pas traitee', l[0].treated_at === null);
}

console.log('\n=== 3. ON LA TRAITE : ELLE QUITTE LA CLOCHE, PAS LE JOURNAL ===\n');
{
  const LU = '2026-11-19T08:30:00.000Z';
  const TRAITE = '2026-11-19T10:15:00.000Z';
  const etats: EtatConnu[] = [
    { dossier_id: 'dossier-1', genre: 'loyer', periode: '2026-11', lue_le: LU, traitee_le: TRAITE },
  ];
  const a = loyers(alertes('2026-11-19', 11 * 60, etats));

  t('l alerte derivee existe toujours', a.length === 1);
  t('elle est lue ET traitee', a[0].lue && a[0].traitee);
  t('elle QUITTE les actives : la cloche ne la montre plus',
    filtrer(a, 'actives').length === 0);
  t('elle est rangee dans les traitees', filtrer(a, 'traitees').length === 1);
  t('et le badge est a zero', compteBadge(a) === 0);

  /*
   * LE POINT CENTRAL DE TOUT CE FICHIER.
   *
   * C'est ici que le defaut vivait : l'historique ne recevait que `actives`, donc une
   * alerte traitee ne pouvait PLUS JAMAIS y entrer. Traiter avant qu'un Admin n'ouvre
   * son panel la faisait disparaitre pour toujours, et la table restait vide.
   */
  const l = journal(a);
  t('LE JOURNAL LA GARDE, alors qu elle a quitte la cloche', l.length === 1);
  t('read_at et treated_at portent les deux dates reelles',
    l[0].read_at === LU && l[0].treated_at === TRAITE);
  t('son occurrence n a pas bouge : c est la MEME entree, pas une seconde',
    l[0].occurrence === 'loyer:2026-11');
}

console.log('\n=== 4. L ANTI-DOUBLON TIENT D UN BOUT A L AUTRE ===\n');
{
  const LU = '2026-11-19T08:30:00.000Z';
  const neuve = journal(loyers(alertes('2026-11-19', HEURE_DECLENCHEMENT)));
  const lue = journal(loyers(alertes('2026-11-19', 9 * 60,
    [{ dossier_id: 'dossier-1', genre: 'loyer', periode: '2026-11', lue_le: LU }])));
  const traitee = journal(loyers(alertes('2026-11-25', 3 * 60,
    [{ dossier_id: 'dossier-1', genre: 'loyer', periode: '2026-11', lue_le: LU, traitee_le: LU }])));

  t('la cle est la MEME aux trois etats : un seul upsert, jamais trois lignes',
    cleDeLigne(neuve[0]) === cleDeLigne(lue[0])
    && cleDeLigne(lue[0]) === cleDeLigne(traitee[0]));
  t('la date de rangement ne bouge pas non plus',
    neuve[0].occurred_at === traitee[0].occurred_at);

  /*
   * Un AUTRE mois est une AUTRE entree : traiter novembre ne traite pas decembre.
   *
   * Le bail commence en decembre, et c'est voulu : un bail qui courrait depuis novembre
   * ferait remonter l'impaye de novembre — la regle de la dette — et le releve
   * mesurerait cette regle-la au lieu de l'unicite par mois.
   */
  const decembre: DossierPourAlertes = {
    ...DOSSIER, date_entree: '2026-12-01', date_fin_contrat: '2026-12-31',
  };
  const periodesDec: PeriodeDossier[] = [{
    ...PERIODES[0], debut: '2026-12-01', fin: '2026-12-31',
  }];
  const aDec = deriverAlertes({
    dossiers: [decembre], etats: [], moment: { jour: '2026-12-19', minutes: HEURE_DECLENCHEMENT },
    periodes: periodesDec,
  }).filter(x => x.genre === 'loyer');
  const lDec = journal(aDec);
  t('decembre produit une occurrence DIFFERENTE de novembre',
    lDec.length === 1 && lDec[0].occurrence === 'loyer:2026-12');
}

console.log('\n=== 5. LA FIN DE CONTRAT SUIT LE MEME CHEMIN ===\n');
{
  const a = alertes('2026-11-19', HEURE_DECLENCHEMENT).filter(x => x.genre === 'fin_contrat');
  t('la fin de contrat est derivee', a.length === 1);

  const l = journal(a);
  t('le journal la recoit aussi', l.length === 1);
  t('son occurrence porte la date COMPLETE, pas le mois',
    l[0].occurrence === 'fin_contrat:2026-11-30');

  /* Traitee, elle reste elle aussi dans le journal. */
  const t2 = '2026-11-20T07:00:00.000Z';
  const traitee = alertes('2026-11-21', 8 * 60,
    [{ dossier_id: 'dossier-1', genre: 'fin_contrat', periode: '2026-11-30', lue_le: t2, traitee_le: t2 }])
    .filter(x => x.genre === 'fin_contrat');
  t('traitee, elle quitte la cloche', filtrer(traitee, 'actives').length === 0);
  const lt = journal(traitee);
  t('mais le journal la garde, avec sa date de traitement',
    lt.length === 1 && lt[0].treated_at === t2);
}

console.log('\n=== 6. LE CABLAGE REEL : CE QUE LE DASHBOARD DONNE AU JOURNAL ===\n');
{
  /*
   * Les sections precedentes passent les alertes a la main. Celle-ci lit le SOURCE :
   * si AdminDashboard revenait a `actives`, tout ce fichier resterait vert et la
   * regression serait invisible — c'est exactement ce qui s'etait produit.
   */
  const dash = readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');
  t('le dashboard donne TOUTES les alertes au journal, pas les seules actives',
    /'crm-immo': crmImmoOuvert \? alertesImmo\.toutes : \[\]/.test(dash));
  t('et il le redit dans ses dependances',
    /crmImmoOuvert, alertesImmo\.toutes,/.test(dash));

  /*
   * ET LA CLOCHE N'A PAS BOUGE, ce qui est la moitie de l'exigence.
   *
   * Son compteur vient de `badge`, c'est-a-dire compteBadge — les non lues ET non
   * traitees. Elargir ce que recoit le JOURNAL ne doit rien changer a ce que montre la
   * CLOCHE : si cette ligne devenait `alertesImmo.toutes`, la pastille compterait des
   * alertes deja traitees.
   */
  t('la cloche compte toujours le BADGE, pas toutes les alertes',
    /crmImmoCount=\{alertesImmo\.badge\}/.test(dash));
  t('le compteur de la cloche n est JAMAIS branche sur toutes ni sur actives',
    !/crmImmoCount=\{alertesImmo\.(toutes|actives)\}/.test(dash));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
