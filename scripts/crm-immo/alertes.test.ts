// Toute l'arithmetique des alertes CRM Immo : ni la base ni le navigateur ne la controlent.
//   node --test scripts/crm-immo/alertes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  journeeDeReference, dernierJourDuMois, jourRabattu, periodeLoyer, lireJour, joursEntre,
  deriverAlertes, filtrer, compteBadge, PREAVIS_FIN_CONTRAT,
  type DossierPourAlertes, type EtatConnu, type Alerte,
} from "../../src/lib/crmImmoAlertes.ts";

/* Les deux expressions reellement posees par la contrainte
   crm_immo_etats_periode_valide. Toute periode produite doit leur obeir, sinon
   l'insertion est REFUSEE par la base — bruyamment, mais apres coup. */
const MOTIF_LOYER = /^[0-9]{4}-(0[1-9]|1[0-2])$/;
const MOTIF_FIN = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

const dossier = (over: Partial<DossierPourAlertes> = {}): DossierPourAlertes => ({
  id: "d1", nom: "Dupont", prenom: "Jean",
  locataire: "Jean Dupont", proprietaire: "Sarah Cohen",
  date_fin_contrat: null, jour_encaissement: null, ...over,
});

const seulement = (alertes: Alerte[], genre: string) => alertes.filter(a => a.genre === genre);

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
    seulement(deriverAlertes({ dossiers: d, etats: [], aujourdhui: jour }), "loyer")[0].periode;
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
    const a = deriverAlertes({
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

test("fin de contrat : active a J-30 PILE, pas a J-31", () => {
  const fin = "2026-12-15";
  const d = [dossier({ date_fin_contrat: fin })];
  const a = (aujourdhui: string) => seulement(deriverAlertes({ dossiers: d, etats: [], aujourdhui }), "fin_contrat");

  assert.equal(joursEntre("2026-11-15", fin), 30, "le 15 novembre est bien J-30");
  assert.equal(a("2026-11-15").length, 1, "a J-30 l alerte sort");
  assert.equal(a("2026-11-14").length, 0, "a J-31 elle ne sort pas encore");
  assert.equal(a("2026-12-15").length, 1, "le jour meme");
  assert.equal(PREAVIS_FIN_CONTRAT, 30);
});

test("fin de contrat : une echeance DEPASSEE reste active jusqu a ce qu on la traite", () => {
  const d = [dossier({ date_fin_contrat: "2026-01-10" })];
  const a = seulement(deriverAlertes({ dossiers: d, etats: [], aujourdhui: "2026-03-01" }), "fin_contrat");
  assert.equal(a.length, 1, "le travail reste a faire : le calendrier ne l efface pas");
  assert.ok(a[0].joursRestants < 0, "les jours restants sont negatifs");
  /* C est le bouton << traite >> qui la retire, pas le temps. */
  const etats: EtatConnu[] = [{ dossier_id: "d1", genre: "fin_contrat", periode: "2026-01-10", traitee_le: "2026-03-01T10:00:00Z" }];
  const apres = deriverAlertes({ dossiers: d, etats, aujourdhui: "2026-03-01" });
  assert.equal(filtrer(apres, "actives").length, 0);
  assert.equal(filtrer(apres, "traitees").length, 1, "et elle est CONSERVEE dans l historique");
});

test("CHANGER la date de fin cree une NOUVELLE echeance, donc une nouvelle alerte", () => {
  /* L'ancienne etait traitee ; la nouvelle date n a pas d etat, elle revient active. */
  const etats: EtatConnu[] = [{ dossier_id: "d1", genre: "fin_contrat", periode: "2026-12-15", traitee_le: "2026-11-20T09:00:00Z" }];
  const avant = deriverAlertes({ dossiers: [dossier({ date_fin_contrat: "2026-12-15" })], etats, aujourdhui: "2026-11-25" });
  assert.equal(filtrer(avant, "actives").filter(x => x.genre === "fin_contrat").length, 0, "traitee");

  const apres = deriverAlertes({ dossiers: [dossier({ date_fin_contrat: "2026-12-20" })], etats, aujourdhui: "2026-11-25" });
  const actives = filtrer(apres, "actives").filter(x => x.genre === "fin_contrat");
  assert.equal(actives.length, 1, "la nouvelle date est une nouvelle echeance");
  assert.equal(actives[0].periode, "2026-12-20");
});

// ---------------------------------------------------------------------------
// LE LOYER — recurrent, rabattu, et traitable par mois
// ---------------------------------------------------------------------------

test("loyer : une alerte par mois civil, avec la date rabattue", () => {
  const d = [dossier({ jour_encaissement: 31 })];
  const fevrier = seulement(deriverAlertes({ dossiers: d, etats: [], aujourdhui: "2026-02-10" }), "loyer");
  assert.equal(fevrier.length, 1);
  assert.equal(fevrier[0].periode, "2026-02");
  assert.equal(fevrier[0].echeance, "2026-02-28", "le 31 fevrier est rabattu sur le 28");

  const bissextile = seulement(deriverAlertes({ dossiers: d, etats: [], aujourdhui: "2028-02-10" }), "loyer");
  assert.equal(bissextile[0].echeance, "2028-02-29");

  const avril = seulement(deriverAlertes({ dossiers: d, etats: [], aujourdhui: "2026-04-10" }), "loyer");
  assert.equal(avril[0].echeance, "2026-04-30");
});

test("loyer : traiter novembre ne traite pas decembre", () => {
  const d = [dossier({ jour_encaissement: 5 })];
  const etats: EtatConnu[] = [{ dossier_id: "d1", genre: "loyer", periode: "2026-11", traitee_le: "2026-11-05T08:00:00Z" }];

  const nov = deriverAlertes({ dossiers: d, etats, aujourdhui: "2026-11-20" });
  assert.equal(filtrer(nov, "actives").length, 0, "novembre est traite");
  assert.equal(filtrer(nov, "traitees").length, 1);

  const dec = deriverAlertes({ dossiers: d, etats, aujourdhui: "2026-12-02" });
  const actives = filtrer(dec, "actives");
  assert.equal(actives.length, 1, "decembre est une periode NEUVE : l alerte revient");
  assert.equal(actives[0].periode, "2026-12");
});

test("loyer : l alerte est visible tout le mois, avant comme apres l echeance", () => {
  const d = [dossier({ jour_encaissement: 15 })];
  for (const jour of ["2026-11-01", "2026-11-15", "2026-11-30"]) {
    const a = seulement(deriverAlertes({ dossiers: d, etats: [], aujourdhui: jour }), "loyer");
    assert.equal(a.length, 1, `le ${jour}`);
    assert.equal(a[0].echeance, "2026-11-15");
  }
});

// ---------------------------------------------------------------------------
// LES DOSSIERS INCOMPLETS, ET L ETAT LU/TRAITE
// ---------------------------------------------------------------------------

test("un dossier sans date ni jour ne produit aucune alerte", () => {
  const a = deriverAlertes({ dossiers: [dossier()], etats: [], aujourdhui: "2026-11-15" });
  assert.equal(a.length, 0);
});

test("une date ou un jour invalide est ignore, pas devine", () => {
  const cas: Partial<DossierPourAlertes>[] = [
    { date_fin_contrat: "2026-02-30" }, { date_fin_contrat: "pas une date" },
    { jour_encaissement: 0 }, { jour_encaissement: 32 },
    { jour_encaissement: Number.NaN }, { jour_encaissement: null },
  ];
  for (const over of cas) {
    const a = deriverAlertes({ dossiers: [dossier(over)], etats: [], aujourdhui: "2026-11-15" });
    assert.equal(a.length, 0, `cas ${JSON.stringify(over)}`);
  }
});

test("le badge compte les NON LUES et NON TRAITEES — traiter sans lire le retire aussi", () => {
  const d = [dossier({ id: "a", jour_encaissement: 5 }), dossier({ id: "b", jour_encaissement: 6 }), dossier({ id: "c", jour_encaissement: 7 })];
  const nu = deriverAlertes({ dossiers: d, etats: [], aujourdhui: "2026-11-02" });
  assert.equal(nu.length, 3);
  assert.equal(compteBadge(nu), 3, "aucune ligne d etat : les trois comptent");

  const etats: EtatConnu[] = [
    { dossier_id: "a", genre: "loyer", periode: "2026-11", lue_le: "2026-11-02T08:00:00Z" },
    /* Traitee SANS avoir ete lue : elle doit sortir du badge quand meme. */
    { dossier_id: "b", genre: "loyer", periode: "2026-11", traitee_le: "2026-11-02T09:00:00Z" },
  ];
  const apres = deriverAlertes({ dossiers: d, etats, aujourdhui: "2026-11-02" });
  assert.equal(compteBadge(apres), 1, "seule c reste non lue et non traitee");
  assert.equal(filtrer(apres, "actives").length, 2, "a et c restent actives");
  assert.equal(filtrer(apres, "traitees").length, 1, "b est conservee dans l historique");
  assert.equal(filtrer(apres, "toutes").length, 3, "« Toutes » n applique aucun filtre");
});

test("un etat qui ne correspond a aucune alerte derivee est inerte", () => {
  /* Cas reel : une alerte traitee il y a six mois, dont la periode n est plus
     derivee. Elle ne doit NI reapparaitre, NI faire planter la derivation. */
  const etats: EtatConnu[] = [{ dossier_id: "d1", genre: "loyer", periode: "2026-05", traitee_le: "2026-05-05T08:00:00Z" }];
  const a = deriverAlertes({ dossiers: [dossier({ jour_encaissement: 5 })], etats, aujourdhui: "2026-11-15" });
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
  const un = deriverAlertes({ dossiers: d, etats: [], aujourdhui: "2026-11-10" });
  const deux = deriverAlertes({ dossiers: [...d].reverse(), etats: [], aujourdhui: "2026-11-10" });
  assert.deepEqual(un.map(a => a.dossier_id + a.genre), deux.map(a => a.dossier_id + a.genre),
    "l ordre ne doit pas dependre de l ordre d arrivee des dossiers");
  assert.equal(un[0].dossier_id, "m", "la fin de contrat du 18 est la plus proche");
});

test("l affichage porte TOUJOURS locataire, proprietaire et echeance", () => {
  /* Exigence explicite de David : << je veux TOUJOURS pouvoir comprendre
     immediatement de quel locataire il s agit, pour quel proprietaire, et quelle
     est la date >>. Un dossier sans locataire retombe sur le nom du client. */
  const a = deriverAlertes({
    dossiers: [dossier({ locataire: null, proprietaire: null, jour_encaissement: 5, date_fin_contrat: "2026-11-20" })],
    etats: [], aujourdhui: "2026-11-01",
  });
  assert.equal(a.length, 2);
  for (const x of a) {
    assert.ok(x.locataire.length > 0, "le locataire n est jamais vide");
    assert.ok(x.proprietaire.length > 0, "le proprietaire n est jamais vide");
    assert.match(x.echeance, MOTIF_FIN, "l echeance est toujours une date affichable");
  }
  assert.equal(a[0].locataire, "Jean Dupont", "a defaut de locataire, le nom du client");
});
