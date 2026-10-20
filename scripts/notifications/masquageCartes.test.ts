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

/**
 * La ligne de classes du bouton de l'OEIL, et de lui seul.
 *
 * Piege : la pastille du compteur porte la MEME position — « absolute top-1.5 right-1.5 »
 * — et elle vient avant dans le fichier. Chercher cette position rendait donc la pastille,
 * et les assertions passaient en examinant le mauvais element. On ancre sur le
 * data-testid de l'oeil, qui n'appartient qu'a lui, puis on prend la premiere ligne de
 * classes qui suit. Les commentaires sont retires : ils parlent de ces classes.
 */
function classeDeLOeil(): string {
  const code = lire("src/components/notifications/hub/NotifHubCards.tsx");
  const i = code.indexOf("notif-card-oeil-");
  assert.ok(i > 0, "le bouton de l oeil n a pas de data-testid : il est introuvable");
  const apres = codeSeul(code.slice(i));
  const ligne = apres.split("\n").find(l => /className="/.test(l));
  assert.ok(ligne, "aucune ligne de classes apres le data-testid de l oeil");
  assert.match(ligne!, /absolute/, "la ligne trouvee n est pas celle du bouton de l oeil : " + ligne!.trim());
  return ligne!;
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

test("DEFAUT 3 — l oeil est un VRAI bouton, qui recoit son propre clic", () => {
  const code = lire("src/components/notifications/hub/NotifHubCards.tsx");

  /*
   * L oeil etait un <div> pose en absolute PAR-DESSUS le bouton de la carte : cliquer
   * dessus — le geste naturel, il RESSEMBLE a la commande — atterrissait sur ce div, qui
   * n avait aucun gestionnaire.
   *
   * Le rendre traversable (pointer-events: none) marchait, mais PAR RICOCHET : le clic
   * tombait sur ce qui se trouvait DESSOUS, c est-a-dire le libelle de la carte. Mesure
   * faite sur le composant reel monte dans un navigateur — elementFromPoint au centre de
   * l oeil rendait le <p> du libelle. Ca tient tant que rien ne s intercale, donc ca tient
   * a la chance.
   *
   * Un bouton recoit son PROPRE clic, est atteignable au clavier, et annonce son etat.
   */
  const i = code.indexOf("hideEditMode && (");
  assert.ok(i > 0, "le bloc du mode masquage n a pas ete trouve");
  const bloc = code.slice(i, i + 2000);

  assert.ok(/<button/.test(bloc), "l oeil n est pas un <button> : il ne recoit pas son propre clic");
  assert.ok(/notif-card-oeil-/.test(bloc), "le bouton de l oeil n a pas de data-testid stable");
  assert.ok(/onClick=\{onToggleHide\}/.test(bloc), "le bouton de l oeil n appelle pas onToggleHide");
  assert.ok(/aria-pressed=/.test(bloc), "le bouton de l oeil n annonce pas son etat (aria-pressed)");
  assert.ok(/aria-label=/.test(bloc), "le bouton de l oeil n a pas de nom accessible");
  assert.ok(/title=/.test(bloc), "le bouton de l oeil n a pas d infobulle");

  /* Et il ne doit PAS redevenir traversable : ce serait revenir au ricochet. */
  assert.ok(!/pointer-events-none/.test(classeDeLOeil()),
    "l oeil est redevenu traversable : il ne recoit plus son propre clic");

  /* Le bouton de l oeil doit rester FRERE de celui de la carte, jamais imbrique : un
     bouton dans un bouton est invalide en HTML, et le clic partirait deux fois.
     On verifie que les balises s ouvrent et se ferment en ALTERNANCE dans NotifCard :
     une ouverture qui suit une ouverture, c est une imbrication. */
  const debutCarte = code.indexOf("function NotifCard");
  assert.ok(debutCarte > 0, "la fonction NotifCard n a pas ete trouvee");
  const corps = code.slice(debutCarte);

  const balises: string[] = [];
  const motif = /<button\b|<\/button>/g;
  let m: RegExpExecArray | null;
  while ((m = motif.exec(corps)) !== null) balises.push(m[0]);

  let profondeur = 0;
  for (const b of balises) {
    if (b === "</button>") { profondeur -= 1; continue; }
    profondeur += 1;
    assert.ok(profondeur <= 1,
      "un <button> est imbrique dans un autre dans NotifCard : le clic partirait deux fois");
  }
  assert.equal(profondeur, 0, "les balises <button> de NotifCard ne sont pas equilibrees");
  assert.ok(balises.length >= 4,
    "NotifCard devrait porter DEUX boutons : celui de la carte et celui de l oeil");
});

test("DEFAUT 3 bis — la cible tactile de l oeil fait 44 px au doigt, et seulement au doigt", () => {
  const ligne = classeDeLOeil();

  /*
   * MESURE, dans un navigateur, sur le composant reel monte a 375 px :
   *   le bouton rendu                 20 x 20 px
   *   la zone cliquable avec ::before 48 x 48 px
   *   les cinq points testes (centre + quatre coins) atterrissent tous sur l oeil
   *   la bascule fonctionne : aria-pressed passe de false a true
   *
   * 20 px, c est la taille d une icone, pas celle d un doigt. C est exactement ce qui
   * faisait croire que l oeil ne repondait pas sur telephone : il repondait, mais il
   * fallait le viser au pixel.
   *
   * On ne grossit pas l icone — un ::before absolu en inset negatif etend la zone sans
   * rien deplacer ni repeindre.
   */
  assert.match(ligne, /max-md:before:absolute/,
    "l oeil n a plus de zone tactile etendue : il redevient une cible de 20 px au doigt");
  assert.match(ligne, /max-md:before:content-\[/,
    "le ::before n a pas de contenu : sans contenu il n est pas rendu, donc il n agrandit rien");

  /* L inset doit porter la zone a 44 px au moins : (44 - 20) / 2 = 12 px de chaque cote. */
  const m = ligne.match(/max-md:before:-inset-([\d.]+)/);
  assert.ok(m, "le ::before n a pas d inset negatif : il ne depasse pas du bouton");
  const px = parseFloat(m![1]) * 4; // l echelle Tailwind : 1 unite = 0.25rem = 4 px
  assert.ok(20 + 2 * px >= 44,
    "la zone tactile mesure " + (20 + 2 * px) + " px, moins que les 44 px attendus au doigt");

  /*
   * Et UNIQUEMENT sous 768 px. Sur desktop, une zone de 48 px dans le coin de la carte
   * volerait des clics destines au corps de la carte — mesure faite a 1280 px : le
   * ::before n est pas rendu (content: none), et un point a 10 px a gauche de l oeil
   * appartient bien a la carte.
   */
  const etendues = (ligne.match(/before:-inset-/g) ?? []).length;
  const sousMd = (ligne.match(/max-md:before:-inset-/g) ?? []).length;
  assert.equal(etendues, sousMd,
    "la zone etendue n est pas limitee a max-md : sur desktop elle volerait des clics a la carte");
});

test("le message de refus est comprehensible, pas un code Postgres", () => {
  const code = lire("src/hooks/usePanelHiddenTabs.ts");
  assert.ok(/Seul Talvex peut/.test(code),
    "un refus de la RLS doit se traduire en phrase, pas remonter brut");
});
