// Les modales du module au doigt : ce qui a ete mesure, et qui doit le rester.
//   node --test scripts/crm-immo/cibleTactile.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/*
 * CE FICHIER FIGE DES MESURES, PAS DES OPINIONS.
 *
 * Toutes les valeurs citees ont ete relevees dans un navigateur, a 375 px de large, sur
 * les vrais composants montes hors session Supabase. Les modales vivent derriere une
 * connexion dont le code PIN appartient a l'administratrice de la Societe equipee : il
 * n'est pas dans le depot. Un banc d'essai etait le seul moyen de mesurer la mise en page
 * reelle plutot que de la deduire des classes.
 *
 * ---------- POURQUOI UN TEST DE SOURCE ET NON UN TEST DE PARCOURS ----------
 *
 * Aucun de ces defauts ne plante, ne s'affiche en rouge, ni ne casse un parcours. Une
 * cible de 18 px se clique parfaitement a la souris : le defaut n'existe qu'au doigt, sur
 * un appareil que l'integration continue n'a pas. Et le zoom automatique d'iOS ne se
 * reproduit dans AUCUN navigateur de bureau, emulation comprise.
 *
 * Ces regles ne peuvent donc etre protegees que par la lecture du source.
 */

const lire = (p: string) => readFileSync(p, "utf8");
const D = "src/pages/admin/views/crm-immo/";

const MODALES = [
  D + "CrmImmoDossierModal.tsx",
  /*
   * Le rendu des champs a DEMENAGE : les deux modales qui montrent un dossier — celle qui
   * le cree et celle qui l affiche en detail — partagent desormais CrmImmoChampsDossier.
   * C est lui qui porte la regle des 16 px sur mobile. L oublier ici aurait laisse cette
   * regle sans garde, alors meme que les tests restaient verts.
   */
  D + "CrmImmoChampsDossier.tsx",
  D + "CrmImmoDetailsModal.tsx",
  D + "CrmImmoCommentaires.tsx",
  D + "CrmImmoColonnesModal.tsx",
  D + "CrmImmoDeleteModal.tsx",
  D + "CrmImmoColonneRow.tsx",
  D + "CrmImmoCloche.tsx",
];

/*
 * Les classes d'un element, retrouvees par un repere qui n'appartient qu'a lui.
 *
 * Attention : selon l'element, `className` precede ou suit le data-testid SUR LA MEME
 * LIGNE. Chercher a partir de l'index du repere sautait donc la bonne ligne et rendait
 * celle d'apres — un faux positif silencieux. On part de la ligne du repere, puis on
 * avance s'il le faut.
 */
function classesApres(src: string, repere: string): string {
  const lignes = src.split("\n");
  const depart = lignes.findIndex(l => l.includes(repere));
  assert.ok(depart >= 0, "repere introuvable : " + repere);
  /* La ligne du repere elle-meme, d abord : le cas le plus courant. */
  if (/className=/.test(lignes[depart])) return lignes[depart];

  /*
   * Sinon on remonte a la BALISE OUVRANTE qui contient le repere, puis on lit ses
   * attributs jusqu a sa fermeture. Deux cas a servir, et une fenetre aveugle les sert
   * mal : un data-testid vit DANS la balise, ses classes sont plus bas ; un contenu
   * (`{nom}`) vit APRES la balise, ses classes sont plus haut. On sort donc d un niveau
   * a chaque fois qu une balise n a pas de className, au plus deux fois.
   */
  for (let niveau = 0, ligne = depart; niveau < 3; niveau++) {
    let ouverture = -1;
    for (let i = ligne; i >= Math.max(0, ligne - 12); i--) {
      if (/^\s*<[a-zA-Z]/.test(lignes[i])) { ouverture = i; break; }
    }
    if (ouverture < 0) break;
    for (let i = ouverture; i < Math.min(ouverture + 20, lignes.length); i++) {
      if (/className=/.test(lignes[i])) return lignes[i];
      if (i > ouverture && /^\s*<[a-zA-Z]/.test(lignes[i])) break; // balise suivante
      if (/>\s*$/.test(lignes[i]) && i > ouverture) break;         // fin de la balise
    }
    ligne = ouverture - 1;                                         // on sort d un niveau
  }
  assert.fail("aucune ligne de classes autour de " + repere);
  return "";
}

test("garde du garde — les cinq fichiers existent et portent des classes", () => {
  for (const f of MODALES) {
    const s = lire(f);
    assert.ok(s.length > 500, f + " : fichier vide ou tronque");
    assert.ok(s.includes("className"), f + " : plus aucune classe");
  }
});

// ---------------------------------------------------------------------------
// A — LE ZOOM AUTOMATIQUE D'iOS
// ---------------------------------------------------------------------------

test("A1 — aucun champ de saisie ne descend sous 16 px sur mobile", () => {
  /*
   * Safari agrandit la page des qu'on met le curseur dans un champ dont la police fait
   * moins de 16 px. index.html ne l'interdit pas — et ne doit pas : un meta viewport avec
   * maximum-scale=1 empeche aussi l'utilisateur de zoomer, ce qui est un defaut
   * d'accessibilite bien pire.
   *
   * La page agrandie deborde a droite. C'est le defaut << largeur qui depasse l'ecran >>
   * le plus certain de toute la surface, et il se declenche precisement au moment ou le
   * clavier monte. Aucun navigateur de bureau ne le reproduit.
   *
   * Mesure apres correction, a 375 px : les 14 champs des modales rendent 16 px.
   */
  const fautifs: string[] = [];
  for (const f of MODALES) {
    for (const [n, l] of lire(f).split("\n").entries()) {
      if (!/className[=:]/.test(l)) continue;
      /* Une ligne de classes qui habille un champ : elle porte un rembourrage de champ. */
      const habilleUnChamp = /px-\d|py-\d/.test(l) && /rounded/.test(l) && /outline-none/.test(l);
      if (!habilleUnChamp) continue;
      if (/text-sm|text-xs|text-\[1[0-5]px\]/.test(l) && !/max-md:text-base|max-md:text-\[1[6-9]px\]/.test(l)) {
        fautifs.push(f.split("/").pop() + ":" + (n + 1) + "  " + l.trim().slice(0, 90));
      }
    }
  }
  assert.deepEqual(fautifs, [],
    "un champ de saisie reste sous 16 px sur mobile : iOS Safari agrandira la page au toucher.\n  "
    + fautifs.join("\n  "));
});

// ---------------------------------------------------------------------------
// B — LES CIBLES TACTILES
// ---------------------------------------------------------------------------

/*
 * Chaque entree porte la mesure AVANT correction, relevee a 375 px, et la mesure APRES.
 * Le repere est un data-testid ou un titre qui n'appartient qu'a ce bouton.
 */
const CIBLES: { fichier: string; repere: string; avant: string; apres: string; classe: RegExp }[] = [
  { fichier: D + "CrmImmoDossierModal.tsx", repere: 'data-testid="crm-immo-dossier-fermer"',
    avant: "28 x 28", apres: "44 x 44", classe: /max-md:before:-inset-2/ },
  { fichier: D + "CrmImmoColonnesModal.tsx", repere: 'data-testid="crm-immo-colonnes-fermer"',
    avant: "28 x 28", apres: "44 x 44", classe: /max-md:before:-inset-2/ },
  { fichier: D + "CrmImmoColonneRow.tsx", repere: "crm-immo-colonne-monter-",
    avant: "18 x 18", apres: "46 x 30", classe: /max-md:p-2/ },
  { fichier: D + "CrmImmoColonneRow.tsx", repere: "crm-immo-colonne-masquer-",
    avant: "28 x 28", apres: "46 x 46", classe: /max-md:p-\[15px\]/ },
  { fichier: D + "CrmImmoColonneRow.tsx", repere: "crm-immo-colonne-renommer-ok-",
    avant: "24 x 24", apres: "44 x 44", classe: /max-md:p-\[14px\]/ },
  { fichier: D + "CrmImmoCloche.tsx", repere: 'data-testid="crm-immo-cloche-actualiser"',
    avant: "26 x 26", apres: "44 x 44", classe: /max-md:p-\[15px\]/ },
  { fichier: D + "CrmImmoCloche.tsx", repere: "crm-immo-alerte-lue-",
    avant: "75 x 17", apres: "75 x 45", classe: /max-md:py-3\.5/ },
  { fichier: D + "CrmImmoCloche.tsx", repere: "crm-immo-alerte-traitee-",
    avant: "45 x 17", apres: "45 x 45", classe: /max-md:py-3\.5/ },

  /* La modale Details et l historique des commentaires, mesures le 20 octobre 2026. */
  { fichier: D + "CrmImmoDetailsModal.tsx", repere: 'data-testid="crm-immo-details-fermer"',
    avant: "28 x 28", apres: "44 x 44", classe: /max-md:before:-inset-2/ },
  { fichier: D + "CrmImmoCommentaires.tsx", repere: "crm-immo-commentaire-supprimer-${c.id}",
    avant: "28 x 28", apres: "44 x 44", classe: /max-md:p-\[15px\]/ },
  { fichier: D + "CrmImmoCommentaires.tsx", repere: "crm-immo-commentaire-supprimer-ok-",
    avant: "86 x 37", apres: "86 x 45", classe: /max-md:py-\[14px\]/ },
  { fichier: D + "CrmImmoCommentaires.tsx", repere: "crm-immo-commentaire-renoncer-",
    avant: "63 x 37", apres: "63 x 45", classe: /max-md:py-\[14px\]/ },
];

test("B1 — chaque cible mesuree garde ce qui l a agrandie", () => {
  for (const c of CIBLES) {
    const ligne = classesApres(lire(c.fichier), c.repere);
    assert.match(ligne, c.classe,
      c.repere + " : mesure a " + c.avant + " avant correction, " + c.apres + " apres. "
      + "La classe qui l agrandit a disparu — la cible retombe a " + c.avant + " au doigt.");
  }
});

test("B2 — tout ::before etendu est ancre sur SON bouton", () => {
  /*
   * Un ::before en position absolue s'ancre au premier ancetre POSITIONNE. Sur un bouton
   * statique pose dans une modale en `fixed inset-0`, il s'ancrerait sur l'overlay : une
   * zone invisible de la taille de l'ecran, qui avalerait tous les clics.
   *
   * Le defaut est silencieux — rien ne s'affiche, rien ne plante, la modale devient juste
   * inutilisable. Il a ete attrape a la mesure, pas a la lecture.
   */
  for (const f of [...MODALES, "src/components/notifications/hub/NotifHubCards.tsx"]) {
    for (const [n, l] of lire(f).split("\n").entries()) {
      if (!/before:absolute/.test(l)) continue;
      assert.match(l, /\brelative\b|\babsolute top-|\bfixed\b/,
        f.split("/").pop() + ":" + (n + 1)
        + " : un ::before absolu sans ancrage sur son propre bouton. Il se fixerait sur "
        + "l overlay de la modale et couvrirait l ecran entier.");
    }
  }
});

test("B3 — les cibles agrandies le sont SOUS 768 px seulement", () => {
  /* A la souris, une cible de 46 px la ou l icone en fait 18 vole les clics de ses
     voisines. Mesure a 1280 px apres correction : tout est revenu a 18, 28, 38. */
  /*
   * On ne regarde que ce que CE chantier a introduit, et rien d autre : les ::before de
   * zone etendue, et les rembourrages exprimes en pixels bruts. Les classes Tailwind
   * ordinaires du design d origine (p-1, px-2, py-1) ne sont pas concernees — les
   * compter rendrait ce test ininterpretable.
   */
  const fautifs: string[] = [];
  for (const f of MODALES) {
    for (const [n, l] of lire(f).split("\n").entries()) {
      if (!/className/.test(l)) continue;
      for (const jeton of l.split(/[\s"'`]+/)) {
        const agrandissement = jeton.includes("before:") || /(^|:)p[xy]?-\[\d+px\]$/.test(jeton);
        if (!agrandissement) continue;
        if (!jeton.startsWith("max-md:")) {
          fautifs.push(f.split("/").pop() + ":" + (n + 1) + "  " + jeton);
        }
      }
    }
  }
  assert.deepEqual(fautifs, [],
    "un agrandissement tactile s applique aussi sur desktop, ou il volerait des clics "
    + "aux elements voisins : " + fautifs.join(", "));
});

// ---------------------------------------------------------------------------
// C — LA HAUTEUR, LE CLAVIER ET LA ZONE SURE
// ---------------------------------------------------------------------------

test("C1 — les hauteurs maximales sont en dvh, jamais en vh", () => {
  /*
   * Sur telephone, 100vh est la hauteur SANS le clavier. Quand le clavier monte, vh ne
   * bouge pas : le bas de la feuille — donc la barre des boutons Annuler / Valider —
   * passe dessous. dvh suit le viewport reellement visible.
   *
   * Le depot s en sert deja : PwaMobileShell.tsx monte en h-[100dvh].
   */
  for (const f of MODALES) {
    const vh = lire(f).split("\n")
      .map((l, i) => ({ n: i + 1, l }))
      .filter(x => /max-h-\[\d+vh\]|h-\[\d+vh\]/.test(x.l));
    assert.deepEqual(vh.map(x => x.n + ": " + x.l.trim().slice(0, 70)), [],
      f.split("/").pop() + " plafonne une hauteur en vh : avec le clavier mobile, le bas passe dessous");
  }
});

test("C2 — les trois feuilles ont une hauteur maximale ET un corps defilant", () => {
  const ATTENDU: [string, string][] = [
    [D + "CrmImmoDossierModal.tsx", "92dvh"],
    [D + "CrmImmoColonnesModal.tsx", "92dvh"],
    /* La modale de suppression n avait NI l un NI l autre : le nom affiche vient de
       l utilisateur, rien ne borne sa longueur. */
    [D + "CrmImmoDeleteModal.tsx", "92dvh"],
  ];
  for (const [f, h] of ATTENDU) {
    const s = lire(f);
    assert.ok(s.includes("max-h-[" + h + "]"), f.split("/").pop() + " n a pas de hauteur maximale");
    assert.match(s, /flex-1 min-h-0 overflow-y-auto|flex-1 min-h-0[\s\S]{0,40}overflow-y-auto/,
      f.split("/").pop() + " n a pas de corps defilant : un contenu long pousserait les boutons hors de l ecran");
    assert.ok(s.includes("shrink-0"), f.split("/").pop() + " : le pied peut se faire ecraser");
  }
});

test("C3 — le defilement interne ne se chaine pas a la page", () => {
  /* Arrive en bas d une liste, le geste continuait sur la page derriere la modale. */
  for (const f of MODALES) {
    const s = lire(f);
    if (!s.includes("overflow-y-auto")) continue;
    assert.ok(s.includes("overscroll-contain"),
      f.split("/").pop() + " : zone defilante sans overscroll-contain");
  }
});

test("C4 — les feuilles collees en bas respectent la zone sure", () => {
  /* Sur un telephone a barre de geste, un pied colle au bord pose ses boutons DANS la
     barre. Le depot emploie deja env(safe-area-inset-bottom) dans PwaMobileShell. */
  for (const f of [D + "CrmImmoDossierModal.tsx", D + "CrmImmoColonnesModal.tsx", D + "CrmImmoDeleteModal.tsx"]) {
    assert.match(lire(f), /env\(safe-area-inset-bottom/,
      f.split("/").pop() + " : le pied ne tient pas compte de la zone sure du bas");
  }
});

// ---------------------------------------------------------------------------
// D — LES TEXTES QUE PERSONNE NE BORNE
// ---------------------------------------------------------------------------

test("D1 — tout texte venant de l utilisateur ou de Postgres peut se couper", () => {
  /*
   * Quatre textes affiches ne sont bornes par rien : le nom d une colonne (saisi dans la
   * modale Colonnes), le nom d un dossier, la phrase d une alerte (locataire et
   * proprietaire, saisis a la main), et le message d erreur, qui vient brut de PostgREST.
   *
   * Sans break-words, un jeton insecable — une adresse e-mail mise en guise de nom —
   * deborde du conteneur. Et comme les modales portent overflow-hidden, il est COUPE
   * sans qu aucune barre de defilement n apparaisse : l information disparait en silence.
   */
  const SANS_BORNE: [string, string][] = [
    [D + "CrmImmoDossierModal.tsx", "crm-immo-dossier-erreur"],
    [D + "CrmImmoChampsDossier.tsx", "{c.nom}</span>"],
    [D + "CrmImmoDetailsModal.tsx", "crm-immo-details-erreur"],
    [D + "CrmImmoCommentaires.tsx", "crm-immo-commentaire-contenu-"],
    [D + "CrmImmoColonnesModal.tsx", "crm-immo-colonnes-erreur"],
    [D + "CrmImmoDeleteModal.tsx", "crm-immo-delete-erreur"],
    /* Le nom du dossier que l on s apprete a supprimer. C est le texte le plus important
       de cette modale — celui qui dit CE QUI PART — et il vient de l utilisateur. */
    [D + "CrmImmoDeleteModal.tsx", "{nom}</strong>"],
    [D + "CrmImmoCloche.tsx", "crm-immo-alerte-ouvrir-"],
  ];
  for (const [f, repere] of SANS_BORNE) {
    const ligne = classesApres(lire(f), repere);
    assert.match(ligne, /break-words|truncate/,
      f.split("/").pop() + " / " + repere + " : texte non borne sans cesure. "
      + "Un jeton insecable serait coupe par overflow-hidden, sans barre de defilement.");
  }
});
