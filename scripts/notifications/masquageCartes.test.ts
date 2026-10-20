// Masquer une carte de notification : le droit, et l'echec qui ne doit plus etre silencieux.
//   node --test scripts/notifications/masquageCartes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/*
 * CE QUI S ETAIT PASSE, et pourquoi ce fichier existe.
 *
 * La RLS de `panel_hidden_tabs` ouvre la LECTURE a tous et reserve
 * INSERT / UPDATE / DELETE au seul `super_admin`. Mesure faite en base, role par role :
 *
 *   Talvex   (super_admin)         INSERT -> ACCEPTE
 *   Groupe   (company_super_admin) INSERT -> 42501
 *   Groupe   (company_super_admin) UPDATE -> 0 ligne, ET AUCUNE ERREUR LEVEE
 *   Societe  (admin)               INSERT -> 42501
 *
 * Trois defauts s empilaient :
 *   1. le bouton « Masquer » du panel Societe etait offert sur `isSAViewing`, vrai pour
 *      N IMPORTE QUELLE Visu — donc a des gens que la base allait refuser ;
 *   2. `persistHiddenTabs` n examinait AUCUN resultat d ecriture ;
 *   3. l oeil de chaque carte interceptait le clic qui lui etait destine.
 *
 * Resultat vu par l utilisateur : la carte se grisait, puis revenait au rechargement.
 * La table `panel_hidden_tabs` n a jamais contenu UNE SEULE ligne `admin_notifications`.
 *
 * Ces trois defauts sont invisibles a l execution : rien ne plante, rien ne s affiche en
 * rouge. Seul un test de source les attrape.
 */

const lire = (p: string) => readFileSync(p, "utf8");

const OUVRE = "/" + "*";
const FERME = "*" + "/";
function codeSeul(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    if (src.startsWith(OUVRE, i)) {
      const f = src.indexOf(FERME, i + 2);
      i = f === -1 ? src.length : f + 2;
      continue;
    }
    if (src.startsWith("//", i)) {
      const f = src.indexOf("\n", i);
      i = f === -1 ? src.length : f;
      continue;
    }
    out += src[i];
    i += 1;
  }
  return out;
}

test("le retrait des commentaires ne vide pas les fichiers examines", () => {
  for (const f of [
    "src/pages/admin/AdminDashboard.tsx",
    "src/hooks/usePanelHiddenTabs.ts",
    "src/components/notifications/hub/NotifHubCards.tsx",
    "src/pages/vendor/dashboard/useVendorNotifPrefs.ts",
  ]) {
    const code = codeSeul(lire(f));
    assert.ok(code.trim().length > 100, f + " : le code examine est vide");
  }
});

test("DEFAUT 1 — le droit de masquer est celui de Talvex, pas celui d une Visu quelconque", () => {
  const code = codeSeul(lire("src/pages/admin/AdminDashboard.tsx"));
  const ligne = code.split("\n").find(l => l.includes("canHideNotifCards="));
  assert.ok(ligne, "la prop canHideNotifCards a disparu du panel Societe");

  /* `isSAViewing` vaut pour N IMPORTE QUELLE Visu, Groupe compris : la base refuserait,
     et le refus serait silencieux. */
  assert.ok(!/isSAViewing/.test(ligne!),
    "canHideNotifCards repose sur isSAViewing : le bouton serait offert a un Groupe, que la base refuse");

  /* La valeur passee doit deriver de canHideTabs, la regle deja employee ailleurs. */
  const derive = /canHideTabs/.test(ligne!) || /peutMasquerLesCartes/.test(ligne!);
  assert.ok(derive, "canHideNotifCards ne derive pas de canHideTabs : " + ligne!.trim());
  if (/peutMasquerLesCartes/.test(ligne!)) {
    assert.ok(/const peutMasquerLesCartes\s*=\s*canHideTabs === true/.test(code),
      "peutMasquerLesCartes doit valoir exactement canHideTabs === true");
  }
});

test("DEFAUT 1 bis — les trois surfaces de masquage appliquent la MEME regle", () => {
  /* Barre laterale, cartes de notification du panel Societe, cartes du panel Commercial :
     trois endroits, une seule regle. C est leur divergence qui a cree le defaut. */
  const sidebar = codeSeul(lire("src/pages/admin/Sidebar.tsx"));
  assert.ok(/canHide=\{canHideTabs === true\}/.test(sidebar),
    "la barre laterale du panel Societe n emploie plus canHideTabs === true");

  const vendor = codeSeul(lire("src/pages/vendor/dashboard/useVendorNotifPrefs.ts"));
  assert.ok(/canHideNotifCards:\s*canHideTabs === true/.test(vendor),
    "le panel Commercial n emploie plus canHideTabs === true");
});

test("DEFAUT 2 — une ecriture refusee ne peut plus passer pour une reussite", () => {
  const code = codeSeul(lire("src/hooks/usePanelHiddenTabs.ts"));

  /* L UPDATE doit demander ses lignes en retour : un UPDATE refuse par la RLS ne leve
     AUCUNE erreur, il touche simplement zero ligne. Sans .select(), c est indetectable. */
  const bloc = code.slice(code.indexOf("async function persistHiddenTabs"));
  assert.ok(bloc.length > 200, "persistHiddenTabs n a pas ete trouve");
  assert.ok(/\.update\([\s\S]{0,200}?\.select\(/.test(bloc),
    "l UPDATE ne demande pas ses lignes en retour : un refus de la RLS serait invisible");
  assert.ok(/length === 0/.test(bloc),
    "le nombre de lignes rendues par l UPDATE n est pas verifie");

  /* Les erreurs des trois requetes doivent etre lues, pas ignorees. */
  const erreursLues = (bloc.match(/error/g) ?? []).length;
  assert.ok(erreursLues >= 4,
    "persistHiddenTabs n examine pas assez de resultats d ecriture (" + erreursLues + " mentions de `error`)");

  /* Et la fonction doit RENDRE le verdict, sinon personne ne peut en tenir compte. */
  assert.ok(/Promise<\{\s*error:/.test(bloc) || /: Promise<\{ error/.test(bloc),
    "persistHiddenTabs ne rend pas son verdict a l appelant");
});

test("DEFAUT 2 bis — un echec REVIENT EN ARRIERE, etat et cache ensemble", () => {
  const code = codeSeul(lire("src/hooks/usePanelHiddenTabs.ts"));
  const toggle = code.slice(code.indexOf("const toggle"), code.indexOf("async function persistHiddenTabs"));
  assert.ok(toggle.length > 200, "la fonction toggle n a pas ete trouvee");

  assert.ok(/persistHiddenTabs\([\s\S]{0,200}?\.then\(/.test(toggle),
    "toggle n ecoute pas le resultat de l ecriture");
  /* Le cache DOIT etre remis a sa valeur d avant : sinon il garderait une verite que la
     base n a pas, jusqu au prochain chargement qui l ecraserait sans explication. */
  const retours = (toggle.match(/writeCache/g) ?? []).length;
  assert.ok(retours >= 2,
    "le cache n est pas remis en arriere en cas d echec (" + retours + " appel(s) a writeCache)");
  assert.ok(/avant/.test(toggle), "l etat d avant n est pas conserve pour le retour en arriere");

  /* Le side effect ne doit plus vivre DANS l updater de setState : un updater doit etre
     pur, et React le rejoue en mode strict. */
  const dansUpdater = /setState\(prev => \{[\s\S]*?persistHiddenTabs/.test(toggle);
  assert.ok(!dansUpdater, "persistHiddenTabs est appele dans l updater de setState, qui doit rester pur");
});

test("DEFAUT 3 — l oeil de la carte ne vole plus le clic", () => {
  const code = lire("src/components/notifications/hub/NotifHubCards.tsx");
  /* L indicateur est pose en absolute PAR-DESSUS le bouton de la carte. Sans
     pointer-events-none, cliquer dessus — le geste naturel — n atteint jamais le bouton. */
  const ligne = code.split("\n").find(l => /absolute top-1\.5 right-1\.5 flex items-center gap-1/.test(l));
  assert.ok(ligne, "l indicateur d oeil n a pas ete trouve");
  assert.ok(/pointer-events-none/.test(ligne!),
    "l indicateur d oeil intercepte le clic destine au bouton de la carte");
});

test("le message de refus est comprehensible, pas un code Postgres", () => {
  const code = lire("src/hooks/usePanelHiddenTabs.ts");
  assert.ok(/Seul Talvex peut/.test(code),
    "un refus de la RLS doit se traduire en phrase, pas remonter brut");
});
