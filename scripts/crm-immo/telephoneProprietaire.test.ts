// Le telephone du PROPRIETAIRE : une vraie colonne, distincte de celle du locataire.
//   node --import tsx --test scripts/crm-immo/telephoneProprietaire.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  COLONNES_SYSTEME, CHAMPS_DOSSIER, SAISIE_VIDE,
} from "../../src/pages/admin/views/crm-immo/crmImmoTypes.ts";
import {
  toutesLesColonnes, ordonnerSysteme, REGLAGE_VIDE,
} from "../../src/lib/crmImmoColonnes.ts";

/*
 * ============== CE QUE CE FICHIER TIENT ==============
 *
 * David, le 27 octobre 2026 : « ajoute une colonne dans crm immo numero de telephone du
 * proprietaire ».
 *
 * Le module suivait deja quatre champs de personne mais UN SEUL telephone — celui du
 * LOCATAIRE. Le proprietaire avait un nom, un prenom, et aucun moyen de l'appeler.
 *
 * ---------- LE PIEGE DE CETTE TABLE, QU'IL NE FALLAIT PAS REPRODUIRE ----------
 *
 * crm_immo_dossiers porte deux cles qui mentent sur leur contenu :
 *
 *     locataire    -> le NOM    du PROPRIETAIRE
 *     proprietaire -> le PRENOM du PROPRIETAIRE
 *
 * C'est assume et documente : les renommer exigerait une migration et casserait les
 * sauvegardes deja prises. Mais la colonne AJOUTEE, elle, n'avait aucune raison d'heriter
 * du travers. `telephone_proprietaire` dit ce qu'elle porte. Le releve B3 l'epingle, parce
 * qu'une symetrie mal placee — « la nouvelle devrait s'appeler comme les voisines » — est
 * exactement le genre de correction qu'on croit bonne.
 *
 * ---------- ET LE LIBELLE NU QUI DEVIENT FAUX ----------
 *
 * Tant qu'il n'y avait qu'un telephone, « Telephone » se suffisait. Des qu'il y en a deux,
 * le libelle nu devient ambigu — et c'est l'AJOUT qui cree l'ambiguite, donc c'est a lui de
 * la lever. Les deux portent desormais la personne, comme « N/P locataire » et
 * « N/P proprietaire » le faisaient deja. Le releve C2 interdit le retour au libelle nu.
 *
 * ---------- LE PIEGE DE LA PROSE ----------
 *
 * Les fichiers de ce module expliquent en commentaire ce qu'ils s'interdisent. Un grep naif
 * y trouve donc le motif qu'il cherche a interdire et passe au vert pour la plus mauvaise
 * des raisons. Tout ce qui sert a une assertion d'ABSENCE passe par `sansCommentaires`.
 */

const lire = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const D = "src/pages/admin/views/crm-immo/";
const CLE = "telephone_proprietaire";

// ===================== A. LA COLONNE EXISTE EN BASE =====================

test("A1 une migration ajoute la colonne, et le depot la porte", () => {
  /*
   * Le depot doit contenir la migration, pas seulement la base. L'audit des inscriptions du
   * 27/10/2026 a montre ou mene l'inverse : six policies RLS vivaient en production sans
   * source dans l'arbre, parce qu'un fichier avait ete applique puis supprime le meme jour.
   */
  const dossier = "supabase/migrations/";
  const fichiers = readdirSync(new URL("../../" + dossier, import.meta.url))
    .filter(f => f.endsWith(".sql"));
  const porteuses = fichiers.filter(f => lire(dossier + f).includes(CLE));
  assert.equal(porteuses.length, 1,
    `exactement UNE migration doit ajouter ${CLE}, ${porteuses.length} trouvee(s) : ${porteuses.join(", ")}`);

  const sql = lire(dossier + porteuses[0]);
  assert.match(sql, /alter table public\.crm_immo_dossiers\s*\n?\s*add column if not exists telephone_proprietaire text;/,
    "la colonne doit etre ajoutee en `text`, et de facon rejouable (if not exists)");
});

test("A2 aucune contrainte sur le format : un numero se saisit de mille facons", () => {
  /*
   * `telephone` n'en porte aucune, et c'est deliberement le meme choix. Un CHECK de format
   * refuserait un numero valide — indicatif international, espaces, points, tirets — et le
   * refus de Postgres arriverait sous une forme que personne ne comprend.
   */
  const dossier = "supabase/migrations/";
  const f = readdirSync(new URL("../../" + dossier, import.meta.url))
    .filter(x => x.endsWith(".sql")).find(x => lire(dossier + x).includes(CLE))!;
  const sql = sansCommentaires(lire(dossier + f));
  assert.ok(!/add constraint[\s\S]*telephone_proprietaire/i.test(sql),
    "une contrainte a ete posee sur le telephone du proprietaire : elle refusera un numero valide");
  assert.ok(!/not null/i.test(sql),
    "la colonne ne doit pas etre NOT NULL : les dossiers existants n'ont pas ce renseignement");
  /* Garde-fou du garde-fou : si sansCommentaires avalait tout, les deux assertions
     ci-dessus passeraient sans rien verifier. */
  assert.ok(sql.includes("alter table"), "le SQL examine est vide, le releve ne prouve rien");
});

// ===================== B. DEUX TELEPHONES, DEUX CLES =====================

test("B1 le telephone du proprietaire est un champ SAISISSABLE et une colonne LISIBLE", () => {
  const champ = CHAMPS_DOSSIER.find(c => c.cle === CLE);
  assert.ok(champ, "le formulaire ne sait pas saisir le telephone du proprietaire");
  const colonne = COLONNES_SYSTEME.find(c => c.cle === CLE);
  assert.ok(colonne, "le tableau ne montre pas le telephone du proprietaire");
  assert.equal(champ.type, "texte");
  assert.equal(colonne.type, "texte");
  assert.equal(champ.masquable, true, "il doit pouvoir se masquer : seul `nom` ne le peut pas");
  assert.equal(colonne.masquable, true);
  assert.equal(CLE in SAISIE_VIDE, true, "la saisie vierge ne pose pas le champ : il resterait indefini");
});

test("B2 les DEUX telephones coexistent, et ce sont bien deux cles distinctes", () => {
  /* Si l'un remplacait l'autre, on aurait perdu le telephone du locataire sans qu'aucun
     compilateur ne s'en apercoive : les deux sont des `string | null`. */
  for (const liste of [CHAMPS_DOSSIER, COLONNES_SYSTEME] as const) {
    const cles = liste.map(c => c.cle as string);
    assert.ok(cles.includes("telephone"), "le telephone du LOCATAIRE a disparu");
    assert.ok(cles.includes(CLE), "le telephone du PROPRIETAIRE a disparu");
    assert.equal(new Set(cles).size, cles.length, "une cle est declaree deux fois");
  }
});

test("B3 la cle AJOUTEE dit son contenu — on ne reproduit pas le piege des voisines", () => {
  /*
   * `locataire` porte le nom du proprietaire, `proprietaire` son prenom. Nommer la nouvelle
   * colonne « telephone_locataire » par symetrie aurait ete le pire choix possible : trois
   * cles menteuses au lieu de deux, et une erreur qu'aucun type ne rattrape.
   */
  const types = lire(D + "crmImmoTypes.ts");
  assert.match(types, /cle: 'telephone_proprietaire'/, "la cle a ete renommee");
  assert.ok(!/telephone_locataire/.test(sansCommentaires(types)),
    "une cle `telephone_locataire` est apparue : le telephone du locataire s'appelle `telephone`");
  /* Et les deux cles menteuses n'ont PAS ete renommees au passage : ce serait une migration
     a elles seules, et elle casserait les sauvegardes deja prises. */
  assert.match(types, /cle: 'locataire'/, "la cle SQL locataire a ete renommee");
  assert.match(types, /cle: 'proprietaire'/, "la cle SQL proprietaire a ete renommee");
});

// ===================== C. CE QUE L'UTILISATEUR LIT =====================

test("C1 la colonne se place juste apres le N/P du proprietaire", () => {
  /* On lit une PERSONNE, pas une liste de champs : nom, prenom, puis son telephone. */
  const cles = COLONNES_SYSTEME.map(c => c.cle as string);
  assert.equal(cles[cles.indexOf("np_proprietaire") + 1], CLE,
    "le telephone du proprietaire s'est eloigne de la personne qu'il designe");
  const champs = CHAMPS_DOSSIER.map(c => c.cle as string);
  assert.equal(champs[champs.indexOf("proprietaire") + 1], CLE,
    "dans le formulaire aussi, il doit suivre le prenom du proprietaire");
});

test("C2 plus aucun libelle « Téléphone » nu : il est devenu ambigu", () => {
  /*
   * C'est l'ajout qui cree l'ambiguite, donc c'est a lui de la lever. Un en-tete « Telephone »
   * a cote d'un « Tel. proprietaire » ne dit pas de qui il parle — et c'est exactement le
   * genre de doute qui fait appeler la mauvaise personne.
   */
  for (const liste of [CHAMPS_DOSSIER, COLONNES_SYSTEME] as const) {
    for (const d of liste) {
      assert.notEqual(d.libelle.trim(), "Téléphone",
        `le libelle nu « Téléphone » est revenu sur ${d.cle} : de qui parle-t-il ?`);
    }
  }
  /*
   * David, le 27/10/2026 : « la colone telephone faut metre telephone locataire ». En
   * toutes lettres, donc — j'avais d'abord abrege les en-tetes du tableau en « Tel. », ce
   * qu'il n'avait pas demande. Les deux listes disent desormais la meme chose.
   */
  for (const liste of [CHAMPS_DOSSIER, COLONNES_SYSTEME] as const) {
    const tel = liste.find(c => c.cle === "telephone")!;
    const telP = liste.find(c => c.cle === CLE)!;
    assert.equal(tel.libelle, "Téléphone locataire", `le libelle lu est « ${tel.libelle} »`);
    assert.equal(telP.libelle, "Téléphone propriétaire", `le libelle lu est « ${telP.libelle} »`);
    assert.notEqual(tel.libelle, telP.libelle, "les deux portent le meme libelle");
  }
});

test("C3 une Societe qui avait deja range son tableau VOIT la nouvelle colonne", () => {
  /*
   * L'ordre des colonnes systeme vit dans le navigateur. Un reglage enregistre AVANT le
   * 27/10/2026 ne connait pas cette cle. Elle doit apparaitre a la fin, VISIBLE — pas
   * disparaitre. C'est le meme piege que la barre d'onglets du telephone le 27/10 : un
   * reglage perime qui efface une nouveaute au lieu de l'accueillir.
   */
  const reglagePerime = {
    ordreSysteme: ["np_locataire", "email", "telephone", "np_proprietaire", "commentaire"],
    masqueesSysteme: [],
  };
  const ordre = ordonnerSysteme(COLONNES_SYSTEME, reglagePerime).map(d => d.cle as string);
  assert.ok(ordre.includes(CLE), "la nouvelle colonne a disparu chez une Societe au reglage perime");
  assert.equal(ordre.length, COLONNES_SYSTEME.length, "aucune colonne perdue");

  const visibles = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage: reglagePerime })
    .filter(c => !c.masquee).map(c => (c.famille === "systeme" ? c.cle : c.id));
  assert.ok(visibles.includes(CLE), "elle est presente mais masquee : elle doit etre VISIBLE");

  /* Contre-temoin : masquee explicitement, elle doit bien dispara1tre. Sans quoi le releve
     ci-dessus passerait meme si le masquage ne marchait plus du tout. */
  const masquee = toutesLesColonnes({
    systeme: COLONNES_SYSTEME, perso: [],
    reglage: { ordreSysteme: [], masqueesSysteme: [CLE] },
  }).find(c => c.famille === "systeme" && c.cle === CLE)!;
  assert.equal(masquee.masquee, true, "contre-temoin : masquee explicitement, elle doit l'etre");
});

// ===================== D. LE CABLAGE, DE BOUT EN BOUT =====================

test("D1 la valeur saisie arrive REELLEMENT en base", () => {
  /* Sans cette ligne, le champ s'affiche, se remplit, et rien n'est jamais enregistre —
     une panne silencieuse, la pire de toutes. */
  const hook = sansCommentaires(lire(D + "useCrmImmoDossiers.ts"));
  assert.match(hook, /telephone_proprietaire: vide\(s\.telephone_proprietaire\)/,
    "l'ecriture en base ne porte pas le telephone du proprietaire");
  /* `vide()` et non la chaine brute : un champ vide doit devenir NULL, comme tous les
     autres champs de ce formulaire. */
});

test("D2 les DEUX modales rapatrient la valeur existante", () => {
  /*
   * Il y a deux portes d'entree vers une fiche, et chacune reconstruit une SaisieDossier a
   * partir du dossier lu. Si une seule oubliait ce champ, le mode de panne ne serait PAS un
   * effacement silencieux — c'est ce que j'avais ecrit ici, et c'etait faux. Il serait plus
   * brutal : `versLigne` appelle `vide(s.telephone_proprietaire)`, et `vide` fait `.trim()`.
   * Sur `undefined`, cela LEVE — l'enregistrement echouerait net.
   *
   * La nuance compte pour le diagnostic : on chercherait une exception au moment de
   * l'enregistrement, pas une donnee disparue. Le type l'interdit d'ailleurs en amont
   * (SaisieDossier.telephone_proprietaire est `string`, non optionnel), donc le typecheck
   * attrape le cas avant ce releve. Les deux filets valent mieux qu'un.
   */
  for (const f of ["CrmImmoDetailsModal.tsx", "CrmImmoDossierModal.tsx"]) {
    const code = sansCommentaires(lire(D + f));
    assert.match(code, /telephone_proprietaire: s\(d\.telephone_proprietaire\)/,
      `${f} ne rapatrie pas le telephone du proprietaire : l'enregistrement leverait`);
  }
  /* `s()` et non la valeur brute : un NULL de la base doit devenir chaine vide, sinon le
     champ du formulaire afficherait « null » en toutes lettres. */
  for (const f of ["CrmImmoDetailsModal.tsx", "CrmImmoDossierModal.tsx"]) {
    assert.ok(!/telephone_proprietaire: d\.telephone_proprietaire/.test(sansCommentaires(lire(D + f))),
      `${f} passe la valeur brute : un NULL s'afficherait « null » dans le champ`);
  }
});

test("D3 le champ ouvre le pave numerique sur telephone", () => {
  const code = sansCommentaires(lire(D + "CrmImmoChampsDossier.tsx"));
  assert.match(code, /telephone_proprietaire: 'tel'/,
    "le champ n'est pas declare `tel` : le clavier alphabetique monterait sur telephone");
});

test("D4 ce n'est PAS une colonne personnalisee", () => {
  /*
   * Le module sait porter des colonnes personnalisees. Ce n'etait pas la bonne place : une
   * colonne personnalisee appartient a UNE Societe, donc chaque agence devrait la recreer
   * chez elle, avec son propre nom. Le telephone du proprietaire est un champ du METIER.
   * C'est exactement le chemin inverse de `mode_paiement`, promu en vraie colonne le 23/10.
   */
  const colonne = COLONNES_SYSTEME.find(c => c.cle === CLE)!;
  const toutes = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage: REGLAGE_VIDE });
  const rendue = toutes.find(c => c.famille === "systeme" && c.cle === CLE);
  assert.ok(rendue, "la colonne n'est pas rendue comme une colonne SYSTEME");
  assert.equal(colonne.composeDe, undefined,
    "ce n'est pas une colonne composee : elle existe pour de vrai en SQL");
});
