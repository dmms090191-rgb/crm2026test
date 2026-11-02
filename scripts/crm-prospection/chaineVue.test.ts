/*
 * LA CHAINE D'UNE VUE DU PANEL SOCIETE, COMPTEE DANS LES DEUX SENS.
 *   node --import tsx --test scripts/crm-prospection/chaineVue.test.ts
 *
 * ---------- LE TROU QUE CE FICHIER COMBLE ----------
 *
 * Audit du 02/11/2026 : AUCUN relevé du depot ne confrontait les deux sens de la chaine
 * du BUREAU. Le seul comptage cote bureau etait un PLANCHER —
 * scripts/runtime/coquilleMobile.test.ts:631, `nbAdmin >= 24` —, et le seul relevé
 * bidirectionnel du depot porte sur la coquille TELEPHONE.
 *
 * CE QUE CE SILENCE COUTE, et c'est ecrit dans le depot lui-meme :
 * AdminViewRenderer.tsx finit par `default: return <VueEnsemble/>`. Un `case` oublie fait
 * donc ouvrir LE TABLEAU DE BORD sous le fil d'Ariane de la vue demandee. Aucune erreur
 * de console, aucune erreur de build — et `npm run build` vaut `vite build` SEUL, sans
 * typecheck : Vercel deploierait le defaut. Le depot a un mot pour cela, dans
 * CrmImmoGate.tsx : « un refus deguise en reussite ».
 *
 * Ce relevé est ecrit a l'occasion du CRM Prospection, mais il porte sur LES 32 VUES du
 * panel, pas seulement sur la nouvelle. Un garde-fou taille pour un seul cas ne garde rien.
 *
 * CE QU'IL MESURE : des chaines de caracteres dans des fichiers source. Il ne monte aucun
 * navigateur et ne prouve pas qu'un ecran s'affiche — il prouve que les six declarations
 * se correspondent, ce qui est exactement le defaut qu'il vise.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* Les commentaires partent AVANT toute recherche de motif. Ce depot s'est fait mordre
   cinq fois par sa propre prose, et les fichiers ci-dessous citent abondamment des ids de
   vues pour expliquer pourquoi certaines sont absentes. */
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const TYPES = sansCommentaires(lire('src/pages/admin/adminDashboardTypes.ts'));
const CONSTANTES = sansCommentaires(lire('src/pages/admin/adminDashboardConstants.ts'));
const NAVIGATION = sansCommentaires(lire('src/pages/admin/navigationAdmin.tsx'));
const PARESSEUX = sansCommentaires(lire('src/pages/admin/dashboard/adminLazyViews.ts'));
const RENDU = sansCommentaires(lire('src/pages/admin/dashboard/AdminViewRenderer.tsx'));
const NAV_MOBILE = sansCommentaires(lire('src/app/navigationMobile.ts'));
const COQUILLE = sansCommentaires(lire('src/app/PwaMobileShell.tsx'));

function motifs(source: string, re: RegExp): Set<string> {
  return new Set([...source.matchAll(re)].map((m) => m[1]));
}

/* ---- Les six declarations, lues a la source ---- */

const ACTIVE_VIEW = motifs(
  TYPES.slice(TYPES.indexOf('export type ActiveView')),
  /\|\s*'([a-z0-9-]+)'/g,
);
const FIL_ARIANE = motifs(
  CONSTANTES.slice(CONSTANTES.indexOf('BREADCRUMB_LABELS')),
  /'([a-z0-9-]+)':\s*['"]/g,
);
const MENU = motifs(
  NAVIGATION.slice(NAVIGATION.indexOf('LAYOUT_SECTIONS'), NAVIGATION.indexOf('export const ICONS')),
  /\{\s*id:\s*'([a-z0-9-]+)'/g,
);
const ICONES = motifs(
  NAVIGATION.slice(NAVIGATION.indexOf('export const ICONS')),
  /'([a-z0-9-]+)':\s*</g,
);
const CASES_BUREAU = motifs(RENDU, /case '([a-z0-9-]+)':/g);

/*
 * LES EXCEPTIONS CONNUES, nommees une par une plutot que tolerees en silence.
 *
 * Une exception non declaree est un trou ; une exception declaree est une decision qu'on
 * peut relire. Si l'une d'elles disparait du code, le relevé le dira (voir X1).
 */
const HORS_MENU = new Set([
  /* CRM Immo n'est PAS dans LAYOUT_SECTIONS : il est INJECTE par sectionsAvecCrmImmo
     selon le droit reel de la Societe. C'est documente en tete de navigationAdmin.tsx. */
  'crm-immo',
  /* Vues atteintes par navigation interne, jamais par un onglet de barre laterale. */
  'documentation-crm', 'system', 'sauvegarde', 'mes-logos-ra',
  'chat-client', 'chat-vendeur', 'chat-super-admin', 'info-admin',
]);

const SANS_ICONE = new Set(['crm-immo', 'documentation-crm', 'system', 'sauvegarde', 'mes-logos-ra']);

/* Quatre vues sont rendues HORS du switch, en permanence ou par un composant dedie. */
const HORS_SWITCH = new Set(['info-admin', 'chat-client', 'chat-vendeur', 'chat-super-admin']);

// ===================== A. LE BUREAU, DANS LES DEUX SENS =====================

test('A1 tout id d ActiveView a son libelle de fil d Ariane, et l inverse', () => {
  /* Ce sens-la est deja impose par le compilateur (Record<ActiveView, string>), mais le
     verifier ici donne le MESSAGE utile : `npm run build` ne typecheck pas. */
  for (const id of ACTIVE_VIEW) {
    assert.ok(FIL_ARIANE.has(id), `'${id}' est dans ActiveView mais n'a pas de libelle dans BREADCRUMB_LABELS`);
  }
  for (const id of FIL_ARIANE) {
    assert.ok(ACTIVE_VIEW.has(id), `'${id}' a un libelle mais n'existe pas dans ActiveView`);
  }
});

test('A2 TOUT ID RENDU PAR UN case EXISTE DANS ActiveView', () => {
  for (const id of CASES_BUREAU) {
    assert.ok(ACTIVE_VIEW.has(id),
      `AdminViewRenderer rend un case '${id}' qui n'existe pas dans ActiveView : l'onglet est inatteignable`);
  }
});

test('A3 TOUTE VUE DECLAREE A SON case — le sens qui ouvre le tableau de bord', () => {
  /*
   * C'EST LE RELEVE QUI MANQUAIT, et le plus important des trois.
   *
   * Sans `case`, la vue tombe dans `default: return <VueEnsemble/>` : l'utilisateur
   * clique sur « CRM Prospection » et voit son tableau de bord, sous un fil d'Ariane qui
   * annonce le CRM. Rien ne le signale — ni la console, ni le build, ni Vercel.
   */
  for (const id of ACTIVE_VIEW) {
    if (HORS_SWITCH.has(id)) continue;
    assert.ok(CASES_BUREAU.has(id),
      `'${id}' est declaree dans ActiveView mais n'a AUCUN case dans AdminViewRenderer : `
      + 'elle ouvrirait la Vue d ensemble sous son propre fil d Ariane, sans aucune erreur');
  }
});

test('A4 tout onglet du menu a son icone, et toute icone a son onglet', () => {
  /*
   * Sans entree dans ICONS, l'onglet se rend avec un <span> VIDE : le libelle s'affiche,
   * la pastille reste blanche, et rien dans le build ne le signale. Le commentaire de
   * navigationAdmin.tsx le dit deja en mots ; ici c'est tenu.
   */
  for (const id of MENU) {
    assert.ok(ICONES.has(id), `l'onglet '${id}' n'a pas d'icone : sa pastille se rendra vide`);
  }
  for (const id of ICONES) {
    if (SANS_ICONE.has(id)) continue;
    assert.ok(MENU.has(id), `une icone est declaree pour '${id}', qui n'est dans aucun compartiment du menu`);
  }
});

test('A5 tout onglet du menu existe dans ActiveView', () => {
  for (const id of MENU) {
    assert.ok(ACTIVE_VIEW.has(id), `le menu propose '${id}', absent d'ActiveView : le clic ne menerait nulle part`);
  }
});

// ===================== B. LE TELEPHONE, DANS LES DEUX SENS =====================

const VUES_TEL_ADMIN = (() => {
  /*
   * L'ANCRE PORTE LE SAUT DE LIGNE, ET CE N'EST PAS DU ZELE.
   *
   * Chercher 'admin: [' tout court tombe sur `super_admin: [`, qui le contient comme
   * sous-chaine et vient AVANT dans le fichier : le relevé lisait alors les vues du panel
   * Talvex en croyant lire celles de la Societe, et reclamait un `case 'dashboard'` qui
   * n'a jamais eu a exister cote admin.
   *
   * Mesure du 02/11/2026, sur ce relevé meme : il a rougi a sa premiere execution, pour
   * cette raison et non pour un defaut du code. Un relevé qui rougit a cote de sa cible
   * est plus couteux qu'un relevé absent — on croit tenir une regle qu'on ne tient pas.
   */
  const debut = NAV_MOBILE.indexOf('\n  admin: [');
  assert.ok(debut > 0, "le bloc VUES_TELEPHONE.admin est introuvable : la forme du fichier a change");
  const bloc = NAV_MOBILE.slice(debut);
  return motifs(bloc.slice(0, bloc.indexOf('],')), /'([a-z0-9-]+)'/g);
})();

const CASES_TELEPHONE = (() => {
  const bloc = COQUILLE.slice(COQUILLE.indexOf("role === 'admin'", COQUILLE.indexOf('renderView')));
  return motifs(bloc, /case '([a-z0-9-]+)':/g);
})();

test('B1 toute vue declaree au telephone a son case dans la coquille', () => {
  for (const id of VUES_TEL_ADMIN) {
    assert.ok(CASES_TELEPHONE.has(id),
      `'${id}' est declaree dans VUES_TELEPHONE.admin mais n'a aucun case dans PwaMobileShell : `
      + "l'onglet existerait et n'afficherait rien");
  }
});

test('B2 toute vue declaree au telephone existe aussi au bureau', () => {
  for (const id of VUES_TEL_ADMIN) {
    assert.ok(ACTIVE_VIEW.has(id), `'${id}' n'existe pas dans ActiveView`);
    assert.ok(MENU.has(id) || HORS_MENU.has(id),
      `'${id}' est proposee au telephone mais n'est dans aucun compartiment du menu bureau`);
  }
});

// ===================== C. LE CRM PROSPECTION, NOMMEMENT =====================

const ID = 'crm-prospection';

test('C1 les SIX declarations du bureau sont posees', () => {
  assert.ok(ACTIVE_VIEW.has(ID), '1/6 ActiveView');
  assert.ok(FIL_ARIANE.has(ID), '2/6 BREADCRUMB_LABELS');
  assert.ok(MENU.has(ID), '3/6 LAYOUT_SECTIONS');
  assert.ok(ICONES.has(ID), '4/6 ICONS');
  assert.match(PARESSEUX, /export const CrmProspection = lazy\(/, '5/6 adminLazyViews');
  assert.ok(CASES_BUREAU.has(ID), '6/6 le case d AdminViewRenderer');
});

test('C2 les TROIS declarations du telephone sont posees', () => {
  assert.ok(VUES_TEL_ADMIN.has(ID), '1/3 VUES_TELEPHONE.admin');
  assert.match(sansCommentaires(lire('src/app/pwaMobileShellConfig.tsx')),
    /export const AdminCrmProspection = lazy\(/, '2/3 pwaMobileShellConfig');
  assert.ok(CASES_TELEPHONE.has(ID), '3/3 le case de PwaMobileShell');
});

test('C3 le case n est conditionne par RIEN', () => {
  /*
   * Le module est visible par toutes les Societes : l'isolation est faite par la RLS et
   * par company_id, jamais par la visibilite de l'onglet. Ecrire
   * `case 'crm-prospection': return droit ? <Vue/> : null` ferait retomber le refus dans
   * le `default:`, c'est-a-dire ouvrir le tableau de bord.
   */
  const ligne = /case 'crm-prospection': return ([^;]+);/.exec(RENDU);
  assert.ok(ligne, 'le case a disparu');
  assert.ok(!ligne[1].includes('?'),
    `le case est devenu conditionnel (${ligne[1].trim()}) : un refus retomberait dans le default:, `
    + 'qui ouvre la Vue d ensemble');
});

test('C4 l onglet n est PAS masque par defaut', () => {
  /*
   * `hidden: true` se retournerait contre David : le bouton « Par defaut » de la
   * reorganisation remplace le brouillon par la DECLARATION du code, drapeaux compris, et
   * le demasquage est reserve a Talvex. Deux clics le remasqueraient chez lui, EN BASE,
   * sans qu'il puisse le rouvrir seul.
   */
  const entree = /\{\s*id:\s*'crm-prospection'[^}]*\}/.exec(NAVIGATION);
  assert.ok(entree, "l'entree de menu a disparu");
  assert.ok(!entree[0].includes('hidden'),
    `l'onglet est declare masque : ${entree[0]} — David ne pourrait pas le rouvrir seul`);
});

// ===================== D. CE QUE LA VUE N'A PAS LE DROIT DE FAIRE =====================

const VUE = sansCommentaires(lire('src/pages/admin/views/CrmProspection.tsx'));
const DOSSIER = [
  'CrmProspectionTable', 'CrmProspectionCards', 'CrmProspectionFilters',
  'CrmProspectionModal', 'CrmProspectionDeleteModal', 'CrmProspectionCommentaireModal',
  'CrmProspectionCellules',
].map((f) => sansCommentaires(lire(`src/pages/admin/views/crm-prospection/${f}.tsx`))).join('\n');
const DONNEES = sansCommentaires(lire('src/pages/admin/views/crm-prospection/useCrmProspectionData.ts'));

test('D1 AUCUN useEditorMode : il ferait tomber TOUT l ecran sur le telephone', () => {
  /*
   * EditorModeProvider n'est pose que par AdminDashboard, que la coquille telephone ne
   * monte PAS. useEditorMode() leve alors au montage, et React remonte jusqu'a
   * l'ErrorBoundary : l'application entiere est remplacee, barre d'onglets comprise, sans
   * autre sortie que de relancer.
   *
   * ET AUCUN RELEVE NE L ATTRAPERAIT AUTREMENT : ils tournent sous Node, sans ecran. Ce
   * motif de texte est le seul garde-fou possible.
   */
  for (const [nom, src] of [['la vue', VUE], ['le dossier', DOSSIER]] as const) {
    assert.ok(!/\buseEditorMode\s*\(/.test(src),
      `${nom} appelle useEditorMode() : sur telephone, son fournisseur est absent et `
      + "l'ErrorBoundary remplacerait tout l'ecran. La variante sure est useEditorModeSafe.");
  }
});

test('D2 TOUTE ECRITURE PORTE .eq(company_id), y compris celles qui portent deja .in(id)', () => {
  /*
   * LA REGLE QUE DAVID A POSEE, et la raison pour laquelle elle n'est pas redondante avec
   * la RLS : la politique « SA manage all prospection leads » est un FOR ALL SANS aucune
   * condition de Societe — c'est la convention du schema. Pour un super_admin, cette
   * clause cote client est donc la SEULE chose qui borne la requete.
   *
   * Le defaut existe tel quel dans le CRM Leads : useCrmData.ts:181 ecrit
   * `.delete().in('id', ids)` tout court.
   */
  const ecritures = [...DONNEES.matchAll(/\.from\('crm_prospection_leads'\)([\s\S]*?);/g)];
  assert.ok(ecritures.length >= 4, `seulement ${ecritures.length} requetes trouvees : le motif a change`);

  for (const [bloc] of ecritures) {
    const verbe = /\.(insert|update|delete|select)\(/.exec(bloc)?.[1] ?? '?';
    if (verbe === 'insert') {
      assert.match(bloc, /company_id:\s*companyId/,
        'un insert sans company_id : la ligne ne porterait aucune Societe');
      continue;
    }
    assert.match(bloc, /\.eq\('company_id',\s*companyId\)/,
      `une requete ${verbe} sans .eq('company_id', companyId) : pour Talvex, rien ne la bornerait. `
      + `Bloc : ${bloc.replace(/\s+/g, ' ').slice(0, 120)}`);
  }

  /* Et nommement, la suppression groupee : les DEUX clauses, dans la meme requete. */
  assert.match(DONNEES, /\.delete\(\)[\s\S]{0,120}\.in\('id',[\s\S]{0,80}\.eq\('company_id',\s*companyId\)/,
    "la suppression ne porte plus les DEUX clauses .in('id', ids) ET .eq('company_id', companyId)");
});

test('D3 le catalogue de statuts est public.statuts, JAMAIS crm_system_statuses', () => {
  /*
   * crm_system_statuses porte le meilleur nom des neuf tables candidates et n'a AUCUN
   * company_id : ses lignes sont lisibles, modifiables et EFFACABLES par l'admin de
   * n'importe quelle autre Societe. C'est le faux ami du chantier, et l'exigence premiere
   * de David etait de reutiliser le systeme existant — pas n'importe lequel.
   */
  assert.match(DONNEES, /\.from\('statuts'\)[\s\S]{0,200}\.eq\('company_id',\s*companyId\)/,
    'le catalogue de statuts n est plus lu, ou n est plus borne a la Societe');
  assert.ok(!DONNEES.includes('crm_system_statuses'),
    'crm_system_statuses est lue : elle n a pas de company_id, ses lignes sont partagees par toutes les Societes');
  assert.ok(!DOSSIER.includes('crm_system_statuses') && !VUE.includes('crm_system_statuses'),
    'crm_system_statuses apparait dans l interface du module');
});

test('D4 la case d en-tete et la suppression partent de la liste AFFICHEE', () => {
  /* Le defaut inverse existe dans le depot : le toggleAll de ListeVendeurs selectionne
     TOUS les enregistrements. Avec des filtres, il coche des lignes invisibles. */
  assert.match(VUE, /idsSelectionnables\(affiches\)/,
    'la case d en-tete ne part plus de la liste affichee : elle pourrait cocher des lignes masquees');
  assert.match(VUE, /idsASupprimer\(affiches,\s*selection\)/,
    'la suppression ne part plus de la liste affichee : elle pourrait emporter des lignes masquees');
});

// ===================== E. LES COLONNES, DANS L ORDRE DEMANDE =====================

test('E1 les colonnes sont dans l ordre exact que David a donne', () => {
  /* Selection et Actions encadrent le tableau et ne sont pas des colonnes de donnee :
     elles sont verifiees a part, par leur presence dans le composant. */
  const colonnes = sansCommentaires(lire('src/pages/admin/views/crm-prospection/crmProspectionColonnes.ts'));
  const ordre = [...colonnes.matchAll(/cle:\s*'([a-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual(ordre, ['nom', 'prenom', 'email', 'poste', 'entreprise', 'lien', 'statut', 'commentaire'],
    "l'ordre des colonnes a change : David l'a donne explicitement");

  /* « Societe » a l'ecran, `entreprise` en base. Les deux doivent rester accordes. */
  assert.match(colonnes, /cle:\s*'entreprise',\s*libelle:\s*'Société'/,
    "la colonne entreprise ne s'affiche plus « Société »");
});

test('E2 la selection et les actions encadrent bien le tableau', () => {
  const table = sansCommentaires(lire('src/pages/admin/views/crm-prospection/CrmProspectionTable.tsx'));
  assert.match(table, /data-testid="crm-prospection-tout-selectionner"/, 'la case d en-tete a disparu');
  assert.match(table, /crm-prospection-modifier-\$\{l\.id\}/, 'le bouton Modifier a disparu');
  assert.match(table, /crm-prospection-supprimer-\$\{l\.id\}/, 'le bouton Supprimer a disparu');
  /* David a dit « Pour le moment uniquement : Modifier, Supprimer. Pas d'autres actions. » */
  const actions = table.slice(table.indexOf('Actions'));
  for (const interdit of ['Dupliquer', 'Exporter', 'Appeler', 'Envoyer']) {
    assert.ok(!actions.includes(interdit), `une action « ${interdit} » est apparue : David n'en a demande que deux`);
  }
});

test('E3 le rendu telephone est en CARTES, et les deux ne coexistent jamais', () => {
  /* Decision de David du 02/11/2026, apres qu'on lui a montre que sa consigne
     contredisait son propre refus consigne dans CrmImmoCards.tsx. */
  const table = sansCommentaires(lire('src/pages/admin/views/crm-prospection/CrmProspectionTable.tsx'));
  const cartes = sansCommentaires(lire('src/pages/admin/views/crm-prospection/CrmProspectionCards.tsx'));
  assert.match(table, /hidden md:block/, 'le tableau ne se cache plus sous 768 px');
  assert.match(cartes, /md:hidden/, 'les cartes ne se cachent plus au-dessus de 768 px');
});

// ===================== X. LES EXCEPTIONS RESTENT DES EXCEPTIONS =====================

test('X1 les exceptions declarees existent encore dans le code', () => {
  /*
   * Une liste d'exceptions qui se perime en silence affaiblit le relevé sans que personne
   * ne le voie : elle laisserait passer un vrai trou en croyant tolerer un cas connu.
   * On verifie donc que chaque id excepte EXISTE toujours.
   */
  for (const id of [...HORS_MENU, ...SANS_ICONE, ...HORS_SWITCH]) {
    assert.ok(ACTIVE_VIEW.has(id),
      `'${id}' est declare comme exception mais n'existe plus dans ActiveView : retirez-le de la liste`);
  }
});
