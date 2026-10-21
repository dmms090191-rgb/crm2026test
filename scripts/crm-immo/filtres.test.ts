/**
 * Tests des FILTRES RAPIDES du tableau CRM Immo.
 * Lancer :  npx tsx scripts/crm-immo/filtres.test.ts
 *
 * ---------- CE QUE CE FICHIER TIENT ----------
 *
 * Le 22 octobre 2026, David a demande de retirer deux filtres : « Avec loyer » et
 * « Sans échéance ». Ils n'ont pas ete masques mais SUPPRIMES, logique comprise — un
 * filtre qu'aucun bouton ne peut plus declencher est du code mort, et le code mort finit
 * par etre relu comme une fonctionnalite.
 *
 * Il reste donc deux boutons : « Tous » et « Fin proche ». Ce test les verrouille dans
 * les deux sens — ce qui doit etre la, et ce qui ne doit plus l'etre — et verifie que
 * le seul filtre restant fait toujours exactement son travail.
 *
 * La barre de filtres n'avait aucun test : la logique de `filtrerDossiers` n'etait
 * verifiee nulle part. Retirer du code sans filet, c'est exactement la facon de casser
 * ce qu'on ne regardait pas.
 */
import { readFileSync } from 'node:fs';
import { filtrerDossiers, preparerLignes, type FiltreDossiers } from '../../src/lib/crmImmoRecherche.ts';
import type { DossierImmo } from '../../src/pages/admin/views/crm-immo/crmImmoTypes.ts';
import { COLONNES_SYSTEME } from '../../src/pages/admin/views/crm-immo/crmImmoTypes.ts';
import { toutesLesColonnes, REGLAGE_VIDE } from '../../src/lib/crmImmoColonnes.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const lire = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const code = (p: string) => lire(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const AUJOURDHUI = '2026-10-22';

function dossier(p: Partial<DossierImmo> & { id: string }): DossierImmo {
  return {
    id: p.id, company_id: 'co-1', nom: 'Nom', prenom: 'Prenom',
    email: null, telephone: null, date_entree: null, date_fin_contrat: null,
    locataire: null, proprietaire: null, jour_encaissement: null, commentaire: null,
    extra: {}, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
    ...p,
  } as DossierImmo;
}

console.log('\n=== 1. LA BARRE NE PROPOSE PLUS QUE DEUX FILTRES ===');
{
  const src = code('../../src/pages/admin/views/crm-immo/CrmImmoFilters.tsx');
  const bloc = /const FILTRES[^=]*=\s*\[([\s\S]*?)\];/.exec(src);
  t('la liste des filtres est trouvable', bloc !== null);

  const valeurs = [...(bloc?.[1] ?? '').matchAll(/valeur: '([a-z-]+)'/g)].map(m => m[1]);
  t('exactement deux filtres', valeurs.length === 2);
  t('ce sont « Tous » et « Fin proche »', valeurs.join() === 'tous,fin-proche');

  const libelles = [...(bloc?.[1] ?? '').matchAll(/libelle: '([^']+)'/g)].map(m => m[1]);
  t('leurs libelles sont inchanges', libelles.join() === 'Tous,Fin proche');

  /* Dans les deux sens : ce qui ne doit PLUS exister. */
  t('« Avec loyer » a disparu de la barre', !/avec-loyer|Avec loyer/.test(src));
  t('« Sans échéance » a disparu de la barre', !/sans-echeance|Sans échéance/.test(src));
}

console.log('\n=== 2. LA LOGIQUE AUSSI A ETE RETIREE, PAS SEULEMENT LE BOUTON ===');
{
  const src = code('../../src/lib/crmImmoRecherche.ts');
  t('le type ne connait plus que deux valeurs',
    /export type FiltreDossiers = 'tous' \| 'fin-proche';/.test(src));
  t('aucune branche « avec-loyer » ne subsiste', !/avec-loyer/.test(src));
  t('aucune branche « sans-echeance » ne subsiste', !/sans-echeance/.test(src));
  /* Le filtre retire portait sur jour_encaissement : la colonne, elle, reste. */
  t('la colonne Encaissement loyer existe toujours',
    COLONNES_SYSTEME.some(c => c.cle === 'jour_encaissement'));
}

console.log('\n=== 3. « FIN PROCHE » FAIT TOUJOURS SON TRAVAIL ===');
{
  /*
   * Le preavis est de 30 jours. On borne des DEUX cotes : le jour pile, le jour d avant,
   * le jour d apres. Un test qui ne verifie qu un cas au milieu ne voit pas un decalage
   * d une journee.
   */
  const lot = [
    dossier({ id: 'passee', date_fin_contrat: '2026-09-30' }),
    dossier({ id: 'aujourdhui', date_fin_contrat: '2026-10-22' }),
    dossier({ id: 'dans-29j', date_fin_contrat: '2026-11-20' }),
    dossier({ id: 'dans-30j', date_fin_contrat: '2026-11-21' }),
    dossier({ id: 'dans-31j', date_fin_contrat: '2026-11-22' }),
    dossier({ id: 'sans-date', date_fin_contrat: null }),
  ];
  const ids = (f: FiltreDossiers) => filtrerDossiers(lot, f, AUJOURDHUI).map(d => d.id).join();

  t('« Tous » ne filtre rien', filtrerDossiers(lot, 'tous', AUJOURDHUI).length === lot.length);
  t('« Fin proche » prend une echeance deja passee', ids('fin-proche').includes('passee'));
  t('« Fin proche » prend le jour meme', ids('fin-proche').includes('aujourdhui'));
  t('« Fin proche » prend le 30e jour, la borne', ids('fin-proche').includes('dans-30j'));
  t('« Fin proche » laisse le 31e jour', !ids('fin-proche').includes('dans-31j'));
  t('« Fin proche » ignore un dossier sans echeance', !ids('fin-proche').includes('sans-date'));

  /* Une date illisible ne doit ni passer, ni faire tomber le tableau. */
  const abime = [dossier({ id: 'abime', date_fin_contrat: 'pas-une-date' })];
  t('une date illisible est ecartee sans casser',
    filtrerDossiers(abime, 'fin-proche', AUJOURDHUI).length === 0);
}

console.log('\n=== 4. LE PIPELINE COMPLET REPOND ENCORE ===');
{
  const colonnes = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage: REGLAGE_VIDE });
  const lot = [
    dossier({ id: 'a', nom: 'Dupont', date_fin_contrat: '2026-10-25' }),
    dossier({ id: 'b', nom: 'Martin', date_fin_contrat: '2027-06-01' }),
  ];
  const rendu = (filtre: FiltreDossiers, terme: string) =>
    preparerLignes({ dossiers: lot, terme, colonnes, triSur: null, sens: 'asc', filtre, aujourdhui: AUJOURDHUI })
      .map(d => d.id).join();

  t('sans filtre ni terme : tout sort', rendu('tous', '') === 'a,b');
  t('le filtre s applique avant la recherche', rendu('fin-proche', '') === 'a');
  t('la recherche porte toujours sur les valeurs', rendu('tous', 'martin') === 'b');
  t('filtre et recherche se combinent', rendu('fin-proche', 'martin') === '');
}

console.log('\n=== 5. LES LIBELLES DES QUATRE CHAMPS ===');
{
  /*
   * Quatre champs, deux personnes. Les deux dernieres CLES ne disent plus ce que leur
   * libelle affiche : c est assume, renommer ces colonnes exigerait une migration.
   * Ce test est la pour que personne ne << corrige >> l incoherence en renommant la base.
   */
  const attendus: [string, string][] = [
    ['nom', 'Nom locataire'],
    ['prenom', 'Prénom locataire'],
    ['locataire', 'Nom propriétaire'],
    ['proprietaire', 'Prénom propriétaire'],
  ];
  for (const [cle, libelle] of attendus) {
    const d = COLONNES_SYSTEME.find(c => c.cle === cle);
    t(`${cle} s affiche « ${libelle} »`, d?.libelle === libelle);
  }

  /* Et ces libelles arrivent bien jusqu aux colonnes que le tableau et les cartes lisent. */
  const colonnes = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage: REGLAGE_VIDE });
  for (const [cle, libelle] of attendus) {
    t(`le tableau et les cartes affichent « ${libelle} »`,
      colonnes.some(c => c.nom === libelle && c.cle === cle));
  }

  t('plus aucun libelle systeme ne dit « N/P »',
    COLONNES_SYSTEME.every(c => !c.libelle.includes('N/P')));
  t('plus aucun libelle systeme ne dit « Nom du client »',
    COLONNES_SYSTEME.every(c => c.libelle !== 'Nom du client'));
  t('les quatre libelles sont tous differents',
    new Set(attendus.map(a => a[1])).size === 4);
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
