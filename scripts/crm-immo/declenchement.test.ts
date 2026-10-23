// Le DECLENCHEMENT des notifications CRM Immo : 08:00, heure d'Israel.
//   node --test scripts/crm-immo/declenchement.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  momentDe, estDeclenchee, jourDeclenchementLoyer, jourDeclenchementFinContrat,
  deriverAlertes, FUSEAU_ALERTES, HEURE_DECLENCHEMENT, joursEntre,
  type MomentIsrael, type DossierPourAlertes,
} from "../../src/lib/crmImmoAlertes.ts";
import type { PeriodeDossier } from "../../src/lib/crmImmoEcheancier.ts";

/*
 * CE QUE CE FICHIER PROTEGE, ET POURQUOI IL EXISTE SEPAREMENT.
 *
 * alertes.test.ts mesure l'arithmetique des alertes en JOURS. Celui-ci mesure la seule
 * chose qui, dans tout le depot, depend d'une HEURE : le moment ou une notification
 * commence a s'afficher.
 *
 * ---------- IL N'Y A AUCUN TRAVAIL PLANIFIE, ET C'EST LA GARANTIE ----------
 *
 * Mesure du 23 octobre 2026 : pg_cron n'est pas installe, aucune Edge Function ne
 * calcule ces alertes, vercel.json ne porte aucun cron, il n'existe aucun workflow
 * GitHub. RIEN ne s'execute a heure fixe.
 *
 * Les alertes sont DERIVEES a chaque affichage. Une notification ne peut donc pas etre
 * << manquee >> faute d'un traitement qui n'aurait pas tourne, et il n'y a rien a
 * rattraper. C'est pour cela que le seuil est `>=` et jamais `==` : ouvrir a 08:00, a
 * 08:03 ou le lendemain donne le meme resultat.
 */

/*
 * LE BAIL DE REFERENCE NE COUVRE QU UN SEUL MOIS, ET C EST INDISPENSABLE.
 *
 * Un bail qui commencerait des mois plus tot ferait remonter sa premiere echeance
 * impayee, qui sort sans condition d heure puisque c est une DETTE. Tous les releves
 * sur << la veille >> mesureraient alors cette dette ancienne au lieu du declenchement.
 * Le piege a ete rencontre en ecrivant ce fichier : une echeance de janvier masquait
 * celle de novembre.
 */
const dossier = (p: Partial<DossierPourAlertes> = {}): DossierPourAlertes => ({
  id: "d1", nom: "Dupont", prenom: "Jean",
  locataire: "Jean Dupont", proprietaire: "Sarah Cohen",
  date_entree: "2026-11-01", date_fin_contrat: "2026-11-30", jour_encaissement: 10,
  ...p,
});

const periodesDe = (ds: DossierPourAlertes[]): PeriodeDossier[] =>
  ds.flatMap(d => (d.date_entree && d.date_fin_contrat && d.jour_encaissement
    ? [{
        dossier_id: d.id, debut: d.date_entree, fin: d.date_fin_contrat,
        jour_encaissement: d.jour_encaissement, cloturee: false,
      }]
    : []));

/** Un relevé a un instant precis, exprime en heure d'Israel. */
function alertes(ds: DossierPourAlertes[], jour: string, minutes = HEURE_DECLENCHEMENT) {
  return deriverAlertes({
    dossiers: ds, etats: [], moment: { jour, minutes }, periodes: periodesDe(ds),
  });
}
const loyers = (ds: DossierPourAlertes[], jour: string, minutes?: number) =>
  alertes(ds, jour, minutes).filter(a => a.genre === "loyer");
const fins = (ds: DossierPourAlertes[], jour: string, minutes?: number) =>
  alertes(ds, jour, minutes).filter(a => a.genre === "fin_contrat");

// ===========================================================================
// A — LES TROIS CAS DE LOYER DEMANDES
// ===========================================================================

test("A1 — encaissement DEMAIN : la notification sort aujourd hui a 08:00", () => {
  const d = [dossier({ jour_encaissement: 10 })];
  /* Echeance le 10 novembre, on est le 9. */
  assert.equal(loyers(d, "2026-11-09", 7 * 60 + 59).length, 0, "07:59 : pas encore");
  assert.equal(loyers(d, "2026-11-09", HEURE_DECLENCHEMENT).length, 1, "08:00 : elle sort");
  assert.equal(loyers(d, "2026-11-09")[0].echeance, "2026-11-10");
});

test("A2 — encaissement AUJOURD HUI : pas de nouvelle notification << veille >>", () => {
  /*
   * Le jour J, l'echeance est due : elle sort, mais au titre de l'echeance du jour et
   * non d'une seconde notification. Une seule ligne, une seule periode — c'est ce que
   * << pas de nouvelle notification veille >> veut dire concretement.
   */
  const d = [dossier({ jour_encaissement: 10 })];
  const a = loyers(d, "2026-11-10", 0);
  assert.equal(a.length, 1, "une seule, pas deux");
  assert.equal(a[0].echeance, "2026-11-10");
  assert.equal(a[0].periode, "2026-11");
  /* Et a minuit deja : le jour J, l'heure ne commande plus rien. */
  assert.equal(loyers(d, "2026-11-10", 0).length, 1, "des minuit le jour meme");
});

test("A3 — encaissement APRES-DEMAIN : aucune notification aujourd hui", () => {
  const d = [dossier({ jour_encaissement: 10 })];
  assert.equal(loyers(d, "2026-11-08", 23 * 60 + 59).length, 0,
    "l avant-veille, meme a 23:59 : rien");
  assert.equal(loyers(d, "2026-11-01").length, 0, "et rien non plus au debut du mois");
});

test("A4 — une echeance ECHUE et impayee sort sans condition d heure", () => {
  /*
   * LA REGLE QUI NE SE NEGOCIE PAS : << le renouvellement ne doit jamais faire
   * disparaitre une dette reelle >>. Le verrou des 08:00 ne s'applique QU'AUX echeances
   * a venir ; une dette est visible a toute heure, tous les jours.
   */
  const d = [dossier({ jour_encaissement: 10 })];
  assert.equal(loyers(d, "2026-11-11", 0).length, 1, "le lendemain a minuit");
  assert.equal(loyers(d, "2026-12-20", 3 * 60).length, 1, "un mois plus tard a 03:00");
  assert.equal(loyers(d, "2026-12-20", 3 * 60)[0].echeance, "2026-11-10",
    "et c est bien la PLUS ANCIENNE impayee qui est annoncee");
});

// ===========================================================================
// B — LA FIN DE CONTRAT : LE PLUS TOT DES DEUX CALCULS
// ===========================================================================

test("B1 — fin de contrat : UN MOIS CALENDAIRE puis UN JOUR, et rien d autre", () => {
  /*
   * LA SEULE REGLE AUTORISEE, arretee par David le 23 octobre 2026 :
   * date_fin -> moins 1 mois calendaire -> moins 1 jour -> 08:00 Asia/Jerusalem.
   *
   * Une version intermediaire prenait le plus tot entre ce calcul et un J-30, pour
   * qu un mois court n annonce jamais plus tard qu avant. Elle a ete REFUSEE :
   * << Je ne veux PAS au plus tot entre 1 mois moins 1 jour et J-30, ni de regle J-30
   * supplementaire. >> Ce releve existe pour qu elle ne revienne pas.
   */
  assert.equal(jourDeclenchementFinContrat("2026-12-20"), "2026-11-19", "l exemple de David");
  assert.equal(jourDeclenchementFinContrat("2026-12-15"), "2026-11-14");
  assert.equal(jourDeclenchementFinContrat("2027-03-15"), "2027-02-14",
    "mars : le calcul de CALENDRIER, pas un J-30 qui donnerait le 13");
});

test("B2 — AUCUN plancher de trente jours : un mois court donne un preavis plus court", () => {
  /*
   * LA CONSEQUENCE ASSUMEE DE LA REGLE STRICTE, et elle est mesuree plutot que subie.
   *
   * << Un mois moins un jour >> ne vaut pas trente jours quand le mois precedent en
   * compte 28 : une fin le 15 mars se declenche le 14 fevrier, soit J-29. C est ce que
   * la regle VEUT DIRE, et ce releve l affirme pour qu un futur lecteur ne le prenne
   * pas pour un defaut et ne reintroduise pas un plancher.
   */
  assert.equal(joursEntre("2027-02-14", "2027-03-15"), 29,
    "mars 2027 : le preavis reel est de 29 jours, et c est voulu");
  assert.equal(joursEntre("2028-02-14", "2028-03-15"), 30,
    "mars 2028, bissextile : 30 jours, par le seul jeu du calendrier");
  assert.equal(joursEntre("2026-11-19", "2026-12-20"), 31,
    "decembre : 31 jours, toujours sans aucun plancher");

  /*
   * ET LE CORPS DE LA FONCTION NE CONTIENT AUCUN REPLI.
   *
   * On lit le corps reel plutot que de compter des occurrences dans tout le fichier :
   * une mention en commentaire est legitime — l en-tete RACONTE justement pourquoi le
   * J-30 a ete retire — alors qu un PREAVIS ou un 30 dans le calcul ne l est pas.
   */
  const src = readFileSync("src/lib/crmImmoAlertes.ts", "utf8");
  const debut = src.indexOf("export function jourDeclenchementFinContrat");
  assert.ok(debut > 0, "jourDeclenchementFinContrat a disparu");
  const corps = src.slice(debut, src.indexOf("\n}", debut));
  assert.ok(!/PREAVIS|30|ajouterJours\(fin/.test(corps),
    "un repli en nombre de jours est revenu commander le declenchement de fin de contrat :\n  "
    + corps.trim());

  /* Et plus aucun code du depot ne lit la constante : sa declaration est sa seule trace. */
  assert.equal(src.split("PREAVIS_FIN_CONTRAT").length - 1, 1,
    "PREAVIS_FIN_CONTRAT est relue quelque part : elle ne doit plus commander rien");
});

test("B3 — fin de contrat : exactement 1 mois + 1 jour, et exactement le declenchement", () => {
  const fin = "2026-12-10";
  const d = [dossier({ date_fin_contrat: fin, jour_encaissement: null })];
  /* << 1 mois moins 1 jour >> avant le 10 decembre : le 9 novembre. */
  assert.equal(jourDeclenchementFinContrat(fin), "2026-11-09");

  assert.equal(fins(d, "2026-11-08", 23 * 60 + 59).length, 0, "la veille du declenchement");
  assert.equal(fins(d, "2026-11-09", 7 * 60 + 59).length, 0, "le jour meme a 07:59");
  assert.equal(fins(d, "2026-11-09", HEURE_DECLENCHEMENT).length, 1, "a 08:00 : elle sort");
  assert.equal(fins(d, "2026-11-10", 0).length, 1, "et le lendemain, sans condition d heure");
});

test("B4 — fin de contrat : une echeance DEPASSEE reste visible", () => {
  const d = [dossier({ date_fin_contrat: "2026-01-10", jour_encaissement: null })];
  assert.equal(fins(d, "2026-06-15", 2 * 60).length, 1,
    "cinq mois apres la fin, a 02:00 : c est toujours un travail a faire");
});

// ===========================================================================
// C — FEVRIER, LES BISSEXTILES, LES MOIS COURTS
// ===========================================================================

test("C1 — fevrier : le declenchement est rabattu, jamais deborde sur mars", () => {
  /* Fin le 31 mars : un mois en arriere tombe sur un 31 fevrier qui n existe pas. */
  assert.equal(jourDeclenchementFinContrat("2027-03-31"), "2027-02-27",
    "rabattu au 28, moins un jour : le 27");
  assert.equal(jourDeclenchementFinContrat("2028-03-31"), "2028-02-28",
    "annee bissextile : rabattu au 29, moins un jour : le 28");
  /* Et le 30 mars donne le MEME jour que le 31 : deux fins differentes, un seul
     declenchement. C est inherent au rabattement, et c est assume. */
  assert.equal(jourDeclenchementFinContrat("2027-03-30"), "2027-02-27");
});

test("C2 — annee bissextile : une fin au 29 fevrier a bien un declenchement", () => {
  assert.equal(jourDeclenchementFinContrat("2028-02-29"), "2028-01-28");
  /* 2026 n est pas bissextile : le 29 fevrier 2026 n existe pas et doit etre refuse,
     pas devine. */
  assert.equal(jourDeclenchementFinContrat("2026-02-29"), null);
});

test("C3 — bascule d annee : janvier remonte sur decembre", () => {
  assert.equal(jourDeclenchementFinContrat("2026-01-01"), "2025-11-30",
    "1er janvier : un mois en arriere le 1er decembre, moins un jour le 30 novembre");
  /* Le 1er mars remonte au 1er fevrier, moins un jour : le 31 JANVIER. L ancienne regle
     du plus-tot-des-deux donnait le 30 janvier, par son J-30. Elle a ete retiree. */
  assert.equal(jourDeclenchementFinContrat("2026-03-01"), "2026-01-31");
});

test("C6 — LOYER ET FIN DE CONTRAT TOMBENT ENSEMBLE quand leurs dates coincident", () => {
  /*
   * EXIGENCE DE DAVID, 23 octobre 2026 : << Je veux aussi que cette notification de fin
   * de contrat tombe en meme temps que la notification du dernier loyer, quand les dates
   * correspondent. >> Deux notifications DISTINCTES, parce qu elles disent deux choses
   * differentes, mais au meme instant.
   *
   * Ce n est pas une regle de plus a coder, et c est precisement ce que ce releve
   * verifie : les deux declenchements sont calcules independamment, et ils coincident
   * d eux-memes des que les dates s y pretent.
   *
   *   dernier loyer le 20 novembre  ->  veille : 19 novembre
   *   fin de contrat le 20 decembre ->  un mois moins un jour : 19 novembre
   *
   * Le bail court donc jusqu au 20 decembre avec un loyer au 20 ; son dernier loyer
   * reellement du tombe le 20 novembre si l echeance de decembre est hors bornes, ou le
   * 20 decembre sinon. On prend ici le cas ou les DEUX declenchements se rejoignent.
   */
  assert.equal(jourDeclenchementLoyer("2026-11-20"), "2026-11-19");
  assert.equal(jourDeclenchementFinContrat("2026-12-20"), "2026-11-19");

  const d = [dossier({
    date_entree: "2026-11-01", date_fin_contrat: "2026-12-20", jour_encaissement: 20,
  })];

  /* La veille au soir : ni l une ni l autre. */
  assert.equal(alertes(d, "2026-11-18", 23 * 60 + 59).length, 0, "l avant-veille : rien");

  /* 07:59 le 19 : toujours rien, pour les DEUX. */
  assert.equal(alertes(d, "2026-11-19", 7 * 60 + 59).length, 0, "07:59 : rien encore");

  /* 08:00 le 19 : les DEUX sortent, ensemble. */
  const a = alertes(d, "2026-11-19", HEURE_DECLENCHEMENT);
  assert.equal(a.length, 2, "a 08:00, les deux notifications doivent sortir ENSEMBLE");
  const genres = a.map(x => x.genre).sort();
  assert.deepEqual(genres, ["fin_contrat", "loyer"],
    "deux notifications DISTINCTES : le loyer a encaisser, et la fin de contrat");
  assert.equal(a.find(x => x.genre === "loyer")!.echeance, "2026-11-20");
  assert.equal(a.find(x => x.genre === "fin_contrat")!.echeance, "2026-12-20");
});

test("C4 — loyer : la veille d un 1er du mois est le dernier jour du mois precedent", () => {
  assert.equal(jourDeclenchementLoyer("2026-03-01"), "2026-02-28");
  assert.equal(jourDeclenchementLoyer("2028-03-01"), "2028-02-29", "bissextile");
  assert.equal(jourDeclenchementLoyer("2026-01-01"), "2025-12-31");
  assert.equal(jourDeclenchementLoyer("pas une date"), null);
});

// ===========================================================================
// D — L HEURE D ISRAEL, ETE ET HIVER
// ===========================================================================

test("D1 — momentDe lit l heure d ISRAEL, pas celle d UTC ni celle du poste", () => {
  /* 2026-11-09, 06:00 UTC = 08:00 a Jerusalem (GMT+2 en hiver). */
  const m = momentDe(new Date("2026-11-09T06:00:00Z"));
  assert.equal(m.jour, "2026-11-09");
  assert.equal(m.minutes, HEURE_DECLENCHEMENT);

  /* Le meme instant lu en UTC donne 06:00 : la difference est reelle, pas cosmetique. */
  assert.equal(momentDe(new Date("2026-11-09T06:00:00Z"), "UTC").minutes, 6 * 60);

  /*
   * LES MINUTES COMPTENT VRAIMENT.
   *
   * Une mutation a survecu en faisant rendre a momentDe l'heure SEULE, minutes
   * ignorees : aucun relevé ne s'en apercevait, parce qu'ils passaient tous par des
   * heures pleines. 07:59 serait alors devenu 07:00 — meme verdict ici, mais 08:59
   * serait devenu 08:00, et surtout toute logique future a la minute aurait ete fausse.
   */
  assert.equal(momentDe(new Date("2026-11-09T05:59:00Z")).minutes, 7 * 60 + 59,
    "07:59 doit valoir 479 minutes, pas 420 : les minutes ne sont pas jetees");
  assert.equal(momentDe(new Date("2026-11-09T06:01:00Z")).minutes, HEURE_DECLENCHEMENT + 1);
  assert.equal(momentDe(new Date("2026-11-09T06:37:00Z")).minutes, 8 * 60 + 37);
});

test("D2 — PASSAGE A L HEURE D ETE : 08:00 reste 08:00, l instant UTC change", () => {
  /*
   * Israel passe a l heure d ete le 27 mars 2026 (GMT+2 -> GMT+3) et revient le
   * 25 octobre. Un calcul fait en UTC fixe se tromperait d UNE HEURE la moitie de
   * l annee — c est exactement le piege que ce test ferme.
   */
  /* La veille de la bascule : 08:00 local = 06:00 UTC. */
  const avant = momentDe(new Date("2026-03-26T06:00:00Z"));
  assert.equal(avant.jour, "2026-03-26");
  assert.equal(avant.minutes, HEURE_DECLENCHEMENT, "avant la bascule : 06:00Z vaut 08:00");

  /* Le jour de la bascule : 08:00 local = 05:00 UTC. */
  const apres = momentDe(new Date("2026-03-27T05:00:00Z"));
  assert.equal(apres.jour, "2026-03-27");
  assert.equal(apres.minutes, HEURE_DECLENCHEMENT, "apres la bascule : 05:00Z vaut 08:00");

  /* Et le MEME instant UTC ne vaut plus la meme heure locale de part et d autre. */
  assert.equal(momentDe(new Date("2026-03-26T06:00:00Z")).minutes, 8 * 60);
  assert.equal(momentDe(new Date("2026-03-27T06:00:00Z")).minutes, 9 * 60,
    "en heure d ete, 06:00Z vaut 09:00 : un seuil ecrit en UTC se declencherait trop tot");
});

test("D3 — RETOUR A L HEURE D HIVER, le 25 octobre 2026", () => {
  assert.equal(momentDe(new Date("2026-10-24T05:00:00Z")).minutes, HEURE_DECLENCHEMENT,
    "la veille, en heure d ete : 05:00Z vaut 08:00");
  assert.equal(momentDe(new Date("2026-10-25T06:00:00Z")).minutes, HEURE_DECLENCHEMENT,
    "le jour du retour, en heure d hiver : 06:00Z vaut 08:00");
  /* 08:00 n est JAMAIS une heure ambigue ni inexistante en Israel : la bascule se fait
     a 02:00. Aucun cas pathologique a arbitrer a 08:00. */
  assert.equal(momentDe(new Date("2027-03-26T05:00:00Z")).minutes, HEURE_DECLENCHEMENT,
    "la bascule 2027 tombe le 26 mars, et 08:00 existe une fois et une seule");
});

test("D4 — LE PIEGE DE MINUIT : hourCycle h23, jamais 24", () => {
  /*
   * `hour: '2-digit'` sans hourCycle peut rendre << 24 >> a minuit selon la version
   * d ICU. Minuit vaudrait alors 1440 minutes, donc superieur a 08:00, et la
   * notification sortirait UN JOUR TROP TOT — en silence, et seulement chez certains.
   */
  const minuit = momentDe(new Date("2026-11-09T22:00:00Z"));  // 00:00 le 10 a Jerusalem
  assert.equal(minuit.jour, "2026-11-10");
  assert.equal(minuit.minutes, 0, "minuit vaut 0 minute, surtout pas 1440");
  assert.ok(minuit.minutes < HEURE_DECLENCHEMENT, "minuit est AVANT 08:00");

  /* Et le code impose bien hourCycle, plutot que de s en remettre a la locale. */
  const src = readFileSync("src/lib/crmImmoAlertes.ts", "utf8");
  assert.match(src, /hourCycle: 'h23'/,
    "hourCycle a disparu : minuit pourrait revenir a 24 selon l implementation d ICU");
});

// ===========================================================================
// E — LE SEUIL EST >=, DONC IL N Y A AUCUNE FENETRE A RATER
// ===========================================================================

test("E1 — execution APRES 08:00 : rien n est rate, jamais", () => {
  const jour = "2026-11-09";
  for (const minutes of [HEURE_DECLENCHEMENT, 8 * 60 + 1, 8 * 60 + 7, 12 * 60, 23 * 60 + 59]) {
    assert.equal(estDeclenchee(jour, { jour, minutes }), true, `a ${minutes} minutes`);
  }
  for (const minutes of [0, 1, 7 * 60 + 59]) {
    assert.equal(estDeclenchee(jour, { jour, minutes }), false, `a ${minutes} minutes`);
  }
  /* Les jours SUIVANTS : vrai a toute heure, y compris a minuit. */
  assert.equal(estDeclenchee(jour, { jour: "2026-11-10", minutes: 0 }), true);
  assert.equal(estDeclenchee(jour, { jour: "2027-05-01", minutes: 0 }), true);
  /* Les jours PRECEDENTS : faux meme a 23:59. */
  assert.equal(estDeclenchee(jour, { jour: "2026-11-08", minutes: 23 * 60 + 59 }), false);
  /* Pas de jour de declenchement calculable : rien ne sort, plutot qu une date devinee. */
  assert.equal(estDeclenchee(null, { jour, minutes: 12 * 60 }), false);
});

test("E2 — LANCEMENTS MULTIPLES : zero doublon, resultat identique", () => {
  /*
   * << Lancement multiple du job >> n a pas d objet au sens strict — aucun job ne
   * tourne. Ce qui peut arriver, c est que la derivation soit REFAITE : a chaque
   * rendu, toutes les 60 s, a chaque retour d onglet. Elle doit alors rendre exactement
   * la meme chose, et surtout une seule alerte par echeance.
   */
  const d = [
    dossier({ id: "a", jour_encaissement: 10 }),
    dossier({ id: "b", jour_encaissement: 10, date_fin_contrat: "2026-12-10" }),
  ];
  const moment: MomentIsrael = { jour: "2026-11-09", minutes: 9 * 60 };
  const faire = () => deriverAlertes({ dossiers: d, etats: [], moment, periodes: periodesDe(d) });

  const un = faire(); const deux = faire(); const trois = faire();
  assert.deepEqual(deux, un, "deuxieme passage : resultat identique");
  assert.deepEqual(trois, un, "troisieme passage : resultat identique");

  /* L IDENTITE est stable et unique : une seule ligne par (dossier, genre, periode). */
  const cles = un.map(a => `${a.dossier_id}|${a.genre}|${a.periode}`);
  assert.equal(new Set(cles).size, cles.length, "deux alertes partagent la meme identite");
});

// ===========================================================================
// F — UNE SEULE NOTION DE << AUJOURD HUI >> DANS TOUT LE MODULE
// ===========================================================================

test("F1 — le module n appelle plus fuseauLocal : Israel partout", () => {
  /*
   * Regle de David : << Je ne veux pas deux notions differentes de aujourd hui dans le
   * meme CRM. >> Le fuseau du POSTE donnait un jour different selon l endroit d ou l on
   * consulte — un relevé fait depuis Paris a 00 h 30 basculait la journee avant
   * Jerusalem.
   *
   * fuseauLocal reste exporte parce qu il est juste et peut servir ailleurs ; ce qui est
   * interdit, c est son usage DANS le module.
   */
  const dossierModule = "src/pages/admin/views/crm-immo/";
  const fautifs: string[] = [];
  for (const f of readdirSync(dossierModule)) {
    if (!f.endsWith(".ts") && !f.endsWith(".tsx")) continue;
    const src = readFileSync(dossierModule + f, "utf8");
    /* Le mot peut etre CITE dans un commentaire : on ne compte que les APPELS. */
    if (/fuseauLocal\s*\(/.test(src)) fautifs.push(f + " (fuseauLocal)");
    /*
     * ET LA FORME ECRITE A LA MAIN, qui est le vrai risque.
     *
     * Deux mutations ont survecu en remplacant FUSEAU_ALERTES par
     * `Intl.DateTimeFormat().resolvedOptions().timeZone` : le garde ne cherchait que le
     * nom de la fonction, pas ce qu'elle fait. On interdit donc la PROPRIETE, qui est
     * la seule facon d'obtenir le fuseau du poste.
     */
    if (/resolvedOptions\s*\(\s*\)\s*\.\s*timeZone/.test(src)) fautifs.push(f + " (resolvedOptions)");
  }
  assert.deepEqual(fautifs, [],
    "le fuseau du poste est revenu dans le module : deux notions de << aujourd hui >> "
    + "cohabiteraient, et la cloche contredirait les cartes selon l endroit d ou l on regarde");

  assert.equal(FUSEAU_ALERTES, "Asia/Jerusalem");
  assert.equal(HEURE_DECLENCHEMENT, 480, "08:00 en minutes");
});

test("F2 — garde du garde : le balayage de F1 voit vraiment les fichiers", () => {
  /* Si le dossier etait mal nomme, F1 passerait en ne lisant rien. */
  const fichiers = readdirSync("src/pages/admin/views/crm-immo/")
    .filter(f => f.endsWith(".ts") || f.endsWith(".tsx"));
  assert.ok(fichiers.length >= 20, `le balayage ne voit que ${fichiers.length} fichiers`);
  assert.ok(fichiers.includes("useCrmImmoTableauDeBord.ts"), "le porteur de l horloge est absent");
  assert.ok(fichiers.includes("useCrmImmoAlertes.ts"), "le hook des alertes est absent");

  /* Et les deux hooks lisent bien le fuseau d Israel. */
  for (const f of ["useCrmImmoTableauDeBord.ts", "useCrmImmoEcheancier.ts"]) {
    assert.match(readFileSync("src/pages/admin/views/crm-immo/" + f, "utf8"), /FUSEAU_ALERTES/,
      f + " ne declare plus son fuseau");
  }
});
