// Le retard se declenche AU JOUR, et l'ecran le voit passer minuit sans etre rouvert.
//   node --import tsx --test scripts/crm-immo/retardAuJour.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { statutDe, LIBELLE_STATUT } from "../../src/lib/crmImmoEcheancier.ts";

/*
 * ============== CE QUE CE FICHIER TIENT ==============
 *
 * David, le 28/10/2026 :
 *   « si l'echeance est aujourd'hui et non payee -> A encaisser aujourd'hui »
 *   « des que aujourd'hui > date d'echeance et que ce n'est pas paye -> En retard »
 *   « corrige aussi l'horloge gelee : si l'ecran reste ouvert apres minuit, le statut doit
 *     se recalculer automatiquement sans fermer/reouvrir la modale »
 *   « ne touche pas au timezone Asia/Jerusalem »
 *
 * ---------- CE N'ETAIT PAS UN BUG, C'ETAIT UNE AUTRE REGLE ----------
 *
 * La granularite etait le MOIS, assumee et defendue en commentaire : « un loyer du mois en
 * cours est a encaisser, un loyer d'un mois passe est en retard ». Une echeance du 12
 * octobre impayee restait donc « a encaisser » du 13 au 31, et ne basculait que le
 * 1er novembre. Le changement est volontaire — d'ou les releves A, qui disent la NOUVELLE
 * regle, et le contre-temoin qui empeche l'ancienne de revenir en silence.
 *
 * ---------- ET LE FUSEAU N'Y ETAIT POUR RIEN ----------
 *
 * C'etait la piste naturelle, et elle etait fausse. Le code ne construit AUCUN objet Date
 * sur une echeance : il compare des chaines 'AAAA-MM-JJ'. Le piege classique —
 * `new Date('2026-10-27')` lu en UTC contre `new Date(2026, 9, 27)` lu en local — n'existe
 * pas ici. Les releves C verrouillent cette absence, parce qu'« ameliorer » ce calcul avec
 * un objet Date rendrait « En retard » different d'un poste a l'autre.
 */

const lire = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const LIB = "src/lib/crmImmoEcheancier.ts";
const HOOK = "src/pages/admin/views/crm-immo/useCrmImmoEcheancier.ts";
const MODALE = "src/pages/admin/views/crm-immo/CrmImmoDetailsModal.tsx";
const TABLEAU = "src/pages/admin/views/crm-immo/useCrmImmoTableauDeBord.ts";

// ===================== A. LA REGLE EST AU JOUR =====================

test("A1 la frontiere est le jour, des deux cotes", () => {
  const AUJ = "2026-10-27";
  assert.equal(statutDe("2026-10-28", false, AUJ), "a-venir", "demain");
  assert.equal(statutDe(AUJ, false, AUJ), "a-encaisser", "aujourd'hui meme");
  assert.equal(statutDe("2026-10-26", false, AUJ), "en-retard", "hier");
});

test("A2 l'exemple de David : une echeance du 12, le 12 puis le 13", () => {
  assert.equal(statutDe("2026-10-12", false, "2026-10-12"), "a-encaisser");
  assert.equal(statutDe("2026-10-12", false, "2026-10-13"), "en-retard");
});

test("A3 CONTRE-TEMOIN : la granularite MOIS ne peut plus revenir", () => {
  /*
   * Sous l'ancienne regle, ces trois cas rendaient 'a-encaisser' : meme mois civil. S'ils
   * y revenaient, le basculement attendrait de nouveau le 1er du mois suivant — et rien
   * d'autre ne le signalerait.
   */
  assert.equal(statutDe("2026-10-01", false, "2026-10-31"), "en-retard", "trente jours dans le mois");
  assert.equal(statutDe("2026-10-05", false, "2026-10-06"), "en-retard", "un jour dans le mois");
  assert.equal(statutDe("2026-10-12", false, "2026-10-20"), "en-retard", "huit jours dans le mois");
});

test("A4 un loyer encaisse n'est jamais en retard, quelle que soit sa date", () => {
  /* `encaisse` passe avant tout : c'est ce qui empeche la nouvelle regle de peindre en
     rouge des echeances deja reglees. */
  assert.equal(statutDe("2020-01-01", true, "2026-10-27"), "encaisse");
  assert.equal(statutDe("2030-01-01", true, "2026-10-27"), "encaisse");
});

test("A5 le libelle de la carte dit la regle du JOUR", () => {
  /*
   * David a demande que la carte s'appelle « A encaisser aujourd'hui ». Ce n'est pas
   * cosmetique : avec la regle au jour, cette carte ne compte plus qu'une echeance due
   * EXACTEMENT aujourd'hui, donc elle affichera souvent zero. Un libelle qui laisserait
   * croire a un arriere ferait chercher une panne.
   */
  const filtres = lire("src/pages/admin/views/crm-immo/CrmImmoFilters.tsx");
  assert.match(filtres, /'loyers-a-encaisser': 'À encaisser aujourd’hui'/,
    "le filtre ne porte plus le libelle demande");

  const carte = lire("src/pages/admin/views/SocieteKpiGrid.tsx");
  const ligne = carte.split("\n").find(l => l.includes("key: 'loyers-a-encaisser'"));
  assert.ok(ligne, "la carte du tableau de bord a disparu");
  assert.match(ligne, /label: 'À encaisser aujourd’hui'/, "la carte ne porte plus le libelle demande");
  /* Et son SOUS-TITRE devait suivre : il disait « Dus ce mois-ci », ce que la regle au jour
     rend faux. Un sous-titre faux est pire qu'absent — c'est lui qui explique le chiffre. */
  assert.ok(!ligne.includes("Dus ce mois-ci"),
    "le sous-titre annonce encore le mois alors que la carte compte le jour");

  /* La pastille de ligne, elle, reste courte : chaque ligne de l'echeancier porte sa date,
     et cette table n'a pas de defilement horizontal. */
  assert.equal(LIBELLE_STATUT["a-encaisser"], "À encaisser");
  assert.equal(LIBELLE_STATUT["en-retard"], "En retard");
});

// ===================== B. L'HORLOGE EST VIVANTE, ET UNIQUE =====================

test("B1 l'echeancier ne calcule plus son jour tout seul : il le recoit", () => {
  /*
   * LE DEFAUT : `useMemo(() => journeeDeReference(new Date(), fuseau), [fuseau])` ou
   * `fuseau` est une constante de module. La dependance ne changeant JAMAIS, la valeur
   * etait figee au montage. Une modale ouverte a cheval sur minuit gardait les statuts de
   * la veille, pendant que les cartes du tableau de bord avancaient toutes les 60 s.
   */
  const code = sansCommentaires(lire(HOOK));
  assert.match(code, /export function useCrmImmoEcheancier\(dossierId: string \| null, aujourdhuiPartage\?: string\)/,
    "le crochet ne recoit plus le jour de reference");
  assert.match(code, /const aujourdhui = aujourdhuiPartage \?\? propre;/,
    "le jour partage ne prime plus sur le calcul local");
});

test("B2 UNE seule horloge : aucun second minuteur n'est apparu", () => {
  /*
   * Deux minuteurs pourraient franchir minuit a deux instants, et faire dire aux cartes et
   * a la modale deux choses differentes pendant quelques secondes. Le module n'en a qu'un,
   * celui du tableau de bord.
   */
  const hook = sansCommentaires(lire(HOOK));
  assert.ok(!/setInterval/.test(hook), "un minuteur a ete ajoute a l'echeancier : deux horloges");

  /*
   * Le tableau de bord porte DEUX minuteurs, et il ne faut pas les confondre — mon premier
   * releve les comptait ensemble et rougissait sur un fichier correct. L'un avance
   * l'HORLOGE (RYTHME_DERIVATION), l'autre relit le RESEAU (RYTHME_RESEAU). C'est le
   * premier qui doit rester unique : c'est lui qui decide du jour.
   */
  const tableau = sansCommentaires(lire(TABLEAU));
  assert.equal((tableau.match(/setInterval\(avancer, RYTHME_DERIVATION\)/g) ?? []).length, 1,
    "le tableau de bord ne porte plus exactement UNE horloge");
  assert.equal((tableau.match(/setInterval/g) ?? []).length, 2,
    "le nombre de minuteurs du tableau de bord a change : verifier lequel a ete ajoute");
});

test("B3 l'horloge traverse par le contexte du module, jusqu'a la modale", () => {
  /* Un maillon manquant et la modale retombe sur son calcul fige, en silence. */
  const contexte = sansCommentaires(lire("src/contexts/CrmImmoAlertesContext.tsx"));
  assert.match(contexte, /aujourdhui: string;/, "le contexte ne porte plus le jour de reference");

  const dashboard = sansCommentaires(lire("src/pages/admin/AdminDashboard.tsx"));
  assert.match(dashboard, /aujourdhui: tableauImmo\.aujourdhui,/,
    "le panel n'alimente plus le jour partage");

  const modale = sansCommentaires(lire(MODALE));
  assert.match(modale, /useCrmImmoEcheancier\(dossier\.id, partageImmo\?\.tableauDeBord\?\.aujourdhui\)/,
    "la modale ne lit plus l'horloge partagee");
});

// ===================== C. LE FUSEAU N'A PAS BOUGE =====================

test("C1 la comparaison reste lexicographique : aucun objet Date sur une echeance", () => {
  /*
   * `new Date('2026-10-27')` est interprete en UTC, `new Date(2026, 9, 27)` en local : un
   * jour d'ecart en sort, et il depend du poste. Comparer des chaines 'AAAA-MM-JJ' evite
   * la question entierement — c'est ce qui fait que « En retard » veut dire la meme chose
   * partout.
   */
  const code = sansCommentaires(lire(LIB));
  const fonction = code.slice(code.indexOf("export function statutDe"), code.indexOf("export function", code.indexOf("export function statutDe") + 10));
  assert.ok(fonction.length > 50, "statutDe est introuvable");
  assert.ok(!/new Date/.test(fonction), "un objet Date est entre dans statutDe : le fuseau redevient une variable");
  assert.match(fonction, /return date < aujourdhui \? 'en-retard' : 'a-encaisser';/,
    "la regle au jour a ete reecrite");
});

test("C2 le jour de reference reste calcule en Asia/Jerusalem", () => {
  /* Le fuseau est PAR UTILISATEUR ailleurs dans le depot ; ici il est fixe, exprès, pour
     qu'une echeance ne soit pas « en retard » chez l'un et pas chez l'autre. */
  const alertes = sansCommentaires(lire("src/lib/crmImmoAlertes.ts"));
  assert.match(alertes, /FUSEAU_ALERTES = 'Asia\/Jerusalem'/, "le fuseau du module a change");
  const hook = sansCommentaires(lire(HOOK));
  assert.match(hook, /const fuseau = FUSEAU_ALERTES;/, "l'echeancier n'emploie plus le fuseau du module");
  assert.ok(!/fuseauLocal|useTimezone/.test(hook),
    "l'echeancier s'est branche sur le fuseau du poste : le retard deviendrait relatif");
  /* Et le repli, quand le contexte manque, emploie le MEME fuseau — sinon un appelant sans
     contexte verrait d'autres statuts qu'un appelant avec. */
  assert.match(hook, /journeeDeReference\(new Date\(\), fuseau\)/, "le repli a change de fuseau");
});
