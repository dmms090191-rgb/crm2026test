/*
 * LA DIVERGENCE DE RESTAURATION, et l'avertissement qui la rend visible.
 *   node --import tsx --test scripts/crm-immo/restaurationNomComplet.test.ts
 *
 * ---------- LE DEFAUT QU'ON SIGNALE ----------
 *
 * `crm_immo_restaurer_lot` derive ses colonnes des cles de la PREMIERE LIGNE du lot —
 * `jsonb_object_keys(p_lignes -> 0)` — croisees avec le catalogue reel de la table. Une
 * colonne absente du lot n'entre donc NI dans l'INSERT NI dans le
 * `ON CONFLICT (id) DO UPDATE SET` : sur une ligne qui existe deja, elle GARDE sa valeur.
 *
 * Rejeu de cette derivation avec le jeu de cles d'AVANT le 27/10/2026 : 17 colonnes
 * retenues sur 18, la colonne recente etant absente des deux listes.
 *
 * Pour un nom complet, qui PRIME a l'affichage, cela donne un mensonge complet : les
 * quatre anciennes colonnes reviennent a leur valeur d'avant, la canonique garde le nom
 * NEUF, l'ecran affiche le NEUF, et le bilan annonce une restauration reussie.
 *
 * Ce releve ne peut pas executer une restauration — il est pur. Il verrouille la
 * DETECTION, c'est-a-dire la seule partie que l'interface controle.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  colonnesAbsentesDuLot, COLONNES_QUI_MASQUENT_UNE_RESTAURATION,
} from '../../src/pages/admin/views/sauvegarde/colonnesAbsentesDuLot.ts';

const lire = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const codeSeul = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ATTENDU = COLONNES_QUI_MASQUENT_UNE_RESTAURATION;

test('A1 un lot ANTERIEUR a la migration est signale', () => {
  /* La forme exacte d'un export d'avant le 28/10/2026 : les quatre anciennes colonnes,
     pas les canoniques. */
  const lot = {
    crm_immo_dossiers: [
      { id: 'd1', nom: 'Dupont', prenom: 'Jean', locataire: 'Cohen', proprietaire: 'Sarah' },
    ],
  };
  const m = colonnesAbsentesDuLot(lot, ATTENDU);
  assert.equal(m.length, 1);
  assert.equal(m[0].table, 'crm_immo_dossiers');
  assert.deepEqual(m[0].colonnes.sort(), ['nom_complet_locataire', 'nom_complet_proprietaire']);
});

test('A2 un lot POSTERIEUR ne declenche rien, meme avec des canoniques NULLES', () => {
  /*
   * LE CAS QUI COMPTE LE PLUS, et le plus facile a rater.
   *
   * David a choisi la garde de modification plutot qu'un backfill : tout le stock existant
   * a ses deux canoniques a NULL. Un export pris aujourd'hui porte donc les CLES avec la
   * valeur null. Si la detection regardait la VALEUR au lieu de la PRESENCE DE LA CLE,
   * elle crierait sur chaque sauvegarde normale — et l'avertissement, vu partout,
   * cesserait d'etre lu.
   *
   * La fonction SQL, elle, raisonne bien sur les CLES : jsonb_object_keys ne saute pas une
   * cle dont la valeur est null.
   */
  const lot = {
    crm_immo_dossiers: [
      {
        id: 'd1', nom: 'Dupont', prenom: 'Jean', locataire: 'Cohen', proprietaire: 'Sarah',
        nom_complet_locataire: null, nom_complet_proprietaire: null,
      },
    ],
  };
  assert.deepEqual(colonnesAbsentesDuLot(lot, ATTENDU), []);
});

test('A3 on n inspecte QUE la premiere ligne, comme le fait le SQL', () => {
  /*
   * Ce n'est pas un raccourci, c'est une FIDELITE. jsonb_object_keys(p_lignes -> 0) ne lit
   * que la ligne 0. Inspecter toutes les lignes donnerait une reponse plus genereuse que
   * la realite : l'avertissement se tairait alors que la restauration, elle, laisserait
   * bel et bien la colonne de cote.
   */
  const lot = {
    crm_immo_dossiers: [
      { id: 'd1', nom: 'Dupont' },
      { id: 'd2', nom: 'Perrin', nom_complet_locataire: 'Perrin Alice', nom_complet_proprietaire: 'X' },
    ],
  };
  const m = colonnesAbsentesDuLot(lot, ATTENDU);
  assert.equal(m.length, 1, 'la ligne 1 ne doit pas sauver le lot : le SQL ne la lit pas');
});

test('A4 une table absente, vide ou mal formee ne declenche AUCUN avertissement', () => {
  /* Pas de ligne a restaurer, donc pas de divergence possible. Crier ici inquieterait
     pour rien, et un avertissement qui crie pour rien n'est plus lu. */
  assert.deepEqual(colonnesAbsentesDuLot({}, ATTENDU), []);
  assert.deepEqual(colonnesAbsentesDuLot({ crm_immo_dossiers: [] }, ATTENDU), []);
  assert.deepEqual(colonnesAbsentesDuLot({ crm_immo_dossiers: [null] } as never, ATTENDU), []);
  assert.deepEqual(colonnesAbsentesDuLot({ crm_immo_dossiers: ['pas un objet'] }, ATTENDU), []);
  assert.deepEqual(colonnesAbsentesDuLot({ crm_immo_dossiers: [[1, 2]] }, ATTENDU), []);
  /* Et une valeur qui n'est pas un tableau du tout. */
  assert.deepEqual(colonnesAbsentesDuLot({ crm_immo_dossiers: 'pas un lot' } as never, ATTENDU), []);
});

test('A5 la liste des colonnes surveillees reste COURTE, et dit pourquoi', () => {
  /*
   * Toute colonne ajoutee apres un export est techniquement dans ce cas. La plupart ne
   * trompent personne : un telephone absent du lot reste celui d'aujourd'hui, et cela se
   * voit. Les canoniques sont le cas limite, parce qu'elles PRIMENT sur ce que la
   * restauration vient de remettre en place — l'ecran montre alors le contraire de ce qui
   * a ete fait.
   *
   * Si cette liste s'allonge sans discernement, l'avertissement s'affichera sur chaque
   * import et personne ne le lira plus.
   */
  const tables = Object.keys(ATTENDU);
  assert.deepEqual(tables, ['crm_immo_dossiers'],
    'une table a ete ajoutee a la surveillance : est-ce bien un cas de RENVERSEMENT ?');
  assert.deepEqual(ATTENDU['crm_immo_dossiers'].sort(),
    ['nom_complet_locataire', 'nom_complet_proprietaire']);
});

test('A6 l ecran de restauration appelle bien la detection', () => {
  /* Sans ce branchement, la fonction serait juste et muette — le pire des deux mondes. */
  const ecran = codeSeul(lire('src/pages/admin/views/sauvegarde/ImportPreview.tsx'));
  assert.match(ecran, /colonnesAbsentesDuLot\(data, COLONNES_QUI_MASQUENT_UNE_RESTAURATION\)/,
    "l'ecran de restauration ne calcule plus les colonnes absentes");
  assert.match(ecran, /manques\.length > 0/, "l'avertissement ne se rend plus");
  assert.match(ecran, /manques\.map/, 'le detail par table ne se rend plus');
});

test('A7 la fonction SQL derive TOUJOURS ses colonnes de la premiere ligne', () => {
  /*
   * Tout ce releve repose sur ce fait. Si une migration future figeait la liste des
   * colonnes dans la fonction, la detection deviendrait fausse — dans le sens rassurant,
   * donc le pire. Autant le verrouiller ici.
   */
  const dossier = new URL('../../supabase/migrations/', import.meta.url);
  const avecFonction = readdirSync(dossier)
    .filter(f => f.endsWith('.sql'))
    .map(f => readFileSync(new URL(f, dossier), 'utf8'))
    .filter(sql => /create\s+or\s+replace\s+function\s+public\.crm_immo_restaurer_lot/i.test(sql));
  assert.ok(avecFonction.length > 0, 'crm_immo_restaurer_lot a disparu des migrations');
  /* La DERNIERE definition est celle qui compte. */
  const derniere = avecFonction[avecFonction.length - 1];
  assert.match(derniere, /jsonb_object_keys\s*\(\s*p_lignes\s*->\s*0\s*\)/i,
    'la fonction ne derive plus ses colonnes de la premiere ligne : la detection est caduque');
  assert.match(derniere, /on\s+conflict\s*\(\s*id\s*\)\s*do\s+update/i,
    'la fonction ne fait plus d upsert : le raisonnement de ce releve ne tient plus');
});
