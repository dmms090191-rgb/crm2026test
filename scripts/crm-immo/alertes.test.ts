// Toute l'arithmetique des alertes CRM Immo : ni la base ni le navigateur ne la controlent.
//   node --test scripts/crm-immo/alertes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  journeeDeReference, dernierJourDuMois, jourRabattu, periodeLoyer, lireJour, joursEntre,
  deriverAlertes, filtrer, compteBadge, HEURE_DECLENCHEMENT,
  jourDeclenchementFinContrat,
  libelleAlerte, titreAlerte, detailAlerte, enDateFrancaise,
  type DossierPourAlertes, type EtatConnu, type Alerte, type MomentIsrael,
} from "../../src/lib/crmImmoAlertes.ts";
import type { PeriodeDossier } from "../../src/lib/crmImmoEcheancier.ts";

/* Les deux expressions reellement posees par la contrainte
   crm_immo_etats_periode_valide. Toute periode produite doit leur obeir, sinon
   l'insertion est REFUSEE par la base — bruyamment, mais apres coup. */
const MOTIF_LOYER = /^[0-9]{4}-(0[1-9]|1[0-2])$/;
const MOTIF_FIN = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

/*
 * Le dossier de reference porte un bail qui COMMENCE au mois des relevés.
 *
 * Deux raisons, et la seconde a ete apprise a ses depens.
 *
 * 1. Depuis le 22 octobre 2026, une alerte de loyer n'existe que si le contrat est
 *    complet ET que l'echeance tombe dedans. Un dossier sans dates ne produit donc plus
 *    rien, et les tests qui ne s'interessent qu'au jour d'encaissement n'auraient rien
 *    a mesurer.
 *
 * 2. Le debut ne peut pas etre lointain. L'alerte vise le PLUS ANCIEN impaye deja echu :
 *    un bail commence en l'an 2000 et jamais encaisse ferait donc remonter le loyer de
 *    janvier 2000, pas celui du mois en cours. Les relevés se font en novembre 2026, le
 *    bail commence donc le 1er novembre 2026.
 *
 * La fin reste lointaine pour ne RIEN declencher d'autre : 2099 est bien au-dela du
 * preavis de 30 jours, donc aucune alerte de fin de contrat ne brouille les relevés.
 * Les tests qui veulent une vraie borne la posent explicitement.
 */
const dossier = (over: Partial<DossierPourAlertes> = {}): DossierPourAlertes => ({
  id: "d1", nom: "Dupont", prenom: "Jean",
  locataire: "Jean Dupont", proprietaire: "Sarah Cohen",
  date_entree: "2026-11-01", date_fin_contrat: "2099-12-31",
  jour_encaissement: null, ...over,
});

const seulement = (alertes: Alerte[], genre: string) => alertes.filter(a => a.genre === genre);

/*
 * LES PERIODES QU UN DOSSIER COMPLET PORTE EN BASE.
 *
 * Depuis le 22 octobre 2026, deriverAlertes ne lit plus les trois colonnes du dossier
 * pour construire l echeancier : il lit les PERIODES. La raison est une regle de David —
 * un loyer impaye d un contrat renouvele doit rester reclame, or ces trois colonnes ne
 * refletent que le contrat EN COURS.
 *
 * Un declencheur en base garantit qu un dossier complet a exactement UNE periode en
 * cours, miroir de ses trois colonnes. Cet adaptateur reproduit ce fait, pour que les
 * cas d epreuve ci-dessous continuent de se lire comme avant. Un test qui veut un
 * HISTORIQUE — plusieurs periodes, dont des cloturees — les passe explicitement.
 */
const periodesDe = (dossiers: DossierPourAlertes[]): PeriodeDossier[] =>
  dossiers.flatMap(d =>
    d.date_entree && d.date_fin_contrat && d.jour_encaissement !== null && d.jour_encaissement !== undefined
      ? [{
          dossier_id: d.id, debut: d.date_entree, fin: d.date_fin_contrat,
          jour_encaissement: d.jour_encaissement, cloturee: false,
        }]
      : []);

/*
 * LES RELEVES PARLENT EN JOURS, LA FONCTION ATTEND UN MOMENT.
 *
 * deriverAlertes recoit depuis le 23 octobre 2026 un MomentIsrael — jour ET heure —
 * parce qu'une notification n'apparait plus a minuit mais a 08:00. Les releves de ce
 * fichier, eux, portent sur des JOURS : les convertir ici, a 08:00 pile, evite de
 * reecrire quarante appels et dit la bonne chose — << ce jour-la, la notification etant
 * due >>.
 *
 * Un releve qui veut mesurer l'HEURE passe `moment` directement ; c'est ce que fait
 * declenchement.test.ts, qui est le fichier dedie a cette question.
 */
type EntreeAlertes = Omit<Parameters<typeof deriverAlertes>[0], "moment">
  & { aujourdhui: string; moment?: MomentIsrael };
const deriver = (p: EntreeAlertes) =>
  deriverAlertes({
    ...p,
    moment: p.moment ?? { jour: p.aujourdhui, minutes: HEURE_DECLENCHEMENT },
    periodes: p.periodes ?? periodesDe(p.dossiers),
  });

// ---------------------------------------------------------------------------
// LE RABATTEMENT — le piege du 31 fevrier
// ---------------------------------------------------------------------------

test("dernierJourDuMois : les annees bissextiles, y compris la regle des siecles", () => {
  assert.equal(dernierJourDuMois(2026, 2), 28, "2026 n est pas bissextile");
  assert.equal(dernierJourDuMois(2028, 2), 29, "2028 est bissextile");
  assert.equal(dernierJourDuMois(2100, 2), 28, "2100 est divisible par 4 mais PAS bissextile");
  assert.equal(dernierJourDuMois(2000, 2), 29, "2000 est divisible par 400, donc bissextile");
  assert.equal(dernierJourDuMois(2026, 4), 30, "avril");
  assert.equal(dernierJourDuMois(2026, 1), 31, "janvier");
  assert.equal(dernierJourDuMois(2026, 12), 31, "decembre");
});

test("jourRabattu : un bail qui dit 31 est honore partout, sans jamais deborder", () => {
  assert.equal(jourRabattu(31, 2026, 2), 28, "fevrier 2026");
  assert.equal(jourRabattu(31, 2028, 2), 29, "fevrier bissextil");
  assert.equal(jourRabattu(31, 2026, 4), 30, "avril");
  assert.equal(jourRabattu(31, 2026, 1), 31, "janvier : inchange");
  assert.equal(jourRabattu(5, 2026, 2), 5, "un jour normal n est pas touche");
  assert.equal(jourRabattu(30, 2026, 2), 28, "30 en fevrier se rabat aussi");
  assert.equal(jourRabattu(30, 2028, 2), 29, "30 en fevrier BISSEXTIL s arrete au 29");
  assert.equal(jourRabattu(29, 2026, 2), 28, "29 en fevrier normal");
  assert.equal(jourRabattu(29, 2028, 2), 29, "29 en fevrier bissextil : inchange");
  /* Le piege precis : new Date(2026, 1, 31) rend le 3 MARS, sans erreur. Si le
     rabattement etait fait comme ca, l'alerte de fevrier ne sortirait jamais. */
  assert.notEqual(new Date(2026, 1, 31).getMonth(), 1,
    "temoin : la construction naive deborde bien sur mars — d ou ce module");
});

// ---------------------------------------------------------------------------
// LE FUSEAU — le piege de toISOString()
// ---------------------------------------------------------------------------

test("journeeDeReference : le jour est celui du FUSEAU, pas celui d UTC", () => {
  /* 31 octobre 2026, 23 h 30 a Paris = 22 h 30 UTC le meme jour. */
  const soir = new Date("2026-10-31T22:30:00Z");
  assert.equal(journeeDeReference(soir, "Europe/Paris"), "2026-10-31");

  /* LE cas qui casse toISOString : 1er novembre 2026, 00 h 30 a Paris, soit
     31 octobre 23 h 30 en UTC. Le motif repandu
     `new Date().toISOString().slice(0,10)` rendrait le 31 — la veille. */
  const minuitPasse = new Date("2026-10-31T23:30:00Z");
  assert.equal(journeeDeReference(minuitPasse, "Europe/Paris"), "2026-11-01",
    "a Paris il est deja le 1er novembre");
  assert.equal(minuitPasse.toISOString().slice(0, 10), "2026-10-31",
    "temoin : toISOString rend bien la veille, c est pourquoi on ne l utilise pas");

  /* Et dans l autre sens, pour Jerusalem. */
  assert.equal(journeeDeReference(new Date("2026-06-30T21:30:00Z"), "Asia/Jerusalem"), "2026-07-01");
  assert.equal(journeeDeReference(new Date("2026-06-30T21:30:00Z"), "UTC"), "2026-06-30");
});

test("deux fuseaux, le meme instant en milieu de mois : la MEME periode de loyer", () => {
  const instant = new Date("2026-11-15T12:00:00Z");
  const paris = journeeDeReference(instant, "Europe/Paris");
  const jerusalem = journeeDeReference(instant, "Asia/Jerusalem");
  const losAngeles = journeeDeReference(instant, "America/Los_Angeles");
  const d = [dossier({ jour_encaissement: 5 })];
  const periode = (jour: string) =>
    seulement(deriver({ dossiers: d, etats: [], aujourdhui: jour }), "loyer")[0].periode;
  assert.equal(periode(paris), "2026-11");
  assert.equal(periode(jerusalem), "2026-11");
  assert.equal(periode(losAngeles), "2026-11",
    "un decalage de fuseau ne doit pas changer le mois de facturation en milieu de mois");
});

// ---------------------------------------------------------------------------
// LES FORMATS QUE LA BASE VERIFIE
// ---------------------------------------------------------------------------

test("toute periode produite obeit aux expressions de la contrainte", () => {
  for (let mois = 1; mois <= 12; mois++) {
    assert.match(periodeLoyer(2026, mois), MOTIF_LOYER, `mois ${mois}`);
  }
  /* Un balayage de l'annee entiere, pour les deux genres, dossier a jour 31 :
     c est la combinaison qui produit les dates les plus extremes. */
  for (let mois = 1; mois <= 12; mois++) {
    const dernier = dernierJourDuMois(2026, mois);
    const aujourdhui = `2026-${String(mois).padStart(2, "0")}-15`;
    const a = deriver({
      dossiers: [dossier({ jour_encaissement: 31, date_fin_contrat: `2026-${String(mois).padStart(2, "0")}-${String(dernier).padStart(2, "0")}` })],
      etats: [], aujourdhui,
    });
    for (const alerte of a) {
      const motif = alerte.genre === "loyer" ? MOTIF_LOYER : MOTIF_FIN;
      assert.match(alerte.periode, motif, `${alerte.genre} en mois ${mois}`);
      assert.match(alerte.echeance, MOTIF_FIN, `echeance affichable en mois ${mois}`);
    }
  }
});

test("lireJour refuse les dates impossibles au lieu de les corriger en silence", () => {
  assert.deepEqual(lireJour("2026-12-15"), { annee: 2026, mois: 12, jour: 15 });
  assert.equal(lireJour("2026-02-30"), null, "le 30 fevrier n existe pas");
  assert.equal(lireJour("2026-13-01"), null, "le mois 13 n existe pas");
  assert.equal(lireJour("2026-00-10"), null, "le mois 0 n existe pas");
  assert.equal(lireJour("2026-12-32"), null);
  assert.equal(lireJour("2026-12"), null, "un mois seul n est pas un jour");
  assert.equal(lireJour(null), null);
  assert.equal(lireJour(""), null);
  assert.deepEqual(lireJour("2028-02-29"), { annee: 2028, mois: 2, jour: 29 }, "bissextile : valide");
  assert.equal(lireJour("2026-02-29"), null, "non bissextile : invalide");
});

// ---------------------------------------------------------------------------
// J-30 — exactement, pas J-31
// ---------------------------------------------------------------------------

test("fin de contrat : UN MOIS CALENDAIRE puis UN JOUR, sans aucun repli en jours", () => {
  /*
   * LA REGLE A CHANGE LE 23 OCTOBRE 2026, ET CE TEST PORTE LE POURQUOI.
   *
   * Avant : J-30 pile. Maintenant : un mois calendaire en arriere, puis un jour. Rien
   * d'autre — pas de plancher, pas de repli.
   *
   * Une version intermediaire prenait le plus tot entre ce calcul et un J-30, pour
   * qu'un mois court n'annonce jamais plus tard qu'avant. David l'a REFUSEE :
   * << Je ne veux PAS au plus tot entre 1 mois moins 1 jour et J-30, ni de regle J-30
   * supplementaire. >> Ce releve existe pour qu'elle ne revienne pas.
   */
  const fin = "2026-12-15";
  const d = [dossier({ date_fin_contrat: fin })];
  const a = (aujourdhui: string) => seulement(deriver({ dossiers: d, etats: [], aujourdhui }), "fin_contrat");

  assert.equal(jourDeclenchementFinContrat(fin), "2026-11-14",
    "15 decembre moins un mois : le 15 novembre ; moins un jour : le 14");
  assert.equal(a("2026-11-14").length, 1, "le declenchement calcule : l alerte sort");
  assert.equal(a("2026-11-13").length, 0, "la veille du declenchement : rien encore");
  assert.equal(a("2026-12-15").length, 1, "le jour meme");

  /*
   * LE CAS D'UN MOIS COURT, et c'est le calendrier qui parle, pas un plancher.
   * Fevrier n'ayant que 28 jours en 2027, le preavis reel vaut 29 jours — assume.
   */
  const mars = "2027-03-15";
  assert.equal(jourDeclenchementFinContrat(mars), "2027-02-14",
    "15 mars moins un mois : le 15 fevrier ; moins un jour : le 14");
  assert.equal(joursEntre("2027-02-14", mars), 29,
    "soit J-29 : un mois court donne un preavis plus court, et c'est la regle voulue");
});

test("fin de contrat : une echeance DEPASSEE reste active jusqu a ce qu on la traite", () => {
  const d = [dossier({ date_fin_contrat: "2026-01-10" })];
  const a = seulement(deriver({ dossiers: d, etats: [], aujourdhui: "2026-03-01" }), "fin_contrat");
  assert.equal(a.length, 1, "le travail reste a faire : le calendrier ne l efface pas");
  assert.ok(a[0].joursRestants < 0, "les jours restants sont negatifs");
  /* C est le bouton << traite >> qui la retire, pas le temps. */
  const etats: EtatConnu[] = [{ dossier_id: "d1", genre: "fin_contrat", periode: "2026-01-10", traitee_le: "2026-03-01T10:00:00Z" }];
  const apres = deriver({ dossiers: d, etats, aujourdhui: "2026-03-01" });
  assert.equal(filtrer(apres, "actives").length, 0);
  assert.equal(filtrer(apres, "traitees").length, 1, "et elle est CONSERVEE dans l historique");
});

test("CHANGER la date de fin cree une NOUVELLE echeance, donc une nouvelle alerte", () => {
  /* L'ancienne etait traitee ; la nouvelle date n a pas d etat, elle revient active. */
  const etats: EtatConnu[] = [{ dossier_id: "d1", genre: "fin_contrat", periode: "2026-12-15", traitee_le: "2026-11-20T09:00:00Z" }];
  const avant = deriver({ dossiers: [dossier({ date_fin_contrat: "2026-12-15" })], etats, aujourdhui: "2026-11-25" });
  assert.equal(filtrer(avant, "actives").filter(x => x.genre === "fin_contrat").length, 0, "traitee");

  const apres = deriver({ dossiers: [dossier({ date_fin_contrat: "2026-12-20" })], etats, aujourdhui: "2026-11-25" });
  const actives = filtrer(apres, "actives").filter(x => x.genre === "fin_contrat");
  assert.equal(actives.length, 1, "la nouvelle date est une nouvelle echeance");
  assert.equal(actives[0].periode, "2026-12-20");
});

// ---------------------------------------------------------------------------
// LE LOYER — recurrent, rabattu, et traitable par mois
// ---------------------------------------------------------------------------

test("loyer : la date est rabattue sur les mois courts", () => {
  /*
   * Chaque cas porte son PROPRE bail, qui commence au mois mesure.
   *
   * Pourquoi : depuis le 22 octobre 2026, l'alerte vise le plus ANCIEN impaye deja echu,
   * pas celui du mois en cours. Un bail qui commencerait des annees plus tot ferait donc
   * remonter sa premiere echeance, et le relevé ne mesurerait plus le rabattement.
   */
  /*
   * Le relevé se fait LA VEILLE de l'echeance depuis le 23 octobre 2026 : avant, une
   * alerte de loyer n'existe plus. Ce test mesure le RABATTEMENT, pas le declenchement —
   * on deplace donc la date d'observation sans toucher a ce qui est mesure.
   */
  const cas: [string, string, string, string][] = [
    ["2026-02-01", "2026-02-28", "2026-02-27", "2026-02-28"],
    ["2028-02-01", "2028-02-29", "2028-02-28", "2028-02-29"],
    ["2026-04-01", "2026-04-30", "2026-04-29", "2026-04-30"],
    ["2026-01-01", "2026-01-31", "2026-01-30", "2026-01-31"],
  ];
  for (const [debut, fin, quand, attendue] of cas) {
    const d = [dossier({ date_entree: debut, date_fin_contrat: fin, jour_encaissement: 31 })];
    const a = seulement(deriver({ dossiers: d, etats: [], aujourdhui: quand }), "loyer");
    assert.equal(a.length, 1, "le " + quand + " : une alerte attendue");
    assert.equal(a[0].echeance, attendue, "le 31 doit etre rabattu sur " + attendue);
    assert.equal(a[0].periode, attendue.slice(0, 7), "la periode suit l echeance");
  }
});

test("loyer : traiter un mois ne traite pas le suivant", () => {
  /*
   * L'etat est garde par PERIODE — (dossier, genre, 'AAAA-MM') — donc traiter novembre
   * ne dit rien de decembre.
   *
   * Pour que decembre arrive, novembre doit etre ENCAISSE : l'alerte vise le plus ancien
   * impaye, donc un novembre impaye resterait devant. C'est exactement la regle posee
   * par David — un loyer encaisse ne reste pas reclame — et elle se mesure ici.
   */
  const d = [dossier({ date_entree: "2026-11-01", date_fin_contrat: "2027-10-31", jour_encaissement: 5 })];
  const etats: EtatConnu[] = [{ dossier_id: "d1", genre: "loyer", periode: "2026-11", traitee_le: "2026-11-05T08:00:00Z" }];

  const nov = deriver({ dossiers: d, etats, aujourdhui: "2026-11-20" });
  assert.equal(filtrer(nov, "actives").length, 0, "novembre est traite");
  assert.equal(filtrer(nov, "traitees").length, 1);

  /* Novembre encaisse : decembre prend la suite, et il n'est ni lu ni traite. */
  const dec = deriver({
    dossiers: d, etats, aujourdhui: "2026-12-20",
    encaissements: [{ dossier_id: "d1", echeance: "2026-11-05" }],
  });
  const loyer = seulement(dec, "loyer");
  assert.equal(loyer.length, 1);
  assert.equal(loyer[0].periode, "2026-12", "c'est decembre qui est reclame");
  assert.equal(loyer[0].traitee, false, "l'etat de novembre ne colore pas decembre");

  /* Sans l'encaissement, novembre reste devant : il est toujours du. */
  const sansEncaissement = seulement(deriver({ dossiers: d, etats, aujourdhui: "2026-12-20" }), "loyer");
  assert.equal(sansEncaissement[0].periode, "2026-11",
    "un novembre impaye doit rester reclame en decembre");
});

test("loyer : l alerte n apparait QUE la veille, puis ne repart plus", () => {
  /*
   * CE TEST ETAIT L INVERSE, ET IL FIGEAIT L ANCIENNE REGLE.
   *
   * Il affirmait << visible tout le mois, avant comme apres l echeance >>. David a
   * demande le contraire le 23 octobre 2026 : rien avant la veille. Le voici retourne,
   * avec les trois memes dates de releve, pour que la comparaison soit lisible.
   *
   * Le trou du 1er au 13 est ASSUME : c'est le prix de la regle demandee. Ce qui n'est
   * pas negociable, et qui est verifie plus bas, c'est qu'une echeance passee et
   * impayee continue de sortir.
   */
  const d = [dossier({ jour_encaissement: 15 })];
  const a = (jour: string) => seulement(deriver({ dossiers: d, etats: [], aujourdhui: jour }), "loyer");

  assert.equal(a("2026-11-01").length, 0, "le 1er : plus rien, c est le changement");
  assert.equal(a("2026-11-13").length, 0, "l avant-veille : rien non plus");
  assert.equal(a("2026-11-14").length, 1, "LA VEILLE : elle sort");
  assert.equal(a("2026-11-14")[0].echeance, "2026-11-15");
  assert.equal(a("2026-11-15").length, 1, "le jour meme");
  assert.equal(a("2026-11-30").length, 1, "et apres, elle reste : c est une dette");
  assert.equal(a("2026-11-30")[0].echeance, "2026-11-15");
});

test("loyer : la veille, l heure compte — rien avant 08:00, tout a partir de 08:00", () => {
  /*
   * Le seul endroit du depot ou l HEURE decide de quelque chose. Les releves passent
   * donc un `moment` explicite au lieu d un jour.
   *
   * Et le test porte `>=`, pas `==` : a 08:00, a 08:03, a 23:59, l alerte est la. Il n y
   * a AUCUNE fenetre a rater, parce qu aucun travail ne tourne a heure fixe — les
   * alertes sont derivees a chaque affichage.
   */
  const d = [dossier({ jour_encaissement: 15 })];
  const a = (jour: string, minutes: number) =>
    seulement(deriver({ dossiers: d, etats: [], aujourdhui: jour, moment: { jour, minutes } }), "loyer");

  assert.equal(a("2026-11-14", 0).length, 0, "minuit la veille : trop tot");
  assert.equal(a("2026-11-14", 7 * 60 + 59).length, 0, "07:59 : toujours trop tot");
  assert.equal(a("2026-11-14", 8 * 60).length, 1, "08:00 PILE : elle sort");
  assert.equal(a("2026-11-14", 8 * 60 + 3).length, 1, "08:03 — quelques minutes apres, rien n est rate");
  assert.equal(a("2026-11-14", 23 * 60 + 59).length, 1, "23:59 le meme jour");
  assert.equal(a("2026-11-15", 0).length, 1, "le lendemain a minuit : l heure ne compte plus");
});

// ---------------------------------------------------------------------------
// LES DOSSIERS INCOMPLETS, ET L ETAT LU/TRAITE
// ---------------------------------------------------------------------------

test("un dossier sans date ni jour ne produit aucune alerte", () => {
  const a = deriver({ dossiers: [dossier()], etats: [], aujourdhui: "2026-11-15" });
  assert.equal(a.length, 0);
});

test("une date ou un jour invalide est ignore, pas devine", () => {
  const cas: Partial<DossierPourAlertes>[] = [
    { date_fin_contrat: "2026-02-30" }, { date_fin_contrat: "pas une date" },
    { jour_encaissement: 0 }, { jour_encaissement: 32 },
    { jour_encaissement: Number.NaN }, { jour_encaissement: null },
  ];
  for (const over of cas) {
    const a = deriver({ dossiers: [dossier(over)], etats: [], aujourdhui: "2026-11-15" });
    assert.equal(a.length, 0, `cas ${JSON.stringify(over)}`);
  }
});

test("le badge compte les NON LUES et NON TRAITEES — traiter sans lire le retire aussi", () => {
  /*
   * Le relevé se fait APRES les trois echeances (5, 6 et 7 novembre), au 8.
   *
   * Pourquoi pas avant : depuis le 23 octobre 2026 une alerte de loyer n'existe que la
   * veille de SON echeance, et trois echeances a trois jours differents n'ont pas la
   * meme veille — il n'existe aucune date ou les trois seraient simultanement << a
   * venir >>. Echues et impayees, en revanche, elles sortent toutes les trois : c'est la
   * regle de la dette, et elle n'a pas change. Ce test mesure le BADGE, pas le
   * declenchement.
   */
  const d = [dossier({ id: "a", jour_encaissement: 5 }), dossier({ id: "b", jour_encaissement: 6 }), dossier({ id: "c", jour_encaissement: 7 })];
  const nu = deriver({ dossiers: d, etats: [], aujourdhui: "2026-11-08" });
  assert.equal(nu.length, 3);
  assert.equal(compteBadge(nu), 3, "aucune ligne d etat : les trois comptent");

  const etats: EtatConnu[] = [
    { dossier_id: "a", genre: "loyer", periode: "2026-11", lue_le: "2026-11-08T08:00:00Z" },
    /* Traitee SANS avoir ete lue : elle doit sortir du badge quand meme. */
    { dossier_id: "b", genre: "loyer", periode: "2026-11", traitee_le: "2026-11-08T09:00:00Z" },
  ];
  const apres = deriver({ dossiers: d, etats, aujourdhui: "2026-11-08" });
  assert.equal(compteBadge(apres), 1, "seule c reste non lue et non traitee");
  assert.equal(filtrer(apres, "actives").length, 2, "a et c restent actives");
  assert.equal(filtrer(apres, "traitees").length, 1, "b est conservee dans l historique");
  assert.equal(filtrer(apres, "toutes").length, 3, "« Toutes » n applique aucun filtre");
});

// ---------------------------------------------------------------------------
// LES BORNES DU CONTRAT — pas de contrat complet, pas d'alerte de loyer
// ---------------------------------------------------------------------------
//
// Jusqu'au 22 octobre 2026, l'alerte de loyer ne regardait QUE jour_encaissement. Elle
// sortait donc tous les mois, indefiniment, sans jamais consulter les bornes du bail.
// Mesure faite sur le dossier reel du module, dont le contrat s'arretait le 20/10/2026 :
//
//     consulte le 15/01/2030                        -> 1 alerte, echeance 20/01/2030
//     contrat du 01/03/2027, consulte le 22/10/2026 -> 1 alerte, deja
//
// L'echeancier rendait la contradiction visible : il disait << contrat termine, 1 loyer >>
// pendant que la cloche reclamait un loyer de 2030. David a tranche : la regle est
// stricte, et c'est la regle du contrat.

test("loyer : un bail TERMINE ne reclame que ses loyers IMPAYES", () => {
  /*
   * LE BUG D'ORIGINE, mesure avant correction : un bail fini le 20/10/2026 reclamait
   * encore, le 15/01/2030, un loyer d'echeance 20/01/2030. Cette echeance N'EXISTE PAS —
   * elle est hors du contrat. C'est ce que construireEcheancier supprime : il ne produit
   * que les echeances comprises entre les deux dates.
   *
   * Ce qui RESTE reclame, en revanche, c'est le loyer du 20/10/2026 lui-meme s'il n'a
   * jamais ete encaisse. C'est une vraie dette, et la faire taire parce que le bail
   * s'est termine ferait perdre de l'argent.
   */
  const d = [dossier({ date_entree: "2026-10-06", date_fin_contrat: "2026-10-20", jour_encaissement: 20 })];
  const paye = [{ dossier_id: "d1", echeance: "2026-10-20" }];

  for (const quand of ["2026-11-15", "2027-06-15", "2030-01-10"]) {
    const impaye = seulement(deriver({ dossiers: d, etats: [], aujourdhui: quand }), "loyer");
    assert.equal(impaye.length, 1, "le " + quand + " : le loyer impaye doit rester reclame");
    assert.equal(impaye[0].echeance, "2026-10-20",
      "le " + quand + " : l'echeance doit rester celle du contrat, jamais une date inventee");

    const regle = seulement(deriver({ dossiers: d, etats: [], aujourdhui: quand, encaissements: paye }), "loyer");
    assert.equal(regle.length, 0, "le " + quand + " : un loyer encaisse ne se reclame plus");
  }
});

test("loyer : un bail PAS ENCORE COMMENCE ne reclame rien", () => {
  const d = [dossier({ date_entree: "2027-03-01", date_fin_contrat: "2028-02-29", jour_encaissement: 15 })];
  assert.equal(seulement(deriver({ dossiers: d, etats: [], aujourdhui: "2026-10-22" }), "loyer").length, 0,
    "un contrat qui commence en 2027 reclame deja son loyer en 2026");
  /* Et des qu'il commence, il reclame — a la veille de sa premiere echeance. */
  assert.equal(seulement(deriver({ dossiers: d, etats: [], aujourdhui: "2027-03-02" }), "loyer").length, 0,
    "commence mais l echeance est le 15 : pas encore la veille");
  assert.equal(seulement(deriver({ dossiers: d, etats: [], aujourdhui: "2027-03-14" }), "loyer").length, 1,
    "la veille de la premiere echeance : son loyer doit sortir");
});

test("loyer : les BORNES sont incluses, des deux cotes", () => {
  /*
   * Un bail qui finit le 20 doit encore son loyer du 20, et un bail qui commence le 5
   * doit celui du 5. Ce sont les deux cas ou un << plus petit que >> au lieu d'un
   * << plus petit ou egal >> ferait disparaitre un vrai loyer sans que personne ne s'en
   * apercoive.
   *
   * Chaque bail ne couvre qu'un seul mois : sans cela, l'alerte viserait une echeance
   * anterieure et le relevé ne mesurerait plus la borne.
   */
  /* Relevé a la VEILLE de chaque echeance : ce test mesure les bornes du bail, pas le
     declenchement. */
  const finPile = [dossier({ date_entree: "2026-11-01", date_fin_contrat: "2026-11-20", jour_encaissement: 20 })];
  const a1 = seulement(deriver({ dossiers: finPile, etats: [], aujourdhui: "2026-11-19" }), "loyer");
  assert.equal(a1.length, 1, "l'echeance EGALE a la fin du bail doit sortir");
  assert.equal(a1[0].echeance, "2026-11-20");

  const debutPile = [dossier({ date_entree: "2026-11-05", date_fin_contrat: "2026-11-30", jour_encaissement: 5 })];
  const a2 = seulement(deriver({ dossiers: debutPile, etats: [], aujourdhui: "2026-11-04" }), "loyer");
  assert.equal(a2.length, 1, "l'echeance EGALE au debut du bail doit sortir");
  assert.equal(a2[0].echeance, "2026-11-05");

  /* Un jour de plus de chaque cote, et il n'y a plus rien du tout. */
  const finVeille = [dossier({ date_entree: "2026-11-01", date_fin_contrat: "2026-11-19", jour_encaissement: 20 })];
  assert.equal(seulement(deriver({ dossiers: finVeille, etats: [], aujourdhui: "2026-11-10" }), "loyer").length, 0,
    "une echeance APRES la fin du bail ne doit pas sortir");

  const debutLendemain = [dossier({ date_entree: "2026-11-06", date_fin_contrat: "2026-11-30", jour_encaissement: 5 })];
  assert.equal(seulement(deriver({ dossiers: debutLendemain, etats: [], aujourdhui: "2026-11-01" }), "loyer").length, 0,
    "une echeance AVANT le debut du bail ne doit pas sortir");
});

test("loyer : un contrat INCOMPLET ne produit aucune alerte", () => {
  const cas: [string, Partial<DossierPourAlertes>][] = [
    ["sans date d entree", { date_entree: null, date_fin_contrat: "2027-12-31", jour_encaissement: 5 }],
    ["sans date de fin", { date_entree: "2026-01-01", date_fin_contrat: null, jour_encaissement: 5 }],
    ["sans jour d encaissement", { date_entree: "2026-01-01", date_fin_contrat: "2027-12-31", jour_encaissement: null }],
    ["sans aucune des trois", { date_entree: null, date_fin_contrat: null, jour_encaissement: null }],
    ["date d entree abimee", { date_entree: "pas-une-date", date_fin_contrat: "2027-12-31", jour_encaissement: 5 }],
    ["date de fin abimee", { date_entree: "2026-01-01", date_fin_contrat: "2026-13-99", jour_encaissement: 5 }],
  ];
  for (const [quoi, over] of cas) {
    const a = deriver({ dossiers: [dossier(over)], etats: [], aujourdhui: "2026-11-15" });
    assert.equal(seulement(a, "loyer").length, 0, quoi + " : une alerte de loyer est sortie quand meme");
  }
});

test("loyer : le rabattement joue AVANT la borne, pas apres", () => {
  /*
   * Le piege fin. Un bail qui finit le 28 fevrier, avec un loyer au 31 : l'echeance
   * rabattue EST le 28 fevrier, donc elle tombe pile sur la fin et doit sortir.
   *
   * Si la borne etait comparee au jour BRUT (31), elle le trouverait apres le 28 et
   * ferait disparaitre un loyer parfaitement du.
   */
  /* Relevé la VEILLE du 28 : ce test mesure le rabattement face a la borne, pas le
     declenchement. */
  const d = [dossier({ date_entree: "2026-02-01", date_fin_contrat: "2026-02-28", jour_encaissement: 31 })];
  const a = seulement(deriver({ dossiers: d, etats: [], aujourdhui: "2026-02-27" }), "loyer");
  assert.equal(a.length, 1, "le loyer rabattu sur la fin du bail doit sortir");
  assert.equal(a[0].echeance, "2026-02-28");

  /*
   * Et en annee bissextile, le rabattement donne le 29, qui depasse une fin au 28.
   * On releve APRES le 28 : si une echeance existait, elle serait echue donc visible
   * sans condition d'heure — le zero attendu ne peut donc pas venir du declenchement,
   * il vient bien de la borne.
   */
  const bissextile = [dossier({ date_entree: "2028-02-01", date_fin_contrat: "2028-02-28", jour_encaissement: 31 })];
  assert.equal(seulement(deriver({ dossiers: bissextile, etats: [], aujourdhui: "2028-02-29" }), "loyer").length, 0,
    "rabattu au 29, le loyer depasse une fin de bail au 28 : il ne doit pas sortir");
});

test("fin de contrat : la regle du loyer ne l a PAS touchee", () => {
  /* Les deux alertes sont independantes. Un contrat sans jour d encaissement doit
     toujours annoncer sa fin — c'est meme le cas le plus courant. */
  const d = [dossier({ date_entree: "2026-01-01", date_fin_contrat: "2026-11-20", jour_encaissement: null })];
  const a = deriver({ dossiers: d, etats: [], aujourdhui: "2026-11-10" });
  assert.equal(seulement(a, "fin_contrat").length, 1, "la fin de contrat doit toujours sortir");
  assert.equal(seulement(a, "loyer").length, 0, "mais pas le loyer, faute de jour d encaissement");
});

test("un etat qui ne correspond a aucune alerte derivee est inerte", () => {
  /* Cas reel : une alerte traitee il y a six mois, dont la periode n est plus
     derivee. Elle ne doit NI reapparaitre, NI faire planter la derivation. */
  const etats: EtatConnu[] = [{ dossier_id: "d1", genre: "loyer", periode: "2026-05", traitee_le: "2026-05-05T08:00:00Z" }];
  const a = deriver({ dossiers: [dossier({ jour_encaissement: 5 })], etats, aujourdhui: "2026-11-15" });
  assert.equal(a.length, 1);
  assert.equal(a[0].periode, "2026-11");
  assert.equal(a[0].traitee, false, "l etat de mai ne doit pas colorer novembre");
});

test("l ordre est le plus urgent d abord, et il est STABLE a egalite", () => {
  const d = [
    dossier({ id: "z", locataire: "Zoe", jour_encaissement: 20 }),
    dossier({ id: "a", locataire: "Albert", jour_encaissement: 20 }),
    dossier({ id: "m", locataire: "Marc", date_fin_contrat: "2026-11-18" }),
  ];
  const un = deriver({ dossiers: d, etats: [], aujourdhui: "2026-11-10" });
  const deux = deriver({ dossiers: [...d].reverse(), etats: [], aujourdhui: "2026-11-10" });
  assert.deepEqual(un.map(a => a.dossier_id + a.genre), deux.map(a => a.dossier_id + a.genre),
    "l ordre ne doit pas dependre de l ordre d arrivee des dossiers");
  assert.equal(un[0].dossier_id, "m", "la fin de contrat du 18 est la plus proche");
});

test("l affichage porte TOUJOURS locataire, proprietaire et echeance", () => {
  /* Exigence explicite de David : << je veux TOUJOURS pouvoir comprendre
     immediatement de quel locataire il s agit, pour quel proprietaire, et quelle
     est la date >>. Un dossier sans locataire retombe sur le nom du client. */
  const a = deriver({
    dossiers: [dossier({ locataire: null, proprietaire: null, jour_encaissement: 5, date_fin_contrat: "2026-11-20" })],
    /* Le 4 : la veille de l echeance de loyer (le 5), et bien apres le declenchement de
       la fin de contrat du 20. Les DEUX genres sortent, ce qui est l objet du relevé. */
    etats: [], aujourdhui: "2026-11-04",
  });
  assert.equal(a.length, 2);
  for (const x of a) {
    assert.ok(x.locataire.length > 0, "le locataire n est jamais vide");
    assert.ok(x.proprietaire.length > 0, "le proprietaire n est jamais vide");
    assert.match(x.echeance, MOTIF_FIN, "l echeance est toujours une date affichable");
  }
  assert.equal(a[0].locataire, "Jean Dupont", "a defaut de locataire, le nom du client");
});

/* -------------------------------------------------------------------------
 * LA PHRASE : une seule, en deux moities
 * ------------------------------------------------------------------------- */

test("la phrase de David, au caractere pres, pour les deux genres", () => {
  /*
   * Exigence litterale, enrichie le 22 octobre 2026 du RANG DU LOYER :
   *
   *   Contrat bientot termine — {locataire} — proprietaire {proprietaire} — echeance le {date}
   *   Loyer a encaisser — {n}e loyer sur {total} — {locataire} — pour {proprietaire} — echeance le {date}
   *
   * Le rang vient de construireEcheancier, donc il est forcement d'accord avec l'onglet
   * Echeancier loyers : c'est la meme fonction qui les produit tous les deux.
   *
   * Ce test est volontairement ecrit en DUR, sans reutiliser les constantes du module :
   * un test qui derive sa valeur attendue de la source ne verifie plus rien.
   */
  const a = deriver({
    dossiers: [dossier({
      date_entree: "2026-11-01", date_fin_contrat: "2026-12-15", jour_encaissement: 5,
    })],
    etats: [], aujourdhui: "2026-11-19",
  });
  const fin = a.find(x => x.genre === "fin_contrat")!;
  const loyer = a.find(x => x.genre === "loyer")!;

  assert.equal(
    libelleAlerte(fin),
    "Contrat bientôt terminé — Jean Dupont — propriétaire Sarah Cohen — échéance le 15/12/2026",
  );
  assert.equal(
    libelleAlerte(loyer),
    /* Un bail du 01/11 au 15/12 avec un loyer au 5 contient DEUX echeances : le 05/11 et
       le 05/12. Le 19 novembre, celle de novembre est echue et impayee — c'est donc le
       1er loyer sur 2. */
    "Loyer à encaisser — 1er loyer sur 2 — Jean Dupont — pour Sarah Cohen — échéance le 05/11/2026",
  );

  /* Un mois plus tard, novembre toujours impaye : la phrase dit le RETARD, et garde le
     meme numero — c'est bien le premier loyer qui n'a pas ete paye. */
  const enRetard = deriver({
    dossiers: [dossier({
      date_entree: "2026-11-01", date_fin_contrat: "2026-12-15", jour_encaissement: 5,
    })],
    etats: [], aujourdhui: "2026-12-10",
  }).find(x => x.genre === "loyer")!;
  assert.equal(
    libelleAlerte(enRetard),
    "Loyer en retard — 1er loyer sur 2 — Jean Dupont — pour Sarah Cohen — échéance le 05/11/2026",
  );

  /* Novembre encaisse : on passe au second, et il n'est plus en retard. */
  const suivant = deriver({
    dossiers: [dossier({
      date_entree: "2026-11-01", date_fin_contrat: "2026-12-15", jour_encaissement: 5,
    })],
    etats: [], aujourdhui: "2026-12-10",
    encaissements: [{ dossier_id: "d1", echeance: "2026-11-05" }],
  }).find(x => x.genre === "loyer")!;
  assert.equal(
    libelleAlerte(suivant),
    "Loyer à encaisser — 2e loyer sur 2 — Jean Dupont — pour Sarah Cohen — échéance le 05/12/2026",
  );
});

test("titre + detail redonnent EXACTEMENT la phrase entiere", () => {
  /*
   * Le hub general affiche le titre en gras puis le detail en dessous ; la cloche du
   * module affiche la phrase entiere. Si les trois textes pouvaient diverger, le meme
   * evenement se lirait differemment selon la surface — et l utilisateur se demanderait
   * s il s agit de deux alertes.
   *
   * libelleAlerte EST definie comme titre + separateur + detail. Ce test fige l identite
   * pour que personne ne reecrive l une des trois a la main. Le rang du loyer vit dans
   * le TITRE, donc il traverse les trois surfaces sans etre ecrit deux fois.
   */
  const a = deriver({
    dossiers: [
      dossier({ date_entree: "2026-02-01", date_fin_contrat: "2026-02-28", jour_encaissement: 31 }),
      dossier({ id: "d2", locataire: "Marie-Antoinette Vandenbergheimerstein",
                proprietaire: "Jean-Baptiste de la Rochefoucauld", jour_encaissement: 1,
                date_entree: "2026-02-01", date_fin_contrat: "2027-01-03" }),
    ],
    etats: [], aujourdhui: "2026-02-01",
  });
  assert.ok(a.length >= 2, "le jeu d epreuve ne produit pas assez d alertes");
  for (const x of a) {
    assert.equal(libelleAlerte(x), titreAlerte(x) + " — " + detailAlerte(x),
      "la phrase ne se recompose pas depuis ses deux moities : " + libelleAlerte(x));
    /* Et le detail ne doit PAS recommencer par le titre : c est le defaut mesure a
       375 px, ou le titre apparaissait deux fois dans la ligne du hub. */
    assert.ok(!detailAlerte(x).startsWith(titreAlerte(x)),
      "le detail repete le titre : " + detailAlerte(x));
  }

  /* Le rang est dans le titre, jamais dans le detail : sinon il s'afficherait deux fois
     dans la cloche du module, qui montre la phrase entiere. */
  const loyer = a.find(x => x.genre === "loyer")!;
  assert.match(titreAlerte(loyer), /loyer sur \d+/, "le titre doit porter le rang");
  assert.doesNotMatch(detailAlerte(loyer), /loyer sur \d+/, "le detail ne doit PAS le repeter");
});

test("une date est toujours jj/mm/aaaa, jamais la locale du poste", () => {
  /* toLocaleDateString rendrait 12/15/2026 sur un poste en anglais. */
  assert.equal(enDateFrancaise("2026-12-15"), "15/12/2026");
  assert.equal(enDateFrancaise("2026-01-05"), "05/01/2026");
  assert.equal(enDateFrancaise("pas-une-date"), "—");
});
