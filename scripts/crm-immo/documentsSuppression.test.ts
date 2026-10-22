/**
 * Tests de LA SUPPRESSION D'UN DOSSIER CLIENT ET DE SES DOCUMENTS.
 * Lancer :  npx tsx scripts/crm-immo/documentsSuppression.test.ts
 *
 * ---------- CE QUE DAVID A DEMANDE DE PROUVER ----------
 *
 * << Vérifie explicitement le scénario : suppression Storage réussit, puis suppression DB
 * du dossier échoue. Je ne veux pas laisser les métadonnées avec des chemins vers des
 * fichiers déjà détruits sans mécanisme de reprise. Ajoute un test qui force l'échec
 * après le nettoyage Storage pour prouver le comportement. >>
 *
 * ---------- POURQUOI CE TEST PEUT EXISTER ----------
 *
 * On ne peut pas casser Storage ou la base a volonte contre un vrai projet. Les quatre
 * operations de la sequence sont donc INJECTEES, et ce fichier les remplace par des
 * doubles qui echouent exactement ou on le decide. Ce n'est pas une lecture de source :
 * la fonction tourne vraiment, et on mesure l'etat qu'elle laisse.
 *
 * ---------- ET CE QUE LE JOURNAL APPORTE ----------
 *
 * Chaque double inscrit son passage. On peut donc verifier l'ORDRE — et l'ordre est tout
 * le sujet : marquer AVANT de detruire est ce qui rend l'etat residuel visible. Un test
 * qui ne verifierait que le message final laisserait passer une sequence qui detruit
 * d'abord et marque ensuite.
 */
import {
  supprimerDossiersEtLeursDocuments,
  type OperationsSuppressionDossier,
} from '../../src/lib/crmImmoSuppressionDossier.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

interface Echecs {
  lister?: string;
  marquer?: string;
  demarquer?: string;
  retirer?: string;
  supprimer?: string;
  /** Combien de dossiers la base accepte de supprimer. Par defaut : tous. */
  supprimeesReelles?: number;
}

/** Un faux monde, qui garde la trace de ce qu'on lui a fait. */
function monde(chemins: string[], echecs: Echecs = {}) {
  const journal: string[] = [];
  /* L'etat des fiches, comme la base le verrait. */
  const statuts = new Map(chemins.map(c => [c, 'pret']));
  /* Les objets reellement presents dans le stockage. */
  const stockage = new Set(chemins);

  const ops: OperationsSuppressionDossier = {
    lister: async (ids) => {
      journal.push('lister:' + ids.length);
      if (echecs.lister) return { chemins: [], error: echecs.lister };
      return { chemins: [...statuts.keys()], error: null };
    },
    marquer: async (ids) => {
      journal.push('marquer:' + ids.length);
      if (echecs.marquer) return { error: echecs.marquer };
      for (const c of statuts.keys()) statuts.set(c, 'suppression');
      return { error: null };
    },
    demarquer: async (ids) => {
      journal.push('demarquer:' + ids.length);
      if (echecs.demarquer) return { error: echecs.demarquer };
      for (const c of statuts.keys()) if (statuts.get(c) === 'suppression') statuts.set(c, 'pret');
      return { error: null };
    },
    retirerDuStockage: async (cs) => {
      journal.push('retirer:' + cs.length);
      if (echecs.retirer) return { error: echecs.retirer };
      /* remove() est IDEMPOTENT : retirer un objet deja absent n'est pas une erreur.
         C'est ce qui fait converger une reprise. */
      for (const c of cs) stockage.delete(c);
      return { error: null };
    },
    supprimerDossiers: async (ids) => {
      journal.push('supprimer:' + ids.length);
      if (echecs.supprimer) return { supprimees: 0, error: echecs.supprimer };
      const n = echecs.supprimeesReelles ?? ids.length;
      if (n === ids.length) statuts.clear();            // la cascade emporte les fiches
      return { supprimees: n, error: null };
    },
  };
  return { ops, journal, statuts, stockage };
}

const DEUX = ['c/d/1.pdf', 'c/d/2.jpg'];

console.log('\n=== 1. LE CHEMIN NORMAL ===');
{
  const m = monde(DEUX);
  const r = await supprimerDossiersEtLeursDocuments(['dossier-1'], m.ops);
  t('la suppression reussit', r.error === null);
  t('et elle compte le dossier', r.supprimees === 1);
  t('aucune reprise n est necessaire', r.reprisePossible === false);
  t('le stockage est vide', m.stockage.size === 0);
  t('les fiches sont parties par la cascade', m.statuts.size === 0);
  /* L'ORDRE EST TOUT LE SUJET : marquer avant de detruire. */
  t('ordre : lister, marquer, retirer, supprimer',
    m.journal.join(' ') === 'lister:1 marquer:1 retirer:2 supprimer:1');
}

console.log('\n=== 2. LA LECTURE ECHOUE : RIEN N A BOUGE ===');
{
  const m = monde(DEUX, { lister: 'reseau coupe' });
  const r = await supprimerDossiersEtLeursDocuments(['d1'], m.ops);
  t('la suppression est refusee', r.error !== null);
  t('et le message dit que la suppression est annulee', /annul/i.test(r.error ?? ''));
  t('et il cite la cause', (r.error ?? '').includes('reseau coupe'));
  t('aucun dossier supprime', r.supprimees === 0);
  t('aucune reprise a faire', r.reprisePossible === false);
  t('le stockage est INTACT', m.stockage.size === 2);
  t('rien d autre n a ete tente', m.journal.join(' ') === 'lister:1');
}

console.log('\n=== 3. LE MARQUAGE ECHOUE : RIEN N EST DETRUIT ===');
{
  const m = monde(DEUX, { marquer: '42501' });
  const r = await supprimerDossiersEtLeursDocuments(['d1'], m.ops);
  t('la suppression est refusee', r.error !== null);
  t('et le message dit que rien n a ete modifie', /rien n’a été modifié|rien n.a ete modifie/i.test(r.error ?? ''));
  /* LE POINT : on ne touche pas aux octets si on n a pas su enregistrer l intention. */
  t('le stockage est INTACT', m.stockage.size === 2);
  t('retirer n a JAMAIS ete appele', !m.journal.some(x => x.startsWith('retirer')));
  t('et la suppression du dossier non plus', !m.journal.some(x => x.startsWith('supprimer')));
  t('les fiches sont restees pret', [...m.statuts.values()].every(s => s === 'pret'));
}

console.log('\n=== 4. LE RETRAIT STORAGE ECHOUE : ON REVIENT EN ARRIERE ===');
{
  const m = monde(DEUX, { retirer: 'stockage indisponible' });
  const r = await supprimerDossiersEtLeursDocuments(['d1'], m.ops);
  t('la suppression est refusee', r.error !== null);
  t('et le message dit qu AUCUN fichier n a ete supprime', /aucun fichier n’a été supprimé|Aucun fichier/i.test(r.error ?? ''));
  t('et il explique pourquoi on annule', /abandonner/i.test(r.error ?? ''));
  t('le stockage est intact', m.stockage.size === 2);
  t('le dossier n a pas ete supprime', !m.journal.some(x => x.startsWith('supprimer')));
  /* COMPENSATION : rien n a ete detruit, donc rien ne doit rester marque. */
  t('les fiches sont REVENUES a pret', [...m.statuts.values()].every(s => s === 'pret'));
  t('demarquer a bien ete appele', m.journal.some(x => x.startsWith('demarquer')));
  t('aucune reprise n est necessaire', r.reprisePossible === false);
}

console.log('\n=== 4 bis. LE RETRAIT ECHOUE ET LE RETOUR AUSSI ===');
{
  const m = monde(DEUX, { retirer: 'stockage indisponible', demarquer: 'reseau coupe' });
  const r = await supprimerDossiersEtLeursDocuments(['d1'], m.ops);
  t('la suppression est refusee', r.error !== null);
  t('le message dit toujours qu aucun fichier n a ete supprime', /aucun fichier/i.test(r.error ?? ''));
  /* Les fiches restent marquees a tort : c est visible, et une reprise remet en ordre. */
  t('mais il SIGNALE que les fiches sont restees marquees', /marqués|marques/i.test(r.error ?? ''));
  t('et il invite a reessayer', /réessayez|reessayez/i.test(r.error ?? ''));
  t('une reprise est annoncee', r.reprisePossible === true);
  t('le stockage est intact', m.stockage.size === 2);
}

console.log('\n=== 5. LE SCENARIO DE DAVID : STORAGE OK, PUIS LA BASE ECHOUE ===');
{
  const m = monde(DEUX, { supprimer: 'deadlock detected' });
  const r = await supprimerDossiersEtLeursDocuments(['d1'], m.ops);

  /* LES FICHIERS SONT REELLEMENT PARTIS. C est le fait brut dont tout decoule. */
  t('les fichiers ont bien ete retires du stockage', m.stockage.size === 0);
  t('mais les fiches sont restees', m.statuts.size === 2);

  /* ET ELLES SONT MARQUEES : c est ce qui empeche de les prendre pour des documents
     sains dont le fichier aurait mysterieusement disparu. */
  t('et elles portent le statut suppression', [...m.statuts.values()].every(s => s === 'suppression'));

  t('la suppression est signalee en erreur', r.error !== null);
  t('le message dit que les fichiers SONT partis', /retirés du stockage|retires du stockage/i.test(r.error ?? ''));
  t('et que les documents sont marques suppression incomplete', /incompl/i.test(r.error ?? ''));
  t('et qu ils restent visibles', /visible/i.test(r.error ?? ''));
  t('et il invite explicitement a relancer', /relancez/i.test(r.error ?? ''));
  t('et il annonce que la reprise repart ou elle s est arretee', /arrêtée|arretee/i.test(r.error ?? ''));
  t('la cause technique est citee', (r.error ?? '').includes('deadlock detected'));
  t('AUCUNE disparition silencieuse : la reprise est annoncee', r.reprisePossible === true);
  t('aucun dossier compte comme supprime', r.supprimees === 0);
}

console.log('\n=== 5 bis. ET LA REPRISE ABOUTIT ===');
{
  /* On rejoue le scenario, puis on relance sans l echec : `remove` ne trouve plus rien,
     ce qui n est pas une erreur, et la suppression passe. */
  const m = monde(DEUX, { supprimer: 'deadlock detected' });
  await supprimerDossiersEtLeursDocuments(['d1'], m.ops);
  const avant = m.journal.length;

  /* La seconde tentative, dans le meme monde, sans l echec. Les fiches sont toujours la
     et le stockage est deja vide : exactement l etat laisse par la premiere. */
  const ops2: OperationsSuppressionDossier = {
    ...m.ops,
    supprimerDossiers: async (ids) => { m.journal.push('supprimer:' + ids.length); m.statuts.clear(); return { supprimees: ids.length, error: null }; },
  };
  const r2 = await supprimerDossiersEtLeursDocuments(['d1'], ops2);

  t('la reprise reussit', r2.error === null);
  t('le dossier est supprime', r2.supprimees === 1);
  t('plus rien a reprendre', r2.reprisePossible === false);
  t('les fiches sont parties', m.statuts.size === 0);
  t('et elle a bien retente le retrait (idempotent)',
    m.journal.slice(avant).some(x => x.startsWith('retirer')));
  t('le stockage est toujours vide, sans erreur', m.stockage.size === 0);
}

console.log('\n=== 6. LA BASE N EN SUPPRIME QU UNE PARTIE ===');
{
  const m = monde(DEUX, { supprimeesReelles: 1 });
  const r = await supprimerDossiersEtLeursDocuments(['d1', 'd2', 'd3'], m.ops);
  t('la suppression partielle est signalee', r.error !== null);
  t('et elle dit COMBIEN resistent', (r.error ?? '').includes('2 dossier'));
  t('et elle compte celle qui est passee', r.supprimees === 1);
  t('une reprise est annoncee', r.reprisePossible === true);
  /* Sans message d erreur de la base, la cause est le refus de droits. */
  t('la cause par defaut est nommee', /droits insuffisants/i.test(r.error ?? ''));
}

console.log('\n=== 7. UN DOSSIER SANS DOCUMENT ===');
{
  const m = monde([]);
  const r = await supprimerDossiersEtLeursDocuments(['d1'], m.ops);
  t('la suppression reussit', r.error === null && r.supprimees === 1);
  /* Rien a nettoyer, donc rien a marquer : on ne touche pas a ce qui n existe pas. */
  t('marquer n a PAS ete appele', !m.journal.some(x => x.startsWith('marquer')));
  t('retirer n a PAS ete appele', !m.journal.some(x => x.startsWith('retirer')));
  t('ordre : lister puis supprimer', m.journal.join(' ') === 'lister:1 supprimer:1');
}

console.log('\n=== 8. UN DOSSIER SANS DOCUMENT DONT LA SUPPRESSION ECHOUE ===');
{
  const m = monde([], { supprimer: '42501' });
  const r = await supprimerDossiersEtLeursDocuments(['d1'], m.ops);
  t('l echec est signale', r.error !== null);
  /* Aucun fichier n existait : il n y a rien a reprendre, et le dire serait trompeur. */
  t('et AUCUNE reprise n est annoncee', r.reprisePossible === false);
  t('aucun dossier supprime', r.supprimees === 0);
}

console.log('\n=== 9. LES BORNES ===');
{
  const m = monde(DEUX);
  const r = await supprimerDossiersEtLeursDocuments([], m.ops);
  t('une liste vide ne fait rien', r.error === null && r.supprimees === 0);
  t('et ne touche a rien', m.journal.length === 0 && m.stockage.size === 2);
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
