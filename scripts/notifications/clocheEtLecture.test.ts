/**
 * Tests de garde : CE QUI MARQUE LU, ET CE QUI NE DOIT PAS LE FAIRE.
 * Lancer :  npx tsx scripts/notifications/clocheEtLecture.test.ts
 *
 * ---------- LA REGLE TRANCHEE PAR DAVID ----------
 *
 *   « Je ne veux pas que 20 notifications passent en lues accidentellement juste
 *     parce que le menu s'est ouvert. »
 *
 * Donc : OUVRIR la cloche ne marque RIEN. Ouvrir une categorie dans la cloche ne marque
 * rien non plus. Seul le CLIC sur une notification la marque lue, fait baisser le
 * compteur, la retire de la cloche — et mene a la donnee metier.
 *
 * Ces tests lisent le code source et verifient les deux sens de la regle. Ils tiennent
 * aussi les deux defauts corriges le 20 octobre : CRM Immo qui ne marquait pas, et le
 * decalage qui effacait la reponse du client au passage.
 *
 * Pourquoi lire le source plutot que de monter React : la regle porte sur QUI APPELLE
 * QUOI. Un rendu ne la prouverait qu'au cas par cas, alors qu'une lecture du code couvre
 * les dix categories d'un coup et echoue a la premiere qui devie.
 */
import { readFileSync } from 'node:fs';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const lire = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

/**
 * Le source DEBARRASSE de ses commentaires.
 *
 * Indispensable : ces fichiers expliquent longuement pourquoi tel marquage existe ou a
 * ete retire. Chercher « reschedule_status: null » dans le source brut trouverait le
 * commentaire qui raconte sa suppression — un test qui echoue sur sa propre explication.
 */
function code(p: string): string {
  return lire(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

/** Le corps d'une fonction nommee, de sa declaration a la ligne de meme indentation. */
function corps(src: string, nom: string): string {
  const i = src.indexOf(nom);
  if (i < 0) return '';
  /* On s'arrete a la declaration suivante : suffisant ici, les gestionnaires se suivent. */
  const suite = src.slice(i);
  const fin = suite.slice(1).search(/\n {2}const handle|\n {2}const on|\n {2}return \{/);
  return fin < 0 ? suite : suite.slice(0, fin + 1);
}

const NAV = code('../../src/pages/admin/dashboard/useAdminNavHandlers.ts');
const PROP = code('../../src/pages/admin/dashboard/useAdminProposalNotifs.ts');
const DASH = code('../../src/pages/admin/AdminDashboard.tsx');
const SHELL = code('../../src/components/notifications/hub/NotifHubShell.tsx');
const MOBILE = code('../../src/pages/admin/components/topbar/AdminMobileBellMenu.tsx');

console.log('\n=== 1. OUVRIR LA CLOCHE NE MARQUE RIEN ===');
{
  /*
   * L'enveloppe du hub ne contient AUCUN marquage, d'aucune sorte. C'est la forme la
   * plus forte de la garantie : il n'y a rien a declencher par accident, et si quelqu'un
   * y ajoutait un marquage un jour, ce test tomberait avant la revue.
   */
  t('l enveloppe du hub ne contient aucun marquage',
    !/mark[A-Z]|marquer[A-Z(]/.test(SHELL));

  /* La bascule d'ouverture, dans les deux cloches : rien d'autre que de l'affichage. */
  const bascules = [...SHELL.matchAll(/setOpen\(prev[^\n]*/g), ...MOBILE.matchAll(/setOpen\(\(prev[^\n]*/g)]
    .map(m => m[0]);
  t('les bascules d ouverture sont bien trouvees', bascules.length >= 2);
  t('aucune bascule d ouverture ne marque quoi que ce soit',
    bascules.every(l => !/mark[A-Z]|marquer[A-Z(]|EntryClick|onSuperAdminClick/.test(l)));

  /* Ouvrir une CATEGORIE n'est pas davantage une lecture. */
  const categories = [...MOBILE.matchAll(/setCategory\([^)]*\)[^\n]*/g)].map(m => m[0]);
  t('ouvrir une categorie est bien trouve', categories.length > 0);
  t('ouvrir une categorie ne marque rien',
    categories.filter(l => !/setOpen\(false\)/.test(l))
      .every(l => !/mark[A-Z]|marquer[A-Z(]|EntryClick/.test(l)));
}

console.log('\n=== 2. LE CLIC, LUI, MARQUE LU — POUR LES DIX CATEGORIES ===');
{
  const attendus: { categorie: string; src: string; gestionnaire: string; marquage: RegExp }[] = [
    { categorie: 'client', src: NAV, gestionnaire: 'handleClientEntryClick', marquage: /markClientRead\(/ },
    { categorie: 'vendeur', src: NAV, gestionnaire: 'handleVendorEntryClick', marquage: /markVendorRead\(/ },
    { categorie: 'agenda', src: NAV, gestionnaire: 'handleAgendaPersoClick', marquage: /markAgendaSeen\(/ },
    { categorie: 'equipe', src: NAV, gestionnaire: 'handleAgendaEquipeClick', marquage: /markAgendaEquipeSeen\(/ },
    { categorie: 'propositions', src: PROP, gestionnaire: 'handleProposalEntryClick', marquage: /marquerVue\(/ },
    { categorie: 'rdv', src: PROP, gestionnaire: 'handleConfirmedEntryClick', marquage: /marquerVue\(/ },
    { categorie: 'decalages', src: PROP, gestionnaire: 'handleRescheduleEntryClick', marquage: /marquerVue\(/ },
    { categorie: 'demandes-decalage', src: PROP, gestionnaire: 'handleRescheduleRequestEntryClick', marquage: /marquerVue\(/ },
    { categorie: 'super-admin', src: DASH, gestionnaire: 'onSuperAdminClick', marquage: /markSuperAdminRead\(/ },
    /* CRM Immo etait la SEULE a ne pas marquer : la notification restait neuve apres
       avoir ete ouverte, et le compteur ne baissait pas. Corrige le 20 octobre. */
    { categorie: 'crm-immo', src: DASH, gestionnaire: 'onCrmImmoEntryClick', marquage: /marquerLue\(/ },
  ];

  t('les dix categories sont couvertes', attendus.length === 10);
  for (const a of attendus) {
    const c = corps(a.src, a.gestionnaire);
    t(`${a.categorie} : le gestionnaire existe`, c !== '');
    t(`${a.categorie} : le clic marque lu`, a.marquage.test(c));
  }

  /* CRM Immo recoit l ALERTE entiere : avec le seul dossier_id, on ne pourrait pas
     distinguer une fin de contrat d un loyer sur le meme dossier. */
  t('crm-immo : le clic transmet l alerte, pas seulement son dossier',
    /onCrmImmoEntryClick=\{\(alerte\)/.test(DASH));
  t('crm-immo : marquer lu ne marque pas TRAITEE au passage',
    !/marquerTraitee/.test(corps(DASH, 'onCrmImmoEntryClick')));
}

console.log('\n=== 3. LIRE UNE NOTIFICATION N EST PAS UN ACTE METIER ===');
{
  /*
   * handleRescheduleEntryClick posait `reschedule_status: null` en meme temps que
   * `seen_by_admin: true`. Lire la notification effacait donc la REPONSE du client —
   * accepte ou refuse — pour la seule raison que l admin avait clique.
   *
   * Et c etait inutile : les quatre requetes du hook filtrent toutes seen_by_admin.
   */
  t('aucun gestionnaire de notification n efface reschedule_status',
    !/reschedule_status:\s*null/.test(PROP));
  t('le marquage ne touche QUE seen_by_admin',
    [...PROP.matchAll(/\.update\(\{([^}]*)\}\)/g)].every(m => /^\s*seen_by_admin:\s*true\s*$/.test(m[1])));

  /* Les deux autres endroits qui annulent reschedule_status sont des actes METIER
     legitimes — un vrai decalage, une vraie soumission — et doivent rester. */
  const rdvData = code('../../src/pages/admin/views/propositions-rdv/useAdminRdvData.ts');
  const soumission = code('../../src/pages/client/views/propositions-rdv/clientRdvSubmit.ts');
  t('les annulations LEGITIMES de reschedule_status sont intactes',
    /reschedule_status:\s*null/.test(rdvData) && /reschedule_status:\s*null/.test(soumission));
}

console.log('\n=== 4. UN MARQUAGE QUI NE SE VERIFIE PAS EST UN MARQUAGE QUI MENT ===');
{
  /*
   * Un UPDATE refuse par la RLS ne leve pas d erreur cote supabase-js : il rend
   * { error: null } et ZERO ligne. Les quatre gestionnaires de rendez-vous retiraient
   * l entree de l ecran sur la foi de ce silence — elle disparaissait, puis revenait au
   * rechargement.
   */
  const m = corps(PROP, 'async function marquerVue');
  t('marquerVue existe', m !== '');
  t('marquerVue demande les lignes ecrites', /\.select\(/.test(m));
  t('marquerVue regarde l erreur', /if \(error\)/.test(m));
  t('marquerVue compte les lignes rendues', /data\.length === 0|!data/.test(m));
  t('marquerVue rend un booleen, pas rien',
    /Promise<boolean>/.test(PROP) && /return true;/.test(m) && /return false;/.test(m));

  /* Et le retrait de l ecran est CONDITIONNE a ce booleen, dans les quatre. */
  const quatre = ['handleProposalEntryClick', 'handleConfirmedEntryClick',
                  'handleRescheduleEntryClick', 'handleRescheduleRequestEntryClick'];
  t('les quatre ne retirent l entree QUE si l ecriture a eu lieu',
    quatre.every(n => /if \(ecrit\)/.test(corps(PROP, n))));

  /* Meme exigence sur le marquage CRM Immo, deja en place depuis le 19 octobre. */
  const immo = code('../../src/pages/admin/views/crm-immo/useCrmImmoAlertes.ts');
  t('le marquage CRM Immo verifie aussi son ecriture',
    /\.select\(/.test(immo) && /rendues\.length === 0/.test(immo));
}

console.log('\n=== 5. L HISTORIQUE NE FAIT PAS BAISSER LE COMPTEUR DES AUTRES ===');
{
  /*
   * La RLS ne peut pas porter cette regle : en Visu, Talvex a le role super_admin, dont
   * la politique est FOR ALL sur toute la table. La base LAISSERAIT donc Talvex marquer
   * lu les notifications de l admin qu il regarde. C est le seul garde applicatif du
   * chantier, et il doit rester visible.
   */
  const hook = code('../../src/hooks/useNotificationHistory.ts');
  t('le hook accepte un mode consultation', /lectureSeule/.test(hook));
  t('l alimentation s abstient en consultation',
    /if \(lectureSeule[^)]*\) return;/.test(corps(hook, 'const alimenter')));
  t('toute ecriture passe par un point unique qui refuse en consultation',
    /if \(lectureSeule\)/.test(corps(hook, 'const ecrire')));

  const dash = code('../../src/pages/admin/AdminDashboard.tsx');
  t('Visu est bien declaree comme consultation',
    /lectureSeule:\s*Boolean\(impersonatedAdmin\)/.test(dash));

  /* Supprimer de l historique ne doit JAMAIS etre un DELETE : la ligne doit survivre
     pour que l unicite empeche l alimentation de la recreer. */
  t('supprimer pose une pierre tombale, ce n est pas un DELETE',
    /deleted_at:/.test(corps(hook, 'const supprimer'))
    && !/\.delete\(\)/.test(hook));
  t('supprimer purge le contenu lisible',
    /title: TITRE_SUPPRIMEE/.test(corps(hook, 'const supprimer'))
    && /message: null/.test(corps(hook, 'const supprimer')));
  t('supprimer ne touche pas a ce qui compose la cle',
    !/(category|source_id|occurrence):/.test(corps(hook, 'const supprimer')));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
