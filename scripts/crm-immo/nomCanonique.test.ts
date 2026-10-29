/*
 * Le champ unique de nom, et la colonne canonique qui le porte.
 *   node --import tsx --test scripts/crm-immo/nomCanonique.test.ts
 *
 * CE QUE CE RELEVE DEFEND, et dans cet ordre d'importance :
 *   1. AUCUNE DECOUPE, nulle part dans le depot. C'est la regle que David a posee le
 *      28/10/2026, et c'est la seule qu'une mesure ait deja prise en defaut : sur les
 *      deux dossiers reels, un porte DEUX mots dans `locataire` ET DEUX mots dans
 *      `proprietaire`, donc la frontiere y est 2|2 et toute regle au premier espace
 *      rendrait 1|3. Une recoupe fautive serait INVISIBLE — la chaine recomposee reste
 *      identique au caractere pres.
 *   2. La precedence dans le BON SENS. Une precedence qui prefererait une canonique vide
 *      viderait l'ecran de tout le stock d'avant la migration, sans aucune erreur.
 *   3. L'UPDATE ne reecrit PAS les quatre colonnes historiques.
 *   4. La migration reste NULLABLE et SANS CONTRAINTE.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { composerNom, nomCanonique } from '../../src/lib/crmImmoIdentite.ts';
import {
  CHAMPS_DOSSIER, COLONNES_SYSTEME, SAISIE_VIDE, problemeDeSaisie,
} from '../../src/pages/admin/views/crm-immo/crmImmoTypes.ts';
import { valeurAffichee } from '../../src/lib/crmImmoRecherche.ts';
import { toutesLesColonnes, REGLAGE_VIDE } from '../../src/lib/crmImmoColonnes.ts';
import type { DossierImmo } from '../../src/pages/admin/views/crm-immo/crmImmoTypes.ts';

const lire = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* Les commentaires sont retires AVANT toute recherche de motif : ce releve parle
   abondamment de decoupage, et sans ce filtre il rougirait sur sa propre prose. C'est
   un piege deja rencontre trois fois dans ce dossier. */
const codeSeul = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ===================== A. LA COMPOSITION =====================

test('A1 l ordre est NOM puis PRENOM, tranche par David le 28/10/2026', () => {
  assert.equal(composerNom('Dupont', 'Jean'), 'Dupont Jean');
  /* Le contre-temoin : l'ordre inverse ne doit PAS sortir. Sans lui, echanger les deux
     arguments de la primitive passerait inapercu. */
  assert.notEqual(composerNom('Dupont', 'Jean'), 'Jean Dupont');
});

test('A2 les vides sont ECARTES AVANT la jointure, jamais joints puis nettoyes', () => {
  /* Un prenom absent laisserait sinon une espace orpheline, que la recherche verrait
     comme un mot de plus et que le tri classerait a part. */
  for (const blanc of [null, undefined, '', '   ']) {
    assert.equal(composerNom('Dupont', blanc), 'Dupont', `prenom ${JSON.stringify(blanc)}`);
    assert.equal(composerNom(blanc, 'Jean'), 'Jean', `nom ${JSON.stringify(blanc)}`);
  }
  assert.equal(composerNom(null, null), '');
  assert.equal(composerNom('  ', '  '), '');
});

test('A3 aucune espace double, meme avec des valeurs deja espacees', () => {
  assert.equal(composerNom('  Dupont  ', '  Jean  '), 'Dupont Jean');
  assert.ok(!composerNom('Dupont ', ' Jean').includes('  '));
});

test('A4 un nom COMPOSE traverse sans etre touche', () => {
  /* La mesure du 28/10 : un dossier reel sur deux porte deux mots dans chacune des deux
     colonnes du proprietaire. Cinq mots doivent ressortir dans l'ordre, intacts. */
  assert.equal(composerNom('de La Tour', 'Marie Anne'), 'de La Tour Marie Anne');
  assert.equal(composerNom('Van der Berg', 'Jean Pierre'), 'Van der Berg Jean Pierre');
  /* Les espaces INTERIEURS multiples survivent : c'est volontaire, et c'est le seul cas
     ou la restitution exacte est en jeu pour un nom compose. */
  assert.equal(composerNom('de  La  Tour', 'Marie'), 'de  La  Tour Marie');
});

// ===================== B. LA PRECEDENCE =====================

test('B1 la canonique PRIME quand elle porte quelque chose', () => {
  assert.equal(nomCanonique('Dupont-Martin Jean-Luc', 'Dupont', 'Jean'), 'Dupont-Martin Jean-Luc');
  /* Et elle gagne EN ENTIER : jamais la canonique d'un cote avec une ancienne colonne de
     l'autre, ce qui fabriquerait une identite jamais saisie. */
  assert.ok(!nomCanonique('Cohen', 'Dupont', 'Jean').includes('Dupont'));
});

test('B2 une canonique VIDE retombe sur la composition — le piege MUET', () => {
  /*
   * LE SENS DE LA PRECEDENCE EST LA CHOSE LA PLUS FACILE A INVERSER DE TOUT CE CHANTIER,
   * et l'inverser ne leverait AUCUNE erreur : l'ecran se viderait, simplement.
   *
   * Tout le stock d'avant la migration a ses deux canoniques NULLES — David a choisi la
   * garde de modification plutot qu'un backfill. Une precedence qui prefererait la
   * canonique vide afficherait donc une colonne vide pour chaque dossier existant, et
   * `comparer` les enverrait tous en fin de tri, dans les deux sens.
   */
  for (const blanc of [null, undefined, '', '   ']) {
    assert.equal(nomCanonique(blanc, 'Dupont', 'Jean'), 'Dupont Jean', JSON.stringify(blanc));
  }
});

test('B3 la colonne du tableau applique la precedence, et dit la MEME chose', () => {
  const colonnes = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage: REGLAGE_VIDE });
  const np = (cle: string) => colonnes.find(c => c.famille === 'systeme' && c.cle === cle)!;

  const sansCanonique = {
    nom: 'Dupont', prenom: 'Jean', locataire: 'Cohen', proprietaire: 'Sarah',
    nom_complet_locataire: null, nom_complet_proprietaire: null,
  } as unknown as DossierImmo;
  assert.equal(valeurAffichee(sansCanonique, np('np_locataire')), 'Dupont Jean');
  assert.equal(valeurAffichee(sansCanonique, np('np_proprietaire')), 'Cohen Sarah');

  const avecCanonique = {
    ...sansCanonique,
    nom_complet_locataire: 'Dupont-Martin Jean-Luc',
    nom_complet_proprietaire: 'Cohen Sarah Deborah',
  } as unknown as DossierImmo;
  assert.equal(valeurAffichee(avecCanonique, np('np_locataire')), 'Dupont-Martin Jean-Luc');
  assert.equal(valeurAffichee(avecCanonique, np('np_proprietaire')), 'Cohen Sarah Deborah');

  /* L'INVARIANT QUI COMPTE : le tableau et la primitive ne peuvent pas diverger. */
  for (const d of [sansCanonique, avecCanonique]) {
    assert.equal(valeurAffichee(d, np('np_locataire')),
      nomCanonique(d.nom_complet_locataire, d.nom, d.prenom));
    assert.equal(valeurAffichee(d, np('np_proprietaire')),
      nomCanonique(d.nom_complet_proprietaire, d.locataire, d.proprietaire));
  }
});

test('B4 les deux colonnes composees declarent bien leur canonique', () => {
  const np = (cle: string) => COLONNES_SYSTEME.find(c => c.cle === cle)!;
  assert.equal(np('np_locataire').canonique, 'nom_complet_locataire');
  assert.equal(np('np_proprietaire').canonique, 'nom_complet_proprietaire');
  /* Et les cles du tableau n'ont PAS change : `ordonnerSysteme` jette en SILENCE les cles
     qu'il ne connait pas, et c'est le defaut deja paye le 23 octobre 2026. */
  assert.ok(COLONNES_SYSTEME.some(c => c.cle === 'np_locataire'));
  assert.ok(COLONNES_SYSTEME.some(c => c.cle === 'np_proprietaire'));
});

// ===================== C. AUCUNE DECOUPE, NULLE PART =====================

test('C1 aucun fichier du module ne decoupe un nom sur les espaces', () => {
  /*
   * Le releve le plus important du fichier. Il balaie le module entier a la recherche des
   * motifs par lesquels une decoupe pourrait revenir : un split sur l'espace, un
   * split_part, un indexOf d'espace suivi d'un substring, une regex de premier ou dernier
   * mot appliquee a un nom.
   */
  const MOTIFS: [RegExp, string][] = [
    [/\.split\(\s*['"` ]\s*['"`]\s*\)/, "un split sur l'espace"],
    [/\.split\(\s*\/\\s\+?\//, 'un split sur une classe d espace'],
    [/split_part\s*\(/i, 'un split_part SQL'],
    [/\bshift\(\)\s*(\?\?|\|\|)/, 'un premier mot extrait par shift'],
    [/\.pop\(\)\s*(\?\?|\|\|)\s*['"]/, 'un dernier mot extrait par pop'],
    [/replace\(\s*\/\^\[\^\\s\]\+/, 'un retrait du premier mot par regex'],
    [/replace\(\s*\/\\s\+\\S\+\$\//, 'un retrait du dernier mot par regex'],
  ];
  /*
   * crmImmoRecherche.ts est VOLONTAIREMENT absent de ce balayage, et il faut dire
   * pourquoi : il decoupe bien une chaine sur les espaces (`t.split(/\s+/)`), mais
   * c'est le TERME DE RECHERCHE tape par l'utilisateur, pour exiger que tous ses mots
   * soient presents. Cela n'a rien a voir avec le decoupage d'un NOM, et l'y inclure
   * rendait ce releve rouge sur du code juste.
   * Sa partie sensible — la composition d'affichage — est verifiee a part, juste apres.
   */
  const fichiers = [
    'src/lib/crmImmoIdentite.ts',
    'src/lib/crmImmoAlertes.ts',
    'src/pages/admin/views/crm-immo/crmImmoTypes.ts',
    'src/pages/admin/views/crm-immo/useCrmImmoDossiers.ts',
    'src/pages/admin/views/crm-immo/CrmImmoDossierModal.tsx',
    'src/pages/admin/views/crm-immo/CrmImmoDetailsModal.tsx',
  ];
  for (const f of fichiers) {
    const code = codeSeul(lire(f));
    for (const [motif, quoi] of MOTIFS) {
      assert.ok(!motif.test(code), `${f} contient ${quoi} : la decoupe est INTERDITE`);
    }
  }

  /* Et la composition d'affichage, isolee de son fichier : c'est le seul endroit de
     crmImmoRecherche ou un nom passe, et il ne doit rien decouper. */
  const recherche = codeSeul(lire('src/lib/crmImmoRecherche.ts'));
  const debut = recherche.indexOf('export function valeurAffichee');
  assert.ok(debut > 0, 'valeurAffichee a disparu de crmImmoRecherche');
  const corps = recherche.slice(debut, recherche.indexOf('export function normaliser'));
  assert.ok(!/\.split\(/.test(corps), 'valeurAffichee decoupe une valeur');
  assert.ok(!/substring\(|substr\(|slice\(/.test(corps), 'valeurAffichee tronque une valeur');
});

test('C2 aucune migration ne decoupe ni ne renomme ces colonnes', () => {
  const dossier = new URL('../../supabase/migrations/', import.meta.url);
  for (const f of readdirSync(dossier).filter(x => x.endsWith('.sql'))) {
    const sql = codeSeul(readFileSync(new URL(f, dossier), 'utf8'));
    assert.ok(!/RENAME\s+COLUMN\s+(nom|prenom|locataire|proprietaire)\b/i.test(sql),
      `${f} renomme une des quatre cles historiques`);
    assert.ok(!/split_part\s*\(\s*(nom|locataire)/i.test(sql),
      `${f} decoupe un nom en SQL`);
  }
});

test('C3 l UPDATE ne porte PAS les quatre colonnes historiques', () => {
  /*
   * LA REGLE DE DAVID : << ouverture puis sauvegarde sans modification = donnees
   * STRICTEMENT inchangees >>.
   *
   * La garde du bouton Enregistrer ne protege que le cas ou RIEN n'a bouge. Des que
   * l'utilisateur corrige un telephone, l'UPDATE part — et s'il portait encore ces
   * quatre colonnes, il y graverait la valeur PREREMPLIE du champ unique, promouvant une
   * composition au rang de donnee saisie, sur la totalite du parc et sans que l'ecran
   * n'en montre rien.
   */
  const code = codeSeul(lire('src/pages/admin/views/crm-immo/useCrmImmoDossiers.ts'));
  for (const cle of ['nom', 'prenom', 'locataire', 'proprietaire']) {
    assert.match(code, new RegExp('delete \\(ligne as \\{ ' + cle + '\\?: unknown \\}\\)\\.' + cle),
      `l UPDATE reecrit encore la colonne historique ${cle}`);
  }
  /* La canonique, elle, DOIT partir : c'est la source de verite du nom. */
  assert.ok(!/delete \(ligne as \{ nom_complet_/.test(code),
    'la canonique est exclue de l UPDATE : le nom ne pourrait plus etre corrige');
});

test('C4 la CREATION recopie la canonique verbatim, et ne remplit pas les prenoms', () => {
  /* `nom` est NOT NULL avec CHECK (btrim(nom) <> '') : on ne peut pas creer sans lui. La
     recopie verbatim est la seule issue qui ne decoupe rien. */
  const code = codeSeul(lire('src/pages/admin/views/crm-immo/useCrmImmoDossiers.ts'));
  assert.match(code, /nom: s\.nom_complet_locataire\.trim\(\)/,
    'la creation ne recopie plus la canonique dans `nom`');
  assert.match(code, /locataire: vide\(s\.nom_complet_proprietaire\)/,
    'la creation ne recopie plus la canonique du proprietaire');
  assert.match(code, /prenom: null/, 'la creation invente un prenom');
  assert.match(code, /proprietaire: null/, 'la creation invente un prenom de proprietaire');
});

// ===================== D. LE FORMULAIRE =====================

test('D1 un seul champ de nom par personne, et les quatre cles ont quitte le formulaire', () => {
  const cles = CHAMPS_DOSSIER.map(c => c.cle as string);
  assert.ok(cles.includes('nom_complet_locataire'));
  assert.ok(cles.includes('nom_complet_proprietaire'));
  for (const partie of ['nom', 'prenom', 'locataire', 'proprietaire']) {
    assert.ok(!cles.includes(partie),
      `${partie} est revenu dans le formulaire : le nom se saisirait deux fois`);
  }
});

test('D2 SAISIE_VIDE et la validation suivent le champ unique', () => {
  assert.equal(SAISIE_VIDE.nom_complet_locataire, '');
  assert.equal(SAISIE_VIDE.nom_complet_proprietaire, '');
  /* Les quatre anciennes restent dans la saisie : c'est ce qui preserve l'aller-retour. */
  for (const cle of ['nom', 'prenom', 'locataire', 'proprietaire'] as const) {
    assert.equal(SAISIE_VIDE[cle], '', `${cle} a quitte SaisieDossier : l aller-retour la perdrait`);
  }
  /* La validation porte sur la CANONIQUE. Valider `nom` griserait Enregistrer en
     permanence, sans rien expliquer a l'ecran. */
  assert.match(problemeDeSaisie(SAISIE_VIDE), /locataire est obligatoire/);
  assert.equal(problemeDeSaisie({ ...SAISIE_VIDE, nom_complet_locataire: 'Dupont Jean' }), '');
  /* Et un `nom` rempli ne suffit PLUS : sinon la canonique pourrait rester vide. */
  assert.notEqual(problemeDeSaisie({ ...SAISIE_VIDE, nom: 'Dupont' }), '');
});

test('D3 la garde de modification est branchee sur les DEUX boutons d enregistrement', () => {
  /* Sans elle, une sauvegarde a blanc reecrirait la ligne entiere. Le drapeau `modifie`
     existait depuis le 23/10 mais n'etait consomme que par le garde-fou de fermeture. */
  const dossierModal = codeSeul(lire('src/pages/admin/views/crm-immo/CrmImmoDossierModal.tsx'));
  assert.match(dossierModal, /disabled=\{enCours \|\| probleme !== '' \|\| \(dossier !== null && dossier !== undefined && !modifie\)\}/,
    'la garde a disparu du bouton de la modale Dossier');
  const detailsModal = codeSeul(lire('src/pages/admin/views/crm-immo/CrmImmoDetailsModal.tsx'));
  assert.match(detailsModal, /disabled=\{enCours \|\| probleme !== '' \|\| !modifie\}/,
    'la garde a disparu du bouton de la modale Details');
});

// ===================== E. LA MIGRATION =====================

test('E1 la migration ajoute DEUX colonnes nullables, sans aucune contrainte', () => {
  const dossier = new URL('../../supabase/migrations/', import.meta.url);
  const nom = readdirSync(dossier).find(f => f.includes('crm_immo_nom_complet'));
  assert.ok(nom, 'la migration du nom complet a disparu');
  /*
   * LE GARDE-FOU DU GARDE-FOU, quatrieme fois dans ce dossier.
   *
   * Ce releve cherche les mots NOT NULL et CHECK. Or la migration les ECRIT en prose,
   * dans ses commentaires d'en-tete (en `--`) et surtout dans le TEXTE de ses
   * `comment on column`, qui expliquent justement pourquoi ces contraintes sont
   * absentes. Sans retirer les commentaires SQL ET les chaines litterales, le releve
   * rougit sur sa propre documentation.
   */
  const brut = readFileSync(new URL(nom, dossier), 'utf8');
  const sql = brut
    .replace(/^\s*--.*$/gm, '')      /* les commentaires SQL */
    .replace(/'(?:[^']|'')*'/g, "''");  /* les chaines litterales, dont les COMMENT */

  for (const col of ['nom_complet_locataire', 'nom_complet_proprietaire']) {
    assert.match(sql, new RegExp('add column if not exists ' + col + '\\s+text', 'i'),
      `${col} n est plus ajoutee en text`);
  }
  /*
   * NI NOT NULL NI CHECK, ET C EST MESURE, PAS SUPPOSE.
   *
   * Une canonique NOT NULL ferait lever 23502 a la restauration d une sauvegarde
   * ANTERIEURE a cette migration : crm_immo_restaurer_lot derive ses colonnes de la
   * PREMIERE LIGNE du lot, donc une colonne absente de ce lot n entre ni dans l INSERT ni
   * dans le ON CONFLICT DO UPDATE SET.
   */
  assert.ok(!/not\s+null/i.test(sql), 'la migration impose un NOT NULL : la restauration leverait 23502');
  assert.ok(!/\bcheck\s*\(/i.test(sql), 'la migration impose un CHECK');
  assert.ok(!/create\s+(unique\s+)?index/i.test(sql), 'la migration cree un index');
  assert.ok(!/create\s+policy|alter\s+policy|drop\s+policy/i.test(sql), 'la migration touche une policy');
  /* AUCUN BACKFILL : c est le choix de David. Les colonnes naissent nulles, et
     l affichage retombe sur la composition — donc l ecran est celui d avant. */
  assert.ok(!/^\s*update\s+/im.test(sql), 'la migration ecrit des donnees : le backfill avait ete ecarte');
  /* Et les deux commentaires de colonne, qui portent la regle en base. */
  for (const col of ['nom_complet_locataire', 'nom_complet_proprietaire']) {
    assert.match(brut, new RegExp('comment on column public\\.crm_immo_dossiers\\.' + col),
      `${col} n a pas de COMMENT : la regle ne vit plus qu en TypeScript`);
  }
});

// ===================== F. LE PIEGE MUET DU SELECT =====================

test('F1 tout champ lu par la derivation figure dans le select de la cloche', () => {
  /*
   * LE DEFAUT LE PLUS DIFFICILE A VOIR DE CE CHANTIER, et il ne leve AUCUNE erreur.
   *
   * useCrmImmoAlertes liste ses colonnes EXPLICITEMENT, et DossierPourAlertes declare
   * presque tout en optionnel — il doit le faire, puisque les canoniques sont nulles sur
   * tout le stock d'avant la migration. Oublier une colonne ici ne casse donc rien : la
   * valeur arrive `undefined`, la precedence retombe sur la composition, et la cloche
   * affiche l'ANCIEN nom pour toujours. C'est ce que `date_entree` a vecu le 22/10/2026.
   *
   * Ce releve ne verifie pas une liste figee — il DERIVE les champs reellement lus depuis
   * le code de la derivation, et exige que chacun soit demande. Ajouter demain une lecture
   * sans l'ajouter au select fera donc rougir, sans que personne ait a y penser.
   */
  const hook = codeSeul(lire('src/pages/admin/views/crm-immo/useCrmImmoAlertes.ts'));
  const m = /const CHAMPS_DOSSIER =([\s\S]*?);/.exec(hook);
  assert.ok(m, 'la liste de champs de la cloche a disparu');
  const demandes = new Set(
    [...m[1].matchAll(/'([^']*)'/g)].flatMap(x => x[1].split(',')).map(x => x.trim()).filter(Boolean),
  );

  /*
   * Les champs que la DERIVATION lit reellement SUR SON DOSSIER.
   *
   * On INTERSECTE deux sources, et c'est necessaire : un simple balayage de `d.<champ>`
   * sur le fichier attrape aussi les autres variables nommees `d` — notamment l'objet de
   * date de lireJour, dont on lit `d.mois`. Le releve rougissait alors en reclamant une
   * colonne `mois` qui n'existe pas. L'intersection avec les champs DECLARES de
   * DossierPourAlertes elimine ce bruit sans rien perdre : un vrai champ de dossier lu
   * par la derivation est forcement declare dans ce type, sinon le typecheck refuserait.
   */
  const alertes = codeSeul(lire('src/lib/crmImmoAlertes.ts'));
  const bloc = alertes.slice(alertes.indexOf('export interface DossierPourAlertes'));
  const declares = new Set(
    [...bloc.slice(0, bloc.indexOf('\n}')).matchAll(/^\s+([a-z_]+)\??:/gm)].map(x => x[1]),
  );
  assert.ok(declares.size >= 8, 'DossierPourAlertes n a pas pu etre lu');
  const lus = new Set(
    [...alertes.matchAll(/\bd\.([a-z_]+)\b/g)].map(x => x[1]).filter(c => declares.has(c)),
  );
  assert.ok(lus.size >= 4, 'aucun champ de dossier lu : l extraction est cassee');
  /* `id` est lu sous un autre nom dans les alertes (dossier_id) : on l'exige a part. */
  assert.ok(demandes.has('id'), 'le select ne demande plus id');

  for (const champ of lus) {
    assert.ok(demandes.has(champ),
      `la derivation lit d.${champ} mais le select ne le demande pas : la cloche affichera `
      + 'une valeur perimee, EN SILENCE');
  }
  /* Et les deux canoniques y sont nommement, parce que c'est le cas qui a motive ce test. */
  assert.ok(demandes.has('nom_complet_locataire'), 'la canonique du locataire manque au select');
  assert.ok(demandes.has('nom_complet_proprietaire'), 'la canonique du proprietaire manque au select');
});

test('F2 le select ne demande AUCUNE colonne inexistante en base', () => {
  /*
   * Le defaut symetrique, et celui-la n'est pas muet du tout : PostgREST refuse la requete
   * entiere avec un 400, donc la cloche se vide. Il arriverait si on ajoutait un champ au
   * select avant que la migration ne soit appliquee.
   *
   * On verifie contre le MIROIR DU SCHEMA, c'est-a-dire DossierImmo — la seule liste du
   * depot qui pretende refleter les colonnes reelles.
   */
  const hook = codeSeul(lire('src/pages/admin/views/crm-immo/useCrmImmoAlertes.ts'));
  const m = /const CHAMPS_DOSSIER =([\s\S]*?);/.exec(hook);
  const demandes = [...m![1].matchAll(/'([^']*)'/g)]
    .flatMap(x => x[1].split(',')).map(x => x.trim()).filter(Boolean);

  const types = codeSeul(lire('src/pages/admin/views/crm-immo/crmImmoTypes.ts'));
  const bloc = types.slice(types.indexOf('export interface DossierImmo'));
  const corps = bloc.slice(0, bloc.indexOf('\n}'));
  const colonnes = new Set([...corps.matchAll(/^\s+([a-z_]+)\??:/gm)].map(x => x[1]));

  for (const champ of demandes) {
    assert.ok(colonnes.has(champ),
      `le select demande ${champ}, absent de DossierImmo : PostgREST rendrait un 400 et la `
      + 'cloche se viderait entierement');
  }
});

test('D4 les deux champs de nom prennent toute la largeur de la grille', () => {
  /*
   * Consequence directe du champ unique, pas une preference d'allure. Une demi-colonne
   * suffisait a << Nom locataire >> seul ; elle ne suffit plus a « de La Tour Marie
   * Anne », et c'est exactement le genre de valeur que ce chantier rend possible puisque
   * David a interdit toute decoupe. Un nom tronque a l'oeil ferait douter de ce qui est
   * enregistre.
   */
  const champs = codeSeul(lire('src/pages/admin/views/crm-immo/CrmImmoChampsDossier.tsx'));
  assert.match(champs, /cle === 'nom_complet_locataire'/,
    'le champ du locataire ne prend plus toute la largeur');
  assert.match(champs, /cle === 'nom_complet_proprietaire'/,
    'le champ du proprietaire ne prend plus toute la largeur');
  /* La grille reste a deux colonnes : on elargit DEUX champs, on ne met pas tout sur une
     colonne, ce qui allongerait la fiche de dix lignes. */
  assert.match(champs, /sm:grid-cols-2/, 'la grille a deux colonnes a disparu');
});
