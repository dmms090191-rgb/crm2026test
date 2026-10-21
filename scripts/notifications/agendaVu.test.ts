/**
 * Tests du « DEJA VU » DES NOTIFICATIONS D'AGENDA.
 * Lancer :  npx tsx scripts/notifications/agendaVu.test.ts
 *
 * ---------- CE QUI EST EN JEU ----------
 *
 * Le « vu » des deux Agenda vivait dans le localStorage, avec une purge a 24 h : une
 * alerte vue redevenait neuve le lendemain, et restait neuve sur tout autre appareil.
 *
 * La correction ne peut pas etre une bascule generale. Le hook sert TROIS panels, et
 * seul celui de la Societe a un destinataire valide en base :
 *
 *   Societe   userId = un uuid Auth           -> destinataire valide
 *   Vendeur   userId = un identifiant vendeur -> pas un uuid Auth
 *   Client    userId = un EMAIL               -> ne peut pas etre un recipient_user_id
 *
 * Et en Visu, le panel Societe passe l'identifiant du compte CONNECTE. Persister la
 * ferait ecrire, dans la Societe visitee, des notifications dont Talvex — ou le
 * Groupe — serait declare destinataire. La RLS ne l'arreterait pas : super_admin a
 * FOR ALL sur la table.
 *
 * Ces tests couvrent les huit cas demandes par David, et verrouillent les appelants :
 * une persistance obtenue par oubli serait exactement le defaut qu'on cherche a eviter.
 */
import { readFileSync } from 'node:fs';
import {
  deciderPersistance, cleLocale, cleBase, cleBaseDepuisLigne,
  purgerParAge, DUREE_VIE_LOCALE_MS,
  type ContextePersistance, type Persistance,
} from '../../src/lib/agendaVu.ts';
import { construireLignes } from '../../src/lib/notificationHistory.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const lire = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
/** Le source debarrasse de ses commentaires : ils parlent tous de localStorage. */
const code = (p: string) => lire(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const CO = '87875350-40c8-4ee5-be3b-9398fa4106bf';
const US = '2ad8ffea-d971-472f-a594-cca646dc399a';

const base = (p: Partial<ContextePersistance> = {}): ContextePersistance => ({
  panel: 'societe', demandee: true, enVisu: false, companyId: CO, userId: US, ...p,
});
const estLocal = (d: Persistance, raison: string) => d.ou === 'local' && d.raison === raison;

console.log('\n=== 1. SOCIETE NORMALE HORS VISU : LA BASE ===');
{
  const d = deciderPersistance(base());
  t('la persistance est en BASE', d.ou === 'base');
  t('elle porte la Societe et l utilisateur exacts',
    d.ou === 'base' && d.companyId === CO && d.userId === US);

  /*
   * Le scenario 2 de David — « autre navigateur simule ». La decision ne lit RIEN de
   * local : elle ne depend que du contexte. Deux navigateurs, meme contexte, meme
   * decision, donc meme source de verite. Ce que la base garde, c'est le relevé SQL qui
   * le prouve ; ici on prouve qu'aucun etat de navigateur n'entre dans la decision.
   */
  const ailleurs = deciderPersistance(base());
  t('un autre navigateur rend la MEME decision',
    JSON.stringify(d) === JSON.stringify(ailleurs));
  t('la decision ne lit aucun stockage de navigateur',
    !/localStorage|sessionStorage|document|window/.test(code('../../src/lib/agendaVu.ts')));
}

console.log('\n=== 2. VENDEUR ET CLIENT : LOCALSTORAGE, INCHANGE ===');
{
  const v = deciderPersistance(base({ panel: 'vendeur' }));
  t('vendeur : localStorage', estLocal(v, 'panel-sans-destinataire'));
  const c = deciderPersistance(base({ panel: 'client', userId: 'jean@exemple.fr' }));
  t('client : localStorage', estLocal(c, 'panel-sans-destinataire'));

  /*
   * Le refus du panel est le PLUS FORT : rien ne le lève. Un Client dont on demanderait
   * la persistance, hors Visu, avec une identite complete, reste en localStorage —
   * parce que son userId est un email et ne peut pas etre un recipient_user_id.
   */
  t('vendeur : meme en demandant tout, c est non',
    estLocal(deciderPersistance({ panel: 'vendeur', demandee: true, enVisu: false, companyId: CO, userId: US }),
      'panel-sans-destinataire'));
  t('client : meme en demandant tout, c est non',
    estLocal(deciderPersistance({ panel: 'client', demandee: true, enVisu: false, companyId: CO, userId: US }),
      'panel-sans-destinataire'));
}

console.log('\n=== 3. VISU : JAMAIS D ECRITURE AU NOM DU VISITEUR ===');
{
  /*
   * Scenarios 5 et 6 de David : Talvex en Visu, et le Groupe en Visu. Les deux passent
   * par le MEME chemin — le hook ne sait pas QUI visite, seulement QUE c'est une Visu.
   * C'est volontaire : une regle qui distinguerait les deux aurait deux fois plus de
   * chances d'en rater une.
   */
  t('Talvex en Visu : localStorage', estLocal(deciderPersistance(base({ enVisu: true })), 'visu'));
  t('Groupe en Visu : localStorage', estLocal(deciderPersistance(base({ enVisu: true })), 'visu'));
  t('aucune Visu ne rend jamais une decision « base »',
    [true].every(v => deciderPersistance(base({ enVisu: v })).ou === 'local'));
}

console.log('\n=== 4. LE DEFAUT EST LE REFUS ===');
{
  t('sans demande explicite : localStorage',
    estLocal(deciderPersistance(base({ demandee: false })), 'persistance-non-demandee'));
  t('sans Societe : localStorage',
    estLocal(deciderPersistance(base({ companyId: null })), 'identite-incomplete'));
  t('sans utilisateur : localStorage',
    estLocal(deciderPersistance(base({ userId: null })), 'identite-incomplete'));
  t('Societe vide (chaine) : localStorage',
    estLocal(deciderPersistance(base({ companyId: '' })), 'identite-incomplete'));

  /* QUATRE conditions, toutes necessaires. On les retire une par une. */
  const conditions: Partial<ContextePersistance>[] = [
    { panel: 'vendeur' }, { demandee: false }, { enVisu: true }, { userId: null },
  ];
  t('il faut les quatre conditions reunies pour ecrire en base',
    conditions.every(c => deciderPersistance(base(c)).ou === 'local'));
}

console.log('\n=== 5. UN CLIC NE MARQUE QUE L ENTREE CONCERNEE ===');
{
  /*
   * Scenario 8 de David. Un MEME rendez-vous peut alerter deux fois, pour deux raisons
   * differentes : il commence (« starting »), ou il est passe sans etre traite
   * (« untreated »). Les deux doivent se marquer separement, sinon lire l'une ferait
   * disparaitre l'autre.
   */
  const r = 'rdv-1';
  t('les deux genres ont des cles LOCALES distinctes',
    cleLocale(r, 'starting') !== cleLocale(r, 'untreated'));
  t('les deux genres ont des cles BASE distinctes',
    cleBase(r, 'starting') !== cleBase(r, 'untreated'));
  t('deux rendez-vous differents ne se confondent pas',
    cleBase('a', 'starting') !== cleBase('b', 'starting'));

  /* Le genre absent vaut « starting » : c'est la forme historique de la cle locale. */
  t('sans genre, la cle locale est le rendez-vous nu', cleLocale(r) === r);
  t('sans genre, c est « starting » cote base', cleBase(r) === cleBase(r, 'starting'));

  /*
   * ET SURTOUT : la cle de base doit correspondre EXACTEMENT a ce que produit
   * l alimentation de l historique. Deux fabriques divergentes feraient que marquer vu
   * ecrirait une ligne, et que l alimentation en ecrirait une AUTRE — la notification
   * reviendrait a chaque chargement sans que rien ne signale l erreur.
   */
  for (const genre of ['starting', 'untreated'] as const) {
    for (const [cat, cle] of [['agenda', 'agenda'], ['equipe', 'equipe']] as const) {
      const ligne = construireLignes(
        { [cle]: [{ rdvId: r, leadName: 'Jean', appointmentUtc: '2026-10-20T14:00:00.000Z', type: genre }] },
        { companyId: CO, userId: US },
      )[0];
      t(`${cat}/${genre} : la cle du marquage est celle de l alimentation`,
        cleBaseDepuisLigne(ligne.source_id, ligne.occurrence) === cleBase(r, genre));
    }
  }
}

console.log('\n=== 6. LA PURGE LOCALE EST DELIBEREMENT INCHANGEE ===');
{
  /*
   * David : « VENDEUR : comportement actuel localStorage inchange ». La purge a 24 h est
   * ce qui fait revenir une alerte le lendemain — c'est bien le defaut — mais pour ces
   * deux panels il ne doit RIEN bouger. La correction leur est hors de portee : elle
   * passe par un destinataire en base, qu'ils n'ont pas.
   */
  const maintenant = 1_700_000_000_000;
  const avant24h = maintenant - DUREE_VIE_LOCALE_MS - 1;
  const recent = maintenant - 1000;
  const purge = purgerParAge({ vieux: avant24h, neuf: recent }, maintenant);
  t('la duree de vie locale est toujours 24 h', DUREE_VIE_LOCALE_MS === 24 * 60 * 60 * 1000);
  t('au-dela de 24 h, la cle est purgee', !('vieux' in purge));
  t('en deca, la cle est gardee', purge.neuf === recent);
  t('la purge ne modifie pas l original',
    Object.keys(purgerParAge({ a: avant24h }, maintenant)).length === 0);
}

console.log('\n=== 7. LES APPELANTS : AUCUN CHANGEMENT IMPLICITE ===');
{
  /*
   * La partie la plus importante. La decision est juste, mais elle ne sert a rien si un
   * appelant demande la persistance sans le vouloir. On verifie les TROIS appelants.
   */
  const client = code('../../src/pages/client/ClientDashboard.tsx');
  const vendeur = code('../../src/pages/vendor/VendorDashboard.tsx');
  const admin = code('../../src/pages/admin/AdminDashboard.tsx');

  const appel = (src: string) => {
    const i = src.indexOf('useAgendaNotifications(');
    return i < 0 ? '' : src.slice(i, src.indexOf(')', i) + 1);
  };

  t('le panel Client appelle bien le hook', appel(client) !== '');
  t('le panel Client ne demande RIEN', !/persistanceEnBase/.test(appel(client)));
  t('le panel Vendeur appelle bien le hook', appel(vendeur) !== '');
  t('le panel Vendeur ne demande RIEN', !/persistanceEnBase/.test(appel(vendeur)));

  t('le panel Societe demande la persistance', /persistanceEnBase:\s*true/.test(admin));
  t('le panel Societe exclut la Visu', /enVisu:\s*Boolean\(impersonatedAdmin\)/.test(admin));
  /* Le MEME objet sert aux deux Agenda : deux objets pourraient diverger. */
  t('les deux Agenda recoivent la meme decision',
    (admin.match(/useAgenda(Notifications|EquipeNotifications)\([^)]*persistanceAgenda/g) ?? []).length === 2);

  /*
   * Le piege a ne pas rater : ces deux hooks recoivent `adminAuthId`, le compte
   * CONNECTE, et non `effectiveAdminId`. C'est precisement pourquoi la Visu doit etre
   * exclue. Si quelqu'un passait un jour `effectiveAdminId`, ce test tomberait et
   * obligerait a rouvrir la question.
   */
  t('les deux Agenda recoivent toujours le compte CONNECTE',
    (admin.match(/useAgenda(Notifications\('admin', adminAuthId|EquipeNotifications\(adminAuthId)/g) ?? []).length === 2);
}

console.log('\n=== 8. LES HOOKS NE LISENT PLUS LE STOCKAGE EN DIRECT ===');
{
  const perso = code('../../src/hooks/useAgendaNotifications.ts');
  const equipe = code('../../src/hooks/useAgendaEquipeNotifications.ts');

  for (const [nom, src] of [['agenda perso', perso], ['agenda equipe', equipe]] as const) {
    t(`${nom} : plus aucun acces direct au localStorage`, !/localStorage/.test(src));
    t(`${nom} : la lecture passe par l adaptateur`, /estVu\(/.test(src));
    t(`${nom} : l ecriture passe par l adaptateur`, /\.marquer\(/.test(src));
    t(`${nom} : on attend que le « vu » soit charge`, /if \(!vuCourant\.prete\) return;/.test(src));
    t(`${nom} : on ne retire l entree que si l ecriture a mordu`, /if \(!ecrit\) return;/.test(src));
  }

  /* La cle de stockage NE CHANGE PAS : des « vu » existent deja chez les utilisateurs. */
  t('la cle du localStorage de l agenda perso est inchangee',
    perso.includes('`crm_seen_agenda_notifications_${role}_${userId}`'));
  t('la cle du localStorage de l agenda equipe est inchangee',
    equipe.includes("const STORAGE_PREFIX = 'crm_seen_agenda_equipe_notifications_admin_'"));

  /* L adaptateur ecrit en base par UPSERT, pas par UPDATE : une alerte « starting » ne
     vit que deux minutes, l alimentation peut ne pas etre encore passee. */
  const adaptateur = code('../../src/hooks/useAgendaVu.ts');
  t('l adaptateur ecrit par upsert, pas par update',
    /\.upsert\(/.test(adaptateur) && !/\.update\(/.test(adaptateur));
  t('l adaptateur verifie son ecriture',
    /\.select\(/.test(adaptateur) && /data\.length === 0/.test(adaptateur));
  t('l adaptateur reutilise la fabrique de l historique',
    /construireLignes\(/.test(adaptateur));
  t('une entree supprimee de l historique compte comme vue',
    /deleted_at\.not\.is\.null/.test(adaptateur));
  t('une erreur de lecture ne fait pas passer tout pour « jamais vu »',
    /if \(error\) \{[\s\S]{0,220}?return;/.test(adaptateur));

  /*
   * Deux details qui ne changent rien a ce qu'on VOIT, mais tout a la cadence de rendu
   * des trois panels — donc au « comportement inchange » promis au Vendeur et au Client.
   */
  for (const [nom, src] of [['agenda perso', perso], ['agenda equipe', equipe]] as const) {
    /* `markAsSeen` lit la liste par REFERENCE : la mettre dans les dependances ferait
       changer son identite a chaque evaluation, et avec elle celle de
       handleAgendaPersoClick et la cadence de rendu de la barre du haut. */
    t(`${nom} : markAsSeen ne depend pas de la liste des notifications`,
      /notifsRef\.current\.find\(/.test(src) && !/\}, \[userId, notifications\]\)/.test(src));
  }

  /* L'abonnement temps reel ne filtre que sur la Societe : il se reveille pour TOUTE
     ecriture dans l'historique, chats compris. Sans comparaison de contenu, chaque
     passage de l'alimentation ferait rerendre la barre du haut pour rien. */
  t('l adaptateur ne change d etat que si le « deja vu » a vraiment change',
    /setVuesEnBase\(prev => \{[\s\S]{0,200}?return prev;/.test(adaptateur));
}

console.log('\n=== 9. OUVRIR LA CLOCHE NE MARQUE TOUJOURS RIEN ===');
{
  /*
   * Scenario 7 de David. Le marquage de l'agenda part d'un CLIC sur une entree —
   * `onAgendaPersoEntryClick` / `onAgendaEquipeEntryClick` — jamais de l'ouverture.
   */
  const nav = code('../../src/pages/admin/dashboard/useAdminNavHandlers.ts');
  const shell = code('../../src/components/notifications/hub/NotifHubShell.tsx');
  const mobile = code('../../src/pages/admin/components/topbar/AdminMobileBellMenu.tsx');

  t('le marquage agenda part d un gestionnaire de CLIC',
    /handleAgendaPersoClick[\s\S]{0,200}markAgendaSeen\(/.test(nav)
    && /handleAgendaEquipeClick[\s\S]{0,200}markAgendaEquipeSeen\(/.test(nav));
  t('l enveloppe du hub ne marque rien', !/mark[A-Z]|marquer[A-Z(]/.test(shell));
  t('aucune bascule d ouverture ne marque un agenda',
    [...shell.matchAll(/setOpen\(prev[^\n]*/g), ...mobile.matchAll(/setOpen\(\(prev[^\n]*/g)]
      .every(m => !/Agenda|mark[A-Z]/.test(m[0])));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
