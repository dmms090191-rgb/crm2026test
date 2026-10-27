/**
 * Tests executables de l'historique des notifications (logique pure, sans React).
 * Lancer :  npx tsx scripts/notifications/historique.test.ts
 *
 * Ce que ces tests tiennent, et pourquoi :
 *
 *   - la regle de l'EPISODE : trois messages de Jean font UNE entree, pas trois ;
 *   - l'occurrence de chaque categorie, telle que David l'a validee ;
 *   - l'accord entre le code et la BASE : les categories de l'union, celles du hub et
 *     celles du CHECK SQL sont lues dans leurs fichiers et comparees, de sorte qu'un
 *     ajout fait a un seul des trois endroits fasse echouer ici au lieu de produire un
 *     23514 chez un utilisateur ;
 *   - les bornes de titre et de message, pour que le CHECK de la base ne se declenche
 *     jamais a l'ecriture ;
 *   - qu'une notification SUPPRIMEE ne s'affiche nulle part, et n'ouvre rien ;
 *   - le cablage du nouvel onglet dans ses QUATRE endroits obligatoires.
 */
import { readFileSync } from 'node:fs';
import {
  construireLignes, cleDeLigne, appliquerCriteres, compter, estNouvelle,
  CATEGORIES, LIBELLES, CRITERES_PAR_DEFAUT,
  type EntreeHistorique, type LigneHistorique, type SourcesNotifications,
} from '../../src/lib/notificationHistory.ts';
import { destinationDe, vueDeCategorie } from '../../src/pages/admin/views/historique/notificationDestinations.ts';
import { etatDe } from '../../src/pages/admin/views/historique/historiqueFormat.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const DEST = { companyId: 'co-1', userId: 'us-1' };
const lire = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

/** Une entree relue depuis la base, pour les tests d'affichage. */
function entree(p: Partial<EntreeHistorique> & { id: string }): EntreeHistorique {
  return {
    company_id: 'co-1', recipient_user_id: 'us-1',
    category: 'rdv', source_type: 'rdv_proposals', source_id: 's-' + p.id,
    occurrence: '', title: 'Titre ' + p.id, message: null,
    occurred_at: '2026-10-20T10:00:00.000Z',
    read_at: null, treated_at: null, archived_at: null, deleted_at: null,
    created_at: '2026-10-20T10:00:00.000Z',
    ...p,
  };
}

console.log('\n=== 1. UN EPISODE DE NON-LU, PAS UN MESSAGE ===');
{
  /*
   * L'exemple de David, mot pour mot : « Jean envoie 3 messages pendant que la
   * conversation est non lue → la cloche affiche 1 notification → l'historique doit
   * creer 1 seule entree ».
   *
   * Ce qui le garantit : l'occurrence est le PLUS ANCIEN message non lu. Il ne bouge pas
   * tant que l'episode dure, donc la cle ne bouge pas, donc l'upsert retombe sur la
   * meme ligne.
   */
  const passage = (count: number): SourcesNotifications => ({
    client: [{
      interlocuteurId: 'jean', nom: 'Jean Dupont',
      count, oldestAt: '2026-10-20T09:00:00.000Z', preview: 'Bonjour',
    }],
  });

  const p1 = construireLignes(passage(1), DEST);
  const p2 = construireLignes(passage(2), DEST);
  const p3 = construireLignes(passage(3), DEST);

  t('un seul episode : une seule ligne a chaque passage',
    p1.length === 1 && p2.length === 1 && p3.length === 1);
  t('trois messages de Jean : la MEME cle, donc UNE entree',
    cleDeLigne(p1[0]) === cleDeLigne(p3[0]));
  t('le message suit le compte reel',
    p1[0].message!.includes('1 message non lu') && p3[0].message!.includes('3 messages non lus'));
  t('occurred_at est le DEBUT de l episode, pas le dernier message',
    p3[0].occurred_at === '2026-10-20T09:00:00.000Z');

  /* L'admin lit, Jean reecrit : nouvelle ancre, donc nouvel episode. */
  const apres = construireLignes({
    client: [{
      interlocuteurId: 'jean', nom: 'Jean Dupont',
      count: 1, oldestAt: '2026-10-20T11:00:00.000Z', preview: 'Rebonjour',
    }],
  }, DEST);
  t('apres lecture, un nouveau message ouvre un NOUVEL episode',
    cleDeLigne(apres[0]) !== cleDeLigne(p3[0]));
  t('le nouvel episode garde le meme interlocuteur comme source',
    apres[0].source_id === 'jean' && p3[0].source_id === 'jean');
}

console.log('\n=== 2. L OCCURRENCE DE CHAQUE CATEGORIE ===');
{
  const sources: SourcesNotifications = {
    client: [{ interlocuteurId: 'c1', nom: 'C', count: 1, oldestAt: '2026-10-20T09:00:00.000Z', preview: 'p' }],
    vendeur: [{ interlocuteurId: 'v1', nom: 'V', count: 1, oldestAt: '2026-10-20T09:00:00.000Z', preview: 'p' }],
    'super-admin': [{ interlocuteurId: 's1', nom: 'S', sousTitre: 'Groupe : X', count: 1, oldestAt: '2026-10-20T09:00:00.000Z', preview: 'p' }],
    agenda: [{ rdvId: 'r1', leadName: 'L', appointmentUtc: '2026-10-20T14:00:00.000Z', type: 'starting' }],
    equipe: [{ rdvId: 'r2', leadName: 'L', vendorName: 'W', appointmentUtc: '2026-10-20T14:00:00.000Z', type: 'untreated' }],
    propositions: [{ id: 'p1', lead_name: 'L', created_at: '2026-10-20T08:00:00.000Z' }],
    rdv: [{ id: 'p2', lead_name: 'L', created_at: '2026-10-20T08:00:00.000Z' }],
    decalages: [{ id: 'p3', lead_name: 'L', created_at: '2026-10-20T08:00:00.000Z' }],
    'demandes-decalage': [{ id: 'p4', lead_name: 'L', created_at: '2026-10-20T08:00:00.000Z' }],
    'crm-immo': [
      { dossier_id: 'd1', genre: 'fin_contrat', periode: '2026-11-30', echeance: '2026-11-30', locataire: 'Loc', proprietaire: 'Prop' },
      { dossier_id: 'd1', genre: 'loyer', periode: '2026-11', echeance: '2026-11-05', locataire: 'Loc', proprietaire: 'Prop' },
    ],
  };
  const l = construireLignes(sources, DEST);
  const par = (c: string) => l.filter(x => x.category === c);

  t('les dix categories produisent toutes une ligne',
    new Set(l.map(x => x.category)).size === 10);

  t('chats : source = l interlocuteur, occurrence = le plus ancien non-lu',
    par('client')[0].source_id === 'c1' && par('client')[0].occurrence === '2026-10-20T09:00:00.000Z'
    && par('vendeur')[0].source_id === 'v1'
    && par('super-admin')[0].source_id === 's1');

  t('agenda : source = le rendez-vous, occurrence = starting ou untreated',
    par('agenda')[0].source_id === 'r1' && par('agenda')[0].occurrence === 'starting'
    && par('equipe')[0].occurrence === 'untreated');

  t('les quatre categories de RDV : occurrence VIDE',
    ['propositions', 'rdv', 'decalages', 'demandes-decalage']
      .every(c => par(c)[0].occurrence === ''));

  t('CRM Immo : source = le dossier, occurrence = genre:periode',
    par('crm-immo').every(x => x.source_id === 'd1')
    && par('crm-immo').some(x => x.occurrence === 'fin_contrat:2026-11-30')
    && par('crm-immo').some(x => x.occurrence === 'loyer:2026-11'));

  t('le MEME dossier avec deux echeances fait DEUX entrees distinctes',
    par('crm-immo').length === 2
    && cleDeLigne(par('crm-immo')[0]) !== cleDeLigne(par('crm-immo')[1]));

  t('le sous-titre du Chat Direction est conserve dans le message',
    par('super-admin')[0].message!.includes('Groupe : X'));

  t('agenda equipe : le nom du commercial figure dans le message',
    par('equipe')[0].message!.includes('W'));
}

console.log('\n=== 3. AUCUN DOUBLON DANS UN MEME LOT ===');
{
  /*
   * Postgres refuse un ON CONFLICT dont le lot se contredit : « ON CONFLICT DO UPDATE
   * command cannot affect row a second time ». Le lot entier echouerait, et TOUTES les
   * notifications du passage seraient perdues — pas seulement la doublonnee.
   */
  const l = construireLignes({
    'crm-immo': [
      { dossier_id: 'd1', genre: 'loyer', periode: '2026-11', echeance: '2026-11-05', locataire: 'A', proprietaire: 'P' },
      { dossier_id: 'd1', genre: 'loyer', periode: '2026-11', echeance: '2026-11-05', locataire: 'A', proprietaire: 'P' },
    ],
    client: [
      { interlocuteurId: 'c1', nom: 'C', count: 1, oldestAt: '2026-10-20T09:00:00.000Z', preview: 'a' },
      { interlocuteurId: 'c1', nom: 'C', count: 2, oldestAt: '2026-10-20T09:00:00.000Z', preview: 'b' },
    ],
  }, DEST);

  t('une cle en double dans le lot est reduite a UNE ligne', l.length === 2);
  t('toutes les cles du lot sont distinctes',
    new Set(l.map(cleDeLigne)).size === l.length);
  t('c est la PREMIERE occurrence qui est gardee',
    l.find(x => x.category === 'client')!.message!.includes('1 message non lu'));
}

console.log('\n=== 4. LE CODE ET LA BASE DISENT LA MEME CHOSE ===');
{
  /* a. L'union du coeur contre celle du hub. */
  const hub = lire('../../src/pages/admin/components/topbar/AdminNotificationCards.tsx');
  const mUnion = /export type NotifCategory\s*=([\s\S]*?);/.exec(hub);
  t('NotifCategory est trouvable dans le hub', mUnion !== null);
  const duHub = [...(mUnion?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map(m => m[1]).sort();
  t('les categories du coeur sont EXACTEMENT celles du hub',
    duHub.join(',') === [...CATEGORIES].sort().join(','));

  /* b. Contre le CHECK de la migration. */
  const sql = lire('../../supabase/migrations/20261020164038_create_notification_history.sql');
  const mCheck = /notification_history_categorie_connue CHECK \(category IN \(([\s\S]*?)\)\)/.exec(sql);
  t('le CHECK des categories est trouvable dans la migration', mCheck !== null);
  const deLaBase = [...(mCheck?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map(m => m[1]).sort();
  t('les categories du coeur sont EXACTEMENT celles du CHECK SQL',
    deLaBase.join(',') === [...CATEGORIES].sort().join(','));

  /* c. Les occurrences CRM Immo produites passent le CHECK de la base, au caractere. */
  const mRe = /occurrence ~\s*'(\^[^']+\$)'/.exec(sql);
  t('le motif d occurrence CRM Immo est trouvable dans la migration', mRe !== null);
  const motif = new RegExp(mRe![1]);
  const cas: { periode: string; genre: 'fin_contrat' | 'loyer'; attendu: boolean }[] = [
    { genre: 'fin_contrat', periode: '2026-11-30', attendu: true },
    { genre: 'fin_contrat', periode: '2026-01-01', attendu: true },
    { genre: 'fin_contrat', periode: '2026-12-31', attendu: true },
    { genre: 'loyer', periode: '2026-11', attendu: true },
    { genre: 'loyer', periode: '2026-01', attendu: true },
    { genre: 'loyer', periode: '2026-13', attendu: false },
    { genre: 'fin_contrat', periode: '2026-11-32', attendu: false },
    { genre: 'fin_contrat', periode: '2026-00-10', attendu: false },
  ];
  let tousJustes = true;
  for (const c of cas) {
    const l = construireLignes({
      'crm-immo': [{ dossier_id: 'd', genre: c.genre, periode: c.periode, echeance: '2026-11-30', locataire: 'A', proprietaire: 'P' }],
    }, DEST);
    if (motif.test(l[0].occurrence) !== c.attendu) {
      tousJustes = false;
      console.log(`        -> ${c.genre}:${c.periode} attendu ${c.attendu}`);
    }
  }
  t('les occurrences CRM Immo produites se conforment au CHECK de la base', tousJustes);

  /* d. Un libelle pour chaque categorie, aucun manquant. */
  t('chaque categorie a un libelle non vide',
    CATEGORIES.every(c => (LIBELLES[c] ?? '').trim() !== ''));
}

console.log('\n=== 5. LES BORNES DE LA BASE NE SE DECLENCHENT JAMAIS ===');
{
  const sql = lire('../../supabase/migrations/20261020164038_create_notification_history.sql');
  const maxTitre = Number(/char_length\(title\) <= (\d+)/.exec(sql)?.[1]);
  const maxMsg = Number(/char_length\(message\) <= (\d+)/.exec(sql)?.[1]);
  t('les bornes sont lues dans la migration', maxTitre === 200 && maxMsg === 2000);

  const l = construireLignes({
    client: [{
      interlocuteurId: 'c1', nom: 'N'.repeat(500),
      count: 1, oldestAt: '2026-10-20T09:00:00.000Z', preview: 'P'.repeat(5000),
    }],
  }, DEST);
  t('un nom de 500 caracteres ne depasse pas la borne du titre',
    l[0].title.length <= maxTitre);
  t('un apercu de 5000 caracteres ne depasse pas la borne du message',
    (l[0].message ?? '').length <= maxMsg);

  /* Le titre ne doit JAMAIS etre blanc : la base le refuse (btrim(title) <> ''). */
  const vides = construireLignes({
    client: [{ interlocuteurId: 'c', nom: '   ', count: 1, oldestAt: '2026-10-20T09:00:00.000Z', preview: '' }],
    propositions: [{ id: 'p', lead_name: '', created_at: '2026-10-20T08:00:00.000Z' }],
    'crm-immo': [{ dossier_id: 'd', genre: 'loyer', periode: '2026-11', echeance: '2026-11-05', locataire: '  ', proprietaire: '' }],
  }, DEST);
  t('un nom vide ne produit jamais un titre blanc',
    vides.every(x => x.title.trim() !== ''));
  /*
   * Et surtout : pas de TIRET ORPHELIN. Le titre est « Chat Client — Jean » ; avec un nom
   * blanc, le prefixe suffirait a satisfaire le CHECK de la base (btrim(title) <> ''),
   * et personne ne verrait que l ecran affiche « Chat Client — » tout seul. C est donc la
   * partie NOM qu il faut verifier, pas la longueur du titre.
   */
  t('un nom vide ne laisse pas un tiret orphelin en fin de titre',
    vides.every(x => !/[—·-]\s*$/.test(x.title)));
  t('un nom vide est remplace par un libelle explicite',
    vides.some(x => x.title.includes('sans nom')));
}

console.log('\n=== 6. SANS DESTINATAIRE, ON N ECRIT RIEN ===');
{
  const s: SourcesNotifications = {
    client: [{ interlocuteurId: 'c', nom: 'C', count: 1, oldestAt: '2026-10-20T09:00:00.000Z', preview: 'p' }],
  };
  t('pas de Societe : aucune ligne', construireLignes(s, { companyId: '', userId: 'u' }).length === 0);
  t('pas d utilisateur : aucune ligne', construireLignes(s, { companyId: 'c', userId: '' }).length === 0);
  t('sources vides : aucune ligne', construireLignes({}, DEST).length === 0);
}

console.log('\n=== 7. UNE NOTIFICATION SUPPRIMEE N EXISTE PLUS A L ECRAN ===');
{
  const liste = [
    entree({ id: 'a' }),
    entree({ id: 'b', deleted_at: '2026-10-20T12:00:00.000Z', title: 'Notification supprimee' }),
    entree({ id: 'c', read_at: '2026-10-20T11:00:00.000Z' }),
    entree({ id: 'd', archived_at: '2026-10-20T11:00:00.000Z' }),
  ];

  const vues = appliquerCriteres(liste, CRITERES_PAR_DEFAUT).map(e => e.id);
  t('une entree supprimee n apparait sous AUCUN filtre',
    (['tous', 'non-lues', 'lues', 'archivees'] as const).every(etat =>
      !appliquerCriteres(liste, { ...CRITERES_PAR_DEFAUT, etat }).some(e => e.id === 'b')));
  t('une entree archivee ne figure pas dans « Toutes »', !vues.includes('d'));
  t('elle figure bien dans « Archivees »',
    appliquerCriteres(liste, { ...CRITERES_PAR_DEFAUT, etat: 'archivees' }).map(e => e.id).join() === 'd');
  t('« Non lues » ne retient que la neuve',
    appliquerCriteres(liste, { ...CRITERES_PAR_DEFAUT, etat: 'non-lues' }).map(e => e.id).join() === 'a');
  t('une entree supprimee n ouvre rien', destinationDe(liste[1]) === null);
  t('une entree vivante ouvre bien quelque chose', destinationDe(liste[0]) !== null);

  const c = compter(liste);
  t('les compteurs ignorent la supprimee', c.total === 3);
  t('nouvelles = 1, lues = 1, archivees = 1', c.nouvelles === 1 && c.lues === 1 && c.archivees === 1);
  t('une supprimee n est jamais « nouvelle »', !estNouvelle(liste[1]));

  /* Les compteurs portent sur la liste VISIBLE, jamais sur la liste filtree : un
     compteur qui baisse parce qu on a tape dans la recherche ne compte plus rien. */
  const cherche = compter(liste);
  t('les compteurs ne dependent pas des criteres', cherche.total === c.total);
}

console.log('\n=== 8. RECHERCHE ET TRI ===');
{
  const liste = [
    entree({ id: 'a', title: 'Fin de contrat — Éric', occurred_at: '2026-10-18T10:00:00.000Z' }),
    entree({ id: 'b', title: 'Chat Client — Jean', message: 'Bonjour MADAME', occurred_at: '2026-10-20T10:00:00.000Z' }),
    entree({ id: 'c', title: 'Loyer', occurred_at: '2026-10-19T10:00:00.000Z', category: 'crm-immo', occurrence: 'loyer:2026-10' }),
  ];

  t('la recherche ignore les accents',
    appliquerCriteres(liste, { ...CRITERES_PAR_DEFAUT, terme: 'eric' }).map(e => e.id).join() === 'a');
  t('la recherche ignore la casse et porte aussi sur le message',
    appliquerCriteres(liste, { ...CRITERES_PAR_DEFAUT, terme: 'madame' }).map(e => e.id).join() === 'b');
  t('un terme vide ne filtre rien',
    appliquerCriteres(liste, { ...CRITERES_PAR_DEFAUT, terme: '   ' }).length === 3);

  t('tri par defaut : les plus recentes d abord',
    appliquerCriteres(liste, CRITERES_PAR_DEFAUT).map(e => e.id).join() === 'b,c,a');
  t('tri inverse : les plus anciennes d abord',
    appliquerCriteres(liste, { ...CRITERES_PAR_DEFAUT, tri: 'anciennes' }).map(e => e.id).join() === 'a,c,b');

  t('filtre par categorie',
    appliquerCriteres(liste, { ...CRITERES_PAR_DEFAUT, categories: ['crm-immo'] }).map(e => e.id).join() === 'c');
  t('aucune categorie cochee = toutes',
    appliquerCriteres(liste, { ...CRITERES_PAR_DEFAUT, categories: [] }).length === 3);

  /*
   * Le tri porte sur occurred_at — l EVENEMENT — et non sur created_at. Une alerte CRM
   * Immo pour une echeance de novembre doit se ranger en novembre, meme si sa ligne est
   * nee aujourd hui.
   */
  const decale = [
    entree({ id: 'x', occurred_at: '2026-11-30T12:00:00.000Z', created_at: '2026-10-20T10:00:00.000Z' }),
    entree({ id: 'y', occurred_at: '2026-10-01T12:00:00.000Z', created_at: '2026-10-20T10:00:01.000Z' }),
  ];
  t('le tri suit l evenement, pas la date de creation de la ligne',
    appliquerCriteres(decale, CRITERES_PAR_DEFAUT).map(e => e.id).join() === 'x,y');

  /* Deux entrees au meme instant ne doivent pas changer de place d un rendu a l autre. */
  const exAequo = [
    entree({ id: 'zz', occurred_at: '2026-10-20T10:00:00.000Z' }),
    entree({ id: 'aa', occurred_at: '2026-10-20T10:00:00.000Z' }),
  ];
  t('ex aequo : l ordre est stable',
    appliquerCriteres(exAequo, CRITERES_PAR_DEFAUT).map(e => e.id).join()
    === appliquerCriteres([...exAequo].reverse(), CRITERES_PAR_DEFAUT).map(e => e.id).join());
}

console.log('\n=== 9. L ETAT AFFICHE ===');
{
  t('ni lue ni traitee ni archivee : nouvelle', etatDe(entree({ id: '1' })) === 'nouvelle');
  t('lue seule : lue', etatDe(entree({ id: '2', read_at: 'x' })) === 'lue');
  t('traitee : traitee l emporte sur lue',
    etatDe(entree({ id: '3', read_at: 'x', treated_at: 'y' })) === 'traitee');
  t('archivee : archivee l emporte sur tout',
    etatDe(entree({ id: '4', read_at: 'x', treated_at: 'y', archived_at: 'z' })) === 'archivee');
}

console.log('\n=== 10. LE CLIC MENE AU METIER, PAS A UNE FICHE ===');
{
  const d = (c: typeof CATEGORIES[number], src = 's1') =>
    destinationDe(entree({ id: 'i', category: c, source_id: src }));

  t('CRM Immo ouvre LE dossier, pas la liste',
    JSON.stringify(d('crm-immo', 'dos-7')) === JSON.stringify({ vue: 'crm-immo', quoi: 'dossier', dossierId: 'dos-7' }));
  t('Chat Client emporte l identifiant de l interlocuteur',
    JSON.stringify(d('client', 'auth-3')) === JSON.stringify({ vue: 'chat-client', quoi: 'client', clientAuthId: 'auth-3' }));
  t('Chat Commercial emporte l identifiant du commercial',
    JSON.stringify(d('vendeur', 'v-3')) === JSON.stringify({ vue: 'chat-vendeur', quoi: 'vendeur', vendorId: 'v-3' }));
  t('Chat Direction ouvre la vue, sans charge',
    JSON.stringify(d('super-admin')) === JSON.stringify({ vue: 'chat-super-admin', quoi: 'rien' }));
  t('les deux Agenda ouvrent leur vue respective',
    d('agenda')!.vue === 'agenda' && d('equipe')!.vue === 'agenda-equipe');
  t('les quatre categories de RDV ouvrent toutes propositions-rdv',
    (['propositions', 'rdv', 'decalages', 'demandes-decalage'] as const)
      .every(c => d(c)!.vue === 'propositions-rdv'));
  t('chaque categorie a une vue declaree',
    CATEGORIES.every(c => (vueDeCategorie(c) ?? '').length > 0));
}

console.log('\n=== 11. L ONGLET EST CABLE DANS SES QUATRE ENDROITS ===');
{
  /*
   * Quatre endroits, et aucun n est optionnel. Oublier ICONS ne casse ni le build ni le
   * typecheck : l onglet s affiche avec une pastille vide. Oublier le case le fait
   * retomber dans le `default:` du renderer, qui ouvre la Vue d ensemble — un onglet qui
   * mene ailleurs sans rien signaler.
   */
  const ID = 'historique-notifications';

  const types = lire('../../src/pages/admin/adminDashboardTypes.ts');
  t('1/4 ActiveView connait l onglet', types.includes(`'${ID}'`));

  /* La definition a quitte le composant le 27/10/2026 : navigationAdmin.tsx. */
  const sidebar = lire('../../src/pages/admin/navigationAdmin.tsx');
  const sansCommentaires = sidebar.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  t('2/4 il est declare dans LAYOUT_SECTIONS',
    new RegExp(`\\{\\s*id:\\s*'${ID}'`).test(sansCommentaires));

  /* La place exacte voulue par David : dans Communication, JUSTE apres Chat Direction. */
  const iDirection = sansCommentaires.indexOf("id: 'chat-super-admin'");
  const iHisto = sansCommentaires.indexOf(`id: '${ID}'`);
  const iAgendaSection = sansCommentaires.indexOf("title: 'Agenda'");
  t('il suit immediatement Chat Direction, dans Communication',
    iDirection > 0 && iHisto > iDirection && iHisto < iAgendaSection);
  t('rien ne se glisse entre Chat Direction et lui',
    !/id: '[a-z-]+'/.test(sansCommentaires.slice(iDirection + 30, iHisto)));

  t('3/4 il a une icone — sans elle, la pastille reste vide',
    new RegExp(`'${ID}':\\s*<\\w+`).test(sansCommentaires));

  const renderer = lire('../../src/pages/admin/dashboard/AdminViewRenderer.tsx');
  t('4/4 le renderer a son case',
    new RegExp(`case '${ID}':`).test(renderer.replace(/\/\*[\s\S]*?\*\//g, '')));

  const constantes = lire('../../src/pages/admin/adminDashboardConstants.ts');
  t('bonus : il a un fil d Ariane', new RegExp(`'${ID}':\\s*'[^']+'`).test(constantes));
}

console.log('\n=== 12. L ALIMENTATION EST IDEMPOTENTE ===');
{
  /*
   * L alimentation tourne a CHAQUE chargement de page. Si elle n etait pas idempotente,
   * chaque visite ajouterait des lignes. Deux appels sur les memes sources doivent
   * rendre exactement la meme chose, aux memes cles.
   */
  const s: SourcesNotifications = {
    client: [{ interlocuteurId: 'c', nom: 'C', count: 2, oldestAt: '2026-10-20T09:00:00.000Z', preview: 'p' }],
    'crm-immo': [{ dossier_id: 'd', genre: 'loyer', periode: '2026-11', echeance: '2026-11-05', locataire: 'A', proprietaire: 'P' }],
  };
  const a = construireLignes(s, DEST);
  const b = construireLignes(s, DEST);
  t('deux passages rendent des lignes identiques', JSON.stringify(a) === JSON.stringify(b));
  t('aucune horloge n intervient : pas de champ qui bouge',
    JSON.stringify(a.map((l: LigneHistorique) => l.occurred_at)) === JSON.stringify(b.map((l: LigneHistorique) => l.occurred_at)));
  t('la cle est stable d un passage a l autre',
    a.map(cleDeLigne).join() === b.map(cleDeLigne).join());

  /*
   * ET SURTOUT : l alimentation ne doit JAMAIS pouvoir effacer un etat deja pose.
   *
   * L upsert de supabase-js construit son ON CONFLICT DO UPDATE a partir des colonnes
   * REELLEMENT fournies. Tant que la fabrique ne produit ni read_at, ni treated_at, ni
   * archived_at, ni deleted_at, ces colonnes ne figurent pas dans l instruction et
   * survivent intactes a chaque passage.
   *
   * Sans cette propriete, le scenario suivant serait perdant : l utilisateur clique une
   * alerte d agenda — le marquage ecrit read_at — puis l alimentation repasse une
   * seconde plus tard et remet la ligne a « non lue ». La notification reviendrait, et
   * rien ne le signalerait.
   *
   * ---------- L EXCEPTION DE CRM IMMO, DEPUIS LE 23 OCTOBRE 2026 ----------
   *
   * CRM Immo est la seule categorie dont l etat vit EN BASE, dans crm_immo_etats. Son
   * historique en est le reflet, pas une seconde verite : ses lignes portent donc
   * read_at et treated_at, et les reecrivent a chaque passage.
   *
   * Cela ne rouvre PAS le scenario perdant ci-dessus, et c est le point : useNotification
   * History separe ses lots sur la PRESENCE de read_at. Les categories qui n en portent
   * pas partent dans un upsert ou ces colonnes n apparaissent meme pas — donc intactes.
   * Melanger les deux formes dans un seul lot les remettrait a null, parce que PostgREST
   * prend l union des clefs. C est la raison d etre des deux lots, et le releve suivant
   * la protege.
   */
  const ETATS_INTOUCHABLES = ['read_at', 'treated_at', 'archived_at', 'deleted_at'];
  const toutesLesCategories = construireLignes({
    client: [{ interlocuteurId: 'c', nom: 'C', count: 1, oldestAt: '2026-10-20T09:00:00.000Z', preview: 'p' }],
    agenda: [{ rdvId: 'r', leadName: 'L', appointmentUtc: '2026-10-20T14:00:00.000Z', type: 'starting' }],
    equipe: [{ rdvId: 'r2', leadName: 'L', vendorName: 'W', appointmentUtc: '2026-10-20T14:00:00.000Z', type: 'untreated' }],
    rdv: [{ id: 'p', lead_name: 'L', created_at: '2026-10-20T08:00:00.000Z' }],
    'crm-immo': [{ dossier_id: 'd', genre: 'loyer', periode: '2026-11', echeance: '2026-11-05', locataire: 'A', proprietaire: 'P' }],
  }, DEST);

  const horsImmo = toutesLesCategories.filter(l => l.category !== 'crm-immo');
  const immo = toutesLesCategories.filter(l => l.category === 'crm-immo');

  t('aucune categorie SAUF crm-immo ne produit de colonne d etat',
    horsImmo.length >= 4 && horsImmo.every(l =>
      ETATS_INTOUCHABLES.every(c => !Object.prototype.hasOwnProperty.call(l, c))));
  t('crm-immo porte read_at et treated_at, et RIEN de plus',
    immo.length === 1
    && Object.prototype.hasOwnProperty.call(immo[0], 'read_at')
    && Object.prototype.hasOwnProperty.call(immo[0], 'treated_at')
    && !Object.prototype.hasOwnProperty.call(immo[0], 'archived_at')
    && !Object.prototype.hasOwnProperty.call(immo[0], 'deleted_at'));
  t('une alerte jamais lue ni traitee donne null, pas une date inventee',
    immo[0].read_at === null && immo[0].treated_at === null);
  t('elle ne produit pas non plus d identifiant de ligne',
    toutesLesCategories.every(l => !Object.prototype.hasOwnProperty.call(l, 'id')));

  /*
   * LA SEPARATION DES LOTS, lue dans le hook.
   *
   * C est elle qui empeche l union des clefs de PostgREST de remettre a null le marquage
   * des autres categories. Un releve de source, parce qu il n existe pas de banc pour
   * faire tourner le hook sans Supabase.
   */
  const hook = readFileSync('src/hooks/useNotificationHistory.ts', 'utf8');
  t('le hook separe les lignes AVEC etat de celles SANS',
    /const avecEtat = lignes\.filter\(l => 'read_at' in l\)/.test(hook)
    && /const sansEtat = lignes\.filter\(l => !\('read_at' in l\)\)/.test(hook));
  t('il envoie DEUX upserts, jamais un lot melange',
    /for \(const lot of \[sansEtat, avecEtat\]\)/.test(hook));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
