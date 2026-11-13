// Releves : format d'affichage et d'appel des numeros de prospects (0 / +33 / 0033).
// Logique pure, aucun reseau, aucun DOM.
//   node --import tsx --test scripts/telephone/formatTel.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decomposeTel, nettoyerTel, normalizePhone } from '../../src/lib/phoneNormalizer.ts';
import {
  FORMATS_TEL, FORMAT_TEL_DEFAUT, estFormatTel, formaterTel, telHref, telDuLead, telCorrespond,
} from '../../src/lib/formatTel.ts';

const lire = (p: string) => readFileSync(p, 'utf8');

/**
 * Le fichier PRIVE DE SES COMMENTAIRES.
 *
 * Deux fois dans ce chantier, un releve a echoue sur sa propre explication : le commentaire
 * qui dit « ce fichier n importe pas supabase » CONTIENT le mot interdit, et celui qui
 * explique le piege de `currentTarget.style` contient le piege. Une interdiction qui se
 * declenche sur la prose qui la justifie decourage d ecrire cette prose — c est exactement
 * l inverse de ce qu on veut. On interroge donc le CODE.
 */
const code = (p: string) =>
  lire(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* Un numero de test, jamais un vrai : neuf chiffres apres le zero, prefixe 06 comme les 33
   leads mesures en base le 12/11/2026. */
const NAT = '612345678';

test('T1 les trois notations du MEME numero, depuis toutes les ecritures sources', () => {
  /* LE COEUR DU CHANTIER. Sept ecritures de la meme ligne telephonique doivent donner trois
     resultats, et seulement trois. Les trois premieres formes sont celles reellement presentes
     en base (releve du 12/11/2026 en role `postgres`, donc hors RLS, sur les 33 leads) :
     `0XXXXXXXXX` colle pour 13, `0X XX XX XX XX` espace pour 10, `+33XXXXXXXXX` pour 10. Les
     autres sont des ecritures que David a demande de couvrir meme si la base ne les contient
     pas aujourd hui — un import les amenera. */
  const sources = [
    '0' + NAT,                               // colle         (13 leads en base)
    '06 12 34 56 78',                        // espaces       (10 leads en base)
    '+33' + NAT,                             // international (10 leads en base)
    '06-12-34-56-78',                        // tirets
    '06.12.34.56.78',                        // points
    '(06) 12 34 56 78',                      // parentheses
    '0033' + NAT,                            // notation 00
  ];

  for (const src of sources) {
    assert.equal(formaterTel(src, '0'), '0' + NAT, 'format 0 depuis ' + JSON.stringify(src));
    assert.equal(formaterTel(src, '+33'), '+33' + NAT, 'format +33 depuis ' + JSON.stringify(src));
    assert.equal(formaterTel(src, '0033'), '0033' + NAT, 'format 0033 depuis ' + JSON.stringify(src));
  }
});

test('T2 jamais de prefixe double, et le formatage est stable si on l applique deux fois', () => {
  /* LE DEFAUT QUE CE RELEVE INTERDIT : coller un prefixe devant ce qui est deja la. Il ne
     peut PAS se produire ici, parce qu on repart toujours de la partie nationale decomposee
     — mais une retouche future pourrait remplacer la decomposition par une concatenation,
     et le numero sonnerait alors dans le vide sans rien casser a l ecran. */
  for (const f of FORMATS_TEL) {
    for (const g of FORMATS_TEL) {
      const une = formaterTel('0' + NAT, f);
      const deux = formaterTel(une, g);
      assert.equal(deux, formaterTel('0' + NAT, g),
        f + ' puis ' + g + ' doit donner le meme resultat que ' + g + ' seul');
      assert.doesNotMatch(deux, /\+33\+|\+3333|00330033|003333|\+330033/,
        'prefixe double detecte : ' + deux);
    }
  }
  /* Et l idempotence stricte : reformater dans le MEME format ne bouge plus rien. */
  for (const f of FORMATS_TEL) {
    const une = formaterTel('06 12 34 56 78', f);
    assert.equal(formaterTel(une, f), une, f + ' doit etre idempotent');
  }
});

test('T3 un numero etranger n est JAMAIS ramene a une forme nationale', () => {
  /* Le zero de tete est une convention NATIONALE. Devant un numero belge il ne veut rien
     dire, et le composer depuis la France ne joint personne. C est la regle que David a
     posee, et elle est tenue par le TYPE : `decomposeTel` ne rend une partie nationale que
     pour la France. */
  const etrangers = ['+32470123456', '+4915112345678', '+352621123456', '+14155552671', '0032470123456'];
  for (const e of etrangers) {
    const d = decomposeTel(e);
    assert.equal(d?.pays, 'autre', e + ' ne doit pas etre pris pour un numero francais');
    const en0 = formaterTel(e, '0');
    assert.ok(en0.startsWith('+'), e + ' en format 0 doit rester international, obtenu ' + en0);
    assert.doesNotMatch(en0, /^0[1-9]/, e + ' ne doit pas devenir un faux numero national');
    /* Seule la NOTATION de l indicatif suit le reglage : +49 et 0049 disent la meme chose. */
    assert.equal(formaterTel(e, '0033'), '00' + formaterTel(e, '+33').slice(1));
  }
});

test('T4 vide, illisible, trop court : aucun lien d appel, aucune exception', () => {
  /* Un `href` VIDE pointerait sur la page courante : toucher l icone rechargerait le CRM au
     lieu de passer un appel. D ou `null`, et une icone qui ne s affiche pas du tout. */
  const riens = ['', '   ', null, undefined, '-', '--', 'NA', 'a definir', '00', '+', '123', '06 12'];
  for (const r of riens) {
    assert.equal(telHref(r as string, '0'), null, JSON.stringify(r) + ' ne doit pas donner de lien');
    for (const f of FORMATS_TEL) {
      assert.doesNotThrow(() => formaterTel(r as string, f), JSON.stringify(r) + ' en ' + f + ' ne doit pas lever');
    }
  }
  /* Et un numero valide, lui, donne bien un lien dans la notation choisie. */
  assert.equal(telHref('06 12 34 56 78', '+33'), 'tel:+33' + NAT);
  assert.equal(telHref('06 12 34 56 78', '0033'), 'tel:0033' + NAT);
  assert.equal(telHref('+33' + NAT, '0'), 'tel:0' + NAT);
});

test('T5 un numero indecidable est rendu tel quel, jamais invente', () => {
  /* Mieux vaut montrer ce qui est en base qu un numero fabrique ou un tiret a la place : la
     personne qui lit l ecran doit pouvoir constater que la donnee est sale. */
  assert.equal(formaterTel('06 12 34 56 78 90 12', '0'), '06123456789012');
  assert.equal(formaterTel('poste 4512', '+33'), 'poste4512');
  assert.equal(formaterTel('', '0'), '');
});

test('T6 le zero national garde derriere l indicatif ne produit pas un numero a dix chiffres', () => {
  /* `+330612345678` est une saisie fautive courante — on colle l indicatif devant le numero
     national SANS retirer son zero. Laisse tel quel, ca fait dix chiffres apres +33 : le
     numero est injoignable, et rien a l ecran ne le dit. */
  assert.equal(formaterTel('+330' + NAT, '0'), '0' + NAT);
  assert.equal(formaterTel('+330' + NAT, '+33'), '+33' + NAT);
  assert.equal(formaterTel('00330' + NAT, '+33'), '+33' + NAT);
});

test('T7 le zero perdu par un tableur est retrouve', () => {
  /* Neuf chiffres sans zero de tete : la signature d une colonne passee en « nombre » dans un
     tableur. Le numero est juste, c est son zero qui a disparu. */
  assert.equal(formaterTel(NAT, '0'), '0' + NAT);
  assert.equal(formaterTel(NAT, '+33'), '+33' + NAT);
  /* Mais neuf chiffres COMMENCANT par zero restent indecidables : on n invente pas. */
  assert.equal(decomposeTel('012345678'), null);
});

test('T8 la cascade : la colonne plate d abord, puis les deux casses du JSONB', () => {
  /* LE DEFAUT HISTORIQUE QUE CETTE CASCADE CORRIGE. Releve du 12/11/2026, role `postgres`,
     hors RLS, sur les 33 leads : le JSONB porte DEUX cles qui ne different que par une
     majuscule — `Telephone` renseigne pour 13 leads, `telephone` pour 20, ensembles DISJOINTS
     — et la colonne plate `leads.telephone` est remplie pour 30. Les deux CRM lisaient
     `data['Telephone']` : ils affichaient un tiret pour 20 leads sur 33, soit 61 %.
     Comptes : 13 + 20 = 33, donc AUCUN lead n est sans numero. */
  assert.equal(telDuLead({ telephone: '0' + NAT, data: { Telephone: '0999999999' } }), '0' + NAT,
    'la colonne plate passe avant le JSONB : c est elle que le pipeline d import normalise');
  assert.equal(telDuLead({ telephone: null, data: { Telephone: '0' + NAT } }), '0' + NAT);
  assert.equal(telDuLead({ telephone: '', data: { telephone: '0' + NAT } }), '0' + NAT,
    'la cle en minuscules — 20 leads sur 33 — doit etre lue');
  assert.equal(telDuLead({ telephone: '   ', data: { TELEPHONE: '0' + NAT } }), '0' + NAT,
    'une troisieme casse ne doit pas rouvrir le meme defaut');
  assert.equal(telDuLead({ data: { 'Tel Portable': '0' + NAT } }), '0' + NAT,
    'un nom de champ avec espace doit etre reconnu');
  assert.equal(telDuLead({ data: { 'tel_fixe': '0' + NAT } }), '0' + NAT,
    'un nom avec soulignement doit etre reconnu');
  assert.equal(telDuLead({ data: { 'Téléphone': '0' + NAT } }), '0' + NAT,
    'un nom accentue doit etre reconnu');
  assert.equal(telDuLead({ data: { phoneMobile: '0' + NAT } }), '0' + NAT,
    'un nom anglais doit etre reconnu');

  /* Et on ne ramasse PAS n importe quoi : un champ qui ne parle pas de telephone est ignore. */
  assert.equal(telDuLead({ data: { Nom: 'Dupont', Email: 'a@b.c', Ville: 'Lyon' } }), '');

  /* LES FAUX AMIS. « Commence par tel » ramasserait un numero de telecopieur : composer un
     fax met un prospect de mauvaise humeur. Et « Numero » tout court est tout aussi
     probablement un numero de dossier, de client ou de commande — on prefere ne rien
     afficher qu un numero de facture avec un bouton d appel a cote. */
  assert.equal(telDuLead({ data: { Telecopie: '0' + NAT } }), '', 'un fax n est pas un telephone');
  assert.equal(telDuLead({ data: { telecopieur: '0' + NAT } }), '');
  assert.equal(telDuLead({ data: { Telex: '0' + NAT } }), '');
  assert.equal(telDuLead({ data: { Numero: 'FA-2026-0417' } }), '',
    'un champ « Numero » seul est trop ambigu pour etre appele');
  /* Mais un fax a cote d un telephone ne masque pas le telephone. */
  assert.equal(telDuLead({ data: { Telecopie: '0999999999', Telephone: '0' + NAT } }), '0' + NAT);
  assert.equal(telDuLead({ data: {} }), '');
  assert.equal(telDuLead({}), '');
  assert.equal(telDuLead(null), '');
});

test('T9 le filtre telephone est PUREMENT ADDITIF : rien de ce qui matchait ne cesse de matcher', () => {
  /* L ancienne regle etait un `includes` sur la source brute. Elle est testee EN PREMIER par
     `telCorrespond`, donc tout resultat d avant est conserve. Ce releve le verifie sur les
     trois formes reellement en base, puis verifie l ajout. */
  const enBase = ['0' + NAT, '06 12 34 56 78', '+33' + NAT];

  // (a) L ancien comportement, intact : tout prefixe de la source trouvait, et trouve encore.
  for (const src of enBase) {
    for (let n = 1; n <= src.length; n++) {
      const morceau = src.slice(0, n);
      assert.ok(telCorrespond(src, morceau),
        'regression : ' + JSON.stringify(morceau) + ' trouvait ' + JSON.stringify(src) + ' avant');
    }
  }

  // (b) L ajout : on tape ce qu on VOIT, dans n importe quel format.
  for (const src of enBase) {
    for (const f of FORMATS_TEL) {
      const affiche = formaterTel(src, f);
      assert.ok(telCorrespond(src, affiche),
        'recopier le numero affiche en ' + f + ' (' + affiche + ') doit trouver ' + JSON.stringify(src));
    }
    assert.ok(telCorrespond(src, '0612'), 'debut national');
    assert.ok(telCorrespond(src, '33612'), 'debut international sans le plus');
    assert.ok(telCorrespond(src, '+33 6 12'), 'international espace');
  }

  // (c) Et il refuse ce qui n est pas la.
  assert.equal(telCorrespond('0' + NAT, '0799'), false);
  assert.equal(telCorrespond('', '0612'), false);
  assert.equal(telCorrespond('0' + NAT, ''), true, 'un filtre vide ne filtre rien');
  assert.equal(telCorrespond('0' + NAT, '   '), true);
});

test('T10 le helper de format ne touche PAS la base, et c est verifiable', () => {
  /* LA PROMESSE CENTRALE DE CE CHANTIER : « cela ne doit jamais modifier les numeros
     enregistres dans la base ». Elle n est pas tenue par une relecture mais par l ABSENCE
     d import : un fichier qui n importe pas le client ne peut rien ecrire. */
  /* On interroge le CODE, prive de ses commentaires : ceux de ces fichiers EXPLIQUENT
     justement qu ils n atteignent pas la base, et un motif large se declencherait sur sa
     propre explication. Et on cible l import, pas le simple mot. */
  const importeLaBase = /from\s+['"][^'"]*supabase['"]/;
  const ecrit = /\.update\(|\.upsert\(|\.insert\(|\.rpc\(/;
  const lire = code;

  const h = lire('src/lib/formatTel.ts');
  assert.doesNotMatch(h, importeLaBase, 'formatTel.ts ne doit pas pouvoir atteindre la base');
  assert.doesNotMatch(h, ecrit, 'formatTel.ts ne doit contenir aucune ecriture');

  const n = lire('src/lib/phoneNormalizer.ts');
  assert.doesNotMatch(n, importeLaBase, 'phoneNormalizer.ts ne doit pas atteindre la base');
  assert.doesNotMatch(n, ecrit, 'phoneNormalizer.ts ne doit contenir aucune ecriture');

  const sel = lire('src/components/telephone/SelecteurFormatTel.tsx');
  assert.doesNotMatch(sel, importeLaBase,
    'le selecteur ne doit pas atteindre la base : c est le hook qui enregistre la PREFERENCE');
  assert.doesNotMatch(sel, ecrit, 'le selecteur ne doit contenir aucune ecriture');

  /* Et la seule ecriture du chantier porte sur les preferences, jamais sur les leads. */
  const hook = lire('src/hooks/useFormatTel.ts');
  assert.match(hook, /savePrefRemote/, 'la preference doit passer par le mecanisme existant');
  assert.doesNotMatch(hook, /'leads'/, 'le hook ne doit jamais nommer la table leads');
  assert.doesNotMatch(hook, ecrit,
    'le hook ne doit pas ecrire lui-meme : il delegue a savePrefRemote, qui ne touche que les preferences');

  /* Le composant d appel non plus : il construit un lien, il n ecrit rien. */
  const b = lire('src/components/telephone/BoutonAppel.tsx');
  assert.doesNotMatch(b, importeLaBase, 'l icone d appel ne doit pas atteindre la base');
  assert.doesNotMatch(b, ecrit, 'l icone d appel ne doit rien ecrire');

  /* Et les quatre presentations : aucune n ecrit un numero. Les seules ecritures qui y
     subsistent touchent le statut, l acces et l IA — pas le telephone. */
  for (const f of [
    'src/pages/admin/views/crm/CrmTableRow.tsx',
    'src/pages/admin/views/crm/CrmMobileLeadCard.tsx',
    'src/pages/vendor/views/leads/VendorLeadDesktopRow.tsx',
    'src/pages/vendor/views/leads/VendorLeadMobileCard.tsx',
  ]) {
    assert.doesNotMatch(lire(f), /telephone:\s|telephone'\]\s*=|update\(\{\s*telephone/,
      f + ' ne doit jamais ecrire un numero');
  }
});

test('T11 aucune table, aucune colonne, aucune migration pour cette preference', () => {
  /* Contrainte de David : « Ne cree pas de colonne en base pour ca. » Le reglage voyage dans
     le dictionnaire jsonb `user_preferences.sidebar_orders`, qui existe deja et dont la cle
     est libre — le meme support que l ordre des actions, les cartes de notification et la
     disposition de la barre laterale. */
  const hook = lire('src/hooks/useFormatTel.ts');
  assert.match(hook, /from '\.\/actionPrefsStorage'/,
    'la persistance doit reutiliser la convention maison, pas en inventer une');
  assert.match(hook, /CLE_FORMAT_TEL = 'crm_format_tel'/,
    'une cle de concept unique, partagee Societe et Vendeur');
  assert.match(hook, /readPrefCache[\s\S]{0,500}loadPrefRemote/,
    'le cache local doit etre lu AVANT la base : sinon les numeros changent de forme sous les yeux');
  assert.match(hook, /writePrefCache[\s\S]{0,200}savePrefRemote/,
    'a l ecriture, le cache d abord et la base en tire-et-oublie');
  assert.match(hook, /auth\.getSession|onAuthStateChange/,
    'le proprietaire est le compte CONNECTE : la facon d ecrire un numero est son reglage');

  assert.match(lire('src/hooks/actionPrefsStorage.ts'), /sidebar_orders/,
    'le support est bien sidebar_orders');
});

test('T12 un seul reglage partage : un magasin externe, pas un etat par composant', () => {
  /* LE DEFAUT QU ON EVITE : avec un `useState` par composant, le selecteur vit dans la barre
     et les numeros dans les lignes — cliquer sur un bouton n aurait rien change au tableau.
     Un magasin au niveau du module fait changer TOUS les abonnes dans le meme rendu. */
  const hook = lire('src/hooks/useFormatTel.ts');
  assert.match(hook, /useSyncExternalStore/,
    'le reglage doit etre partage par un magasin externe, comme useTalixySound');
  assert.doesNotMatch(hook, /createContext|useContext/,
    'pas de contexte : il faudrait brancher un fournisseur, et les deux CRM vivent dans deux arbres');

  /* Et les quatre presentations lisent le MEME hook : pas trois implementations. */
  for (const f of [
    'src/pages/admin/views/crm/CrmTableRow.tsx',
    'src/pages/admin/views/crm/CrmMobileLeadCard.tsx',
    'src/pages/vendor/views/leads/VendorLeadDesktopRow.tsx',
    'src/pages/vendor/views/leads/VendorLeadMobileCard.tsx',
  ]) {
    const s = lire(f);
    assert.match(s, /useFormatTel\(\)/, f + ' doit lire le reglage partage');
    assert.match(s, /telDuLead\(lead\)/, f + ' doit lire le numero par la cascade');
    assert.match(s, /formaterTel\(tel, format\)/, f + ' doit afficher le numero reecrit');
    assert.doesNotMatch(s, /data\['Telephone'\]/, f + ' ne doit plus lire la cle directement');
  }
});

test('T13 l icone d appel n existe que sur les cartes, et aucune colonne desktop n est ajoutee', () => {
  /* David : « pas d icone telephone / pas de nouvelle colonne d appel sur desktop ». La
     garantie n est pas une relecture : `md:` bascule par `display`, pas par montage, donc le
     bouton pose dans un fichier de CARTE est invisible au-dela de 768 px par CONSTRUCTION du
     conteneur parent. Et aucune colonne n est ajoutee : l en-tete du tableau est construit
     depuis la liste des colonnes, une cellule de plus l aurait desynchronise. */
  for (const f of [
    'src/pages/admin/views/crm/CrmMobileLeadCard.tsx',
    'src/pages/vendor/views/leads/VendorLeadMobileCard.tsx',
  ]) {
    assert.match(lire(f), /<BoutonAppel tel=\{tel\} format=\{format\} \/>/,
      f + ' doit porter l icone d appel');
  }
  for (const f of [
    'src/pages/admin/views/crm/CrmTableRow.tsx',
    'src/pages/vendor/views/leads/VendorLeadDesktopRow.tsx',
  ]) {
    const s = lire(f);
    assert.doesNotMatch(s, /BoutonAppel/, f + ' ne doit porter aucune icone d appel');
    /* On cible le lien LITTERAL, pas la sous-chaine : ces fichiers contiennent `tel:` au
       sens de la propriete d un objet — `lead={{ ..., tel: telAffiche }}` — et un motif
       large se serait declenche sur une transmission de donnee parfaitement legitime. */
    assert.doesNotMatch(s, /['"`]tel:/, f + ' ne doit porter aucun lien d appel');
    assert.doesNotMatch(s, /telHref/, f + ' ne doit pas construire de lien d appel');
  }
  /* Et les deux listes de colonnes n ont pas bouge. */
  assert.match(lire('src/pages/admin/views/crm/CrmTableRow.tsx'),
    /DEFAULT_COLUMN_ORDER = \['hash', 'nom', 'prenom', 'email', 'telephone', 'date_ajout', 'statut', 'actions', 'acces', 'ia', 'vendeur'\]/,
    'aucune colonne ajoutee ni retiree cote Societe');
  assert.match(lire('src/pages/vendor/views/leads/VendorLeadDesktopRow.tsx'),
    /DEFAULT_VENDOR_COLUMN_ORDER = \['hash', 'nom', 'prenom', 'email', 'telephone', 'date_ajout', 'statut', 'actions', 'acces', 'ia'\]/,
    'aucune colonne ajoutee ni retiree cote Vendeur');

  /* L icone arrete la propagation : sans ca, toucher l icone ouvrirait aussi la fiche. */
  const b = lire('src/components/telephone/BoutonAppel.tsx');
  assert.match(b, /onClick=\{e => e\.stopPropagation\(\)\}/,
    'l icone doit arreter la propagation du clic');
  assert.match(b, /if \(!href\) return null;/,
    'pas de numero exploitable : on ne rend RIEN, ni href vide ni icone grisee');
  assert.match(b, /w-11 h-11/, '44 px de cible tactile');
});

test('T14 le selecteur est monte UNE SEULE FOIS par panel, au-dessus des deux presentations', () => {
  /* La barre d outils est montee DEUX FOIS dans chaque CRM, une par branche `md:`. Un
     selecteur pose dedans aurait existe en double — deux boutons actifs a l ecran, et rien
     pour dire lequel compte. Pose au-dessus des deux branches, il n y en a qu un. */
  for (const f of ['src/pages/admin/views/Crm.tsx', 'src/pages/vendor/views/VendorLeads.tsx']) {
    const s = lire(f);
    const n = s.split('<SelecteurFormatTel />').length - 1;
    assert.equal(n, 1, f + ' doit monter le selecteur exactement une fois, trouve ' + n);

    /* Et AVANT la premiere branche `md:` : sinon il ne servirait qu une des deux. */
    const iSel = s.indexOf('<SelecteurFormatTel />');
    const iBranche = s.search(/hidden md:block|md:hidden/);
    assert.ok(iSel > 0 && iBranche > 0 && iSel < iBranche,
      f + ' : le selecteur doit preceder les deux presentations');
  }

  /* Il n est jamais pose dans un fichier de barre d outils. */
  for (const f of [
    'src/pages/admin/views/crm/CrmWorkModeBar.tsx',
    'src/pages/admin/views/crm/CrmWorkModeBarMobile.tsx',
    'src/pages/vendor/views/leads/VendorLeadWorkModeBar.tsx',
    'src/pages/vendor/views/leads/VendorLeadWorkModeBarMobile.tsx',
  ]) {
    assert.doesNotMatch(lire(f), /SelecteurFormatTel/, f + ' ne doit pas porter le selecteur');
  }
});

test('T15 l etat actif du selecteur ne repose pas sur la seule couleur', () => {
  /* Un daltonien, ou un telephone en plein soleil, ne doivent pas avoir a deviner lequel des
     trois est actif. L etat passe donc aussi par `aria-pressed` et par la graisse du texte. */
  const s = lire('src/components/telephone/SelecteurFormatTel.tsx');
  assert.match(s, /aria-pressed=\{actif\}/, 'l etat doit etre annonce aux lecteurs d ecran');
  assert.match(s, /fontWeight: actif \? 700 : 500/, 'l etat doit se voir aussi sans la couleur');
  assert.match(s, /role="group"/, 'les trois boutons forment un groupe nomme');
  assert.match(s, /min-w-\[44px\]/, 'le bouton zero ne fait qu un caractere : plancher tactile');
  assert.match(s, /FORMATS_TEL\.map/, 'les trois boutons viennent de la liste, pas de trois copies');
});

test('T19 le survol ne touche jamais le style en ligne : REGRESSION A NE PAS REINTRODUIRE', () => {
  /* LE DEFAUT MESURE LE 12/11/2026. Le survol ecrivait directement dans
     `e.currentTarget.style`. Apres un passage du pointeur puis un clic ailleurs, le bouton
     « 0 » INACTIF gardait `background: rgb(10, 18, 32)` — la couleur de survol, posee a la
     main et jamais reprise par React, qui ne re-ecrit `style` que lorsque sa propre valeur
     change. A l'ecran, DEUX boutons paraissaient actifs, et rien ne disait lequel comptait.

     Le motif est pourtant celui de toute la barre d'outils du CRM : il tient pour un bouton
     dont l'etat change rarement, et casse pour un selecteur dont l'etat change a chaque clic.
     D'ou la regle, ici seulement : le survol est un ETAT, les couleurs sont derivees du
     rendu, et React garde la main sur l'attribut `style`. */
  const s = code('src/components/telephone/SelecteurFormatTel.tsx');
  assert.doesNotMatch(s, /currentTarget\.style/,
    'le survol ne doit pas ecrire dans le style en ligne : React ne le reprendrait pas');
  assert.match(s, /const \[survole, setSurvole\]/, 'le survol doit etre un etat React');
  assert.match(s, /onMouseEnter=\{\(\) => setSurvole\(f\)\}/, 'entree : on note le bouton survole');
  assert.match(s, /onMouseLeave=\{\(\) => setSurvole\(null\)\}/,
    'quitter le GROUPE doit effacer le survol : un bouton peut ne jamais recevoir son propre mouseleave');
  assert.match(s, /background: actif \? t\.accent\.bg : survol \? t\.surface\.secondary : 'transparent'/,
    'la couleur doit etre entierement derivee du rendu');

  /* ET LE MEME PIEGE N EST PAS REINTRODUIT PAR L ICONE D APPEL. */
  assert.doesNotMatch(code('src/components/telephone/BoutonAppel.tsx'), /currentTarget\.style/,
    'l icone d appel ne doit pas peindre son survol a la main');
});

test('T16 le nettoyage est ecrit UNE seule fois, et normalizePhone n a pas change de comportement', () => {
  /* Deux fonctions enlevent les memes separateurs. Ecrit deux fois, le jeu de caracteres
     aurait diverge a la premiere retouche : un numero juge valide a l import et refuse a
     l affichage. */
  const n = lire('src/lib/phoneNormalizer.ts');
  assert.match(n, /export function nettoyerTel/, 'le nettoyage doit etre partage');
  assert.equal(n.split('.replace(/[').length - 1, 1,
    'le jeu de separateurs ne doit apparaitre qu une fois dans le fichier');
  assert.equal(nettoyerTel('  06 12.34-56(78)  '), '0' + NAT);

  /* Le pipeline d import depend de `normalizePhone`. Son comportement est fige ici : si une
     retouche le change, c est l import CSV qui bouge, pas seulement l affichage. */
  assert.deepEqual(normalizePhone(''), { canonical: null, valid: true });
  assert.deepEqual(normalizePhone('0' + NAT), { canonical: '+33' + NAT, valid: true });
  assert.deepEqual(normalizePhone('06 12 34 56 78'), { canonical: '+33' + NAT, valid: true });
  assert.deepEqual(normalizePhone('0033' + NAT), { canonical: '+33' + NAT, valid: true });
  assert.equal(normalizePhone('+32470123456').canonical, '+32470123456');
  assert.equal(normalizePhone(NAT).valid, false,
    'neuf chiffres nus restent INVALIDES a l import : la decomposition d affichage est plus '
    + 'tolerante que la validation d import, et ce releve fige l ecart');
  assert.equal(normalizePhone('abc').valid, false);
});

test('T17 le format par defaut, et le refus d une valeur stockee invalide', () => {
  /* La notation nationale par defaut : celle qu un francais lit sans y penser. */
  assert.equal(FORMAT_TEL_DEFAUT, '0');
  assert.deepEqual([...FORMATS_TEL], ['0', '+33', '0033'], 'l ordre est celui des boutons');

  /* Une preference lue depuis le cache ou la base peut etre n importe quoi — un cache d une
     version precedente, une main dans le stockage local. Elle est validee, pas crue. */
  for (const bon of FORMATS_TEL) assert.equal(estFormatTel(bon), true);
  for (const mauvais of ['00', '+32', 'E164', '', null, undefined, 0, {}, ['0']]) {
    assert.equal(estFormatTel(mauvais), false, JSON.stringify(mauvais) + ' ne doit pas passer');
  }
});

test('T18 les 33 numeros reellement en base, dans les trois formats', () => {
  /* Les FORMES exactes relevees le 12/11/2026 (role `postgres`, hors RLS) avec leur nombre
     d occurrences. Les chiffres sont remplaces par ceux du numero de test : ce releve verifie
     les FORMATS presents en base, pas des numeros de prospects. */
  const parc: Array<[string, number, string]> = [
    ['0' + NAT, 13, 'colle, dont les 3 leads sans colonne plate'],
    ['06 12 34 56 78', 10, 'espace, colonne plate'],
    ['+33' + NAT, 10, 'international, colonne plate'],
  ];
  let couverts = 0;
  for (const [src, combien, note] of parc) {
    for (const f of FORMATS_TEL) {
      const ecrit = formaterTel(src, f);
      assert.match(ecrit, /^(0|\+33|0033)612345678$/, note + ' en ' + f + ' : obtenu ' + ecrit);
      assert.ok(telHref(src, f), note + ' en ' + f + ' doit donner un lien d appel');
    }
    couverts += combien;
  }
  assert.equal(couverts, 33, 'les trois formes couvrent bien les 33 leads');
});
