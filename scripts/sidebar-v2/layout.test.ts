/**
 * Tests executables du moteur de sidebar V2 (logique pure, sans React).
 * Lancer :  npx tsx scripts/sidebar-v2/layout.test.ts
 */
import {
  defaultEntries, reconcileLayout, visibleEntries, toLayout,
  moveEntry, addSectionEntry, addDividerEntry, removeEntry, renameEntry, toggleHiddenEntry,
} from '../../src/lib/sidebarLayout.ts';
import type { LayoutEntry, LayoutDefaultSection, LayoutItem, LayoutSection } from '../../src/lib/sidebarLayout.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};
const ids = (l: LayoutEntry[]) => l.map(e => `${e.kind}:${e.id}`);
const has = (l: LayoutEntry[], k: string) => ids(l).includes(k);
const item = (l: LayoutEntry[], id: string) => l.find(e => e.kind === 'item' && e.id === id) as LayoutItem | undefined;

const GROUPE: LayoutDefaultSection[] = [
  { title: 'Principal', items: [{ id: 'overview', label: 'Dashboard' }, { id: 'info', label: 'Acces & securite' }] },
  { title: 'Societes', items: [{ id: 'statuts', label: 'Statuts' }, { id: 'admins', label: 'Gestion des societes' }] },
  { title: 'Contact', items: [{ id: 'chat-rois-admin', label: 'Chat Talvex' }, { id: 'chat-admin', label: 'Chat Societes' }] },
];
const SOCIETE: LayoutDefaultSection[] = [
  { title: 'CRM', items: [{ id: 'crm', label: 'CRM' }, { id: 'leads', label: 'Leads' }] },
  { title: 'Equipe', items: [{ id: 'vendeurs', label: 'Vendeurs' }] },
];

const G = defaultEntries(GROUPE);
const P = 'company_super_admin' as const;
const A = 'admin' as const;

console.log('\n=== 1. COMPARTIMENT VIDE CONSERVE ===');
{
  const d = addSectionEntry(G, 'MON COMPARTIMENT', 'sec_x');
  const r = reconcileLayout(G, toLayout(d, P, 'A'), P, 'A');
  t('compartiment vide survit a la reconciliation', has(r, 'section:sec_x'));
  t('compartiment vide est AFFICHE (aucun nettoyage)', has(visibleEntries(r), 'section:sec_x'));
  let e = r;
  for (let i = 0; i < 3; i++) e = reconcileLayout(G, toLayout(e, P, 'A'), P, 'A');
  t('toujours la apres 3 cycles Valider/F5', has(visibleEntries(e), 'section:sec_x'));
}

console.log('\n=== 2. SEPARATEUR FINAL CONSERVE ===');
{
  const d = addDividerEntry(G, 'div_x');
  const r = reconcileLayout(G, toLayout(d, P, 'A'), P, 'A');
  t('separateur en derniere position survit', has(r, 'divider:div_x'));
  t('separateur final est AFFICHE', has(visibleEntries(r), 'divider:div_x'));
  let e = r;
  for (let i = 0; i < 3; i++) e = reconcileLayout(G, toLayout(e, P, 'A'), P, 'A');
  t('toujours la apres 3 cycles', has(visibleEntries(e), 'divider:div_x'));

  const d2 = addDividerEntry(addSectionEntry(G, 'C', 'sec_y'), 'div_y');
  const r2 = visibleEntries(reconcileLayout(G, toLayout(d2, P, 'A'), P, 'A'));
  t('compartiment vide + separateur final ensemble', has(r2, 'section:sec_y') && has(r2, 'divider:div_y'));

  const solo = reconcileLayout(G, toLayout([{ kind: 'divider', id: 'div_solo' }], P, 'A'), P, 'A');
  t('separateur isole conserve', has(solo, 'divider:div_solo'));
}

console.log('\n=== 3. MASQUER / DEMASQUER SANS DEPLACEMENT ===');
{
  const i = G.findIndex(e => e.kind === 'item' && e.id === 'statuts');
  const masque = toggleHiddenEntry(G, i);
  t('masquer ne change pas la longueur', masque.length === G.length);
  t('masquer ne change pas l ordre', ids(masque).join() === ids(G).join());
  t('onglet masque absent du rendu', !has(visibleEntries(masque), 'item:statuts'));

  const r = reconcileLayout(G, toLayout(masque, P, 'A'), P, 'A');
  t('masquage survit au rechargement', item(r, 'statuts')?.hidden === true);
  t('position preservee apres rechargement', ids(r).join() === ids(G).join());

  const demasque = toggleHiddenEntry(r, i);
  t('demasquer remet EXACTEMENT au meme endroit', ids(demasque).join() === ids(G).join());
  t('demasquer rend a nouveau visible', has(visibleEntries(demasque), 'item:statuts'));

  const avecComp = addSectionEntry(masque, 'C', 'sec_z');
  t('compartiment intact malgre un onglet masque', has(visibleEntries(avecComp), 'section:sec_z'));

  const tousMasques = GROUPE[1].items.reduce(
    (acc, it) => toggleHiddenEntry(acc, acc.findIndex(e => e.kind === 'item' && e.id === it.id)), G);
  t('compartiment vide PAR MASQUAGE reste affiche', has(visibleEntries(tousMasques), 'section:sec_def_societes'));
}

console.log('\n=== 4. RENOMMAGE SANS CHANGEMENT D IDENTITE ===');
{
  const withSec = addSectionEntry(G, 'AVANT', 'sec_r');
  const si = withSec.findIndex(e => e.id === 'sec_r');
  const renamed = renameEntry(withSec, si, 'APRES');
  t('compartiment : id inchange', renamed[si].id === 'sec_r');
  t('compartiment : libelle mis a jour', (renamed[si] as LayoutSection).label === 'APRES');
  const r = reconcileLayout(G, toLayout(renamed, P, 'A'), P, 'A');
  t('renommage compartiment survit au rechargement',
    r.some(e => e.kind === 'section' && e.id === 'sec_r' && e.label === 'APRES'));

  const ii = G.findIndex(e => e.kind === 'item' && e.id === 'admins');
  const ren2 = renameEntry(G, ii, 'MES SOCIETES');
  t('onglet : id inchange', ren2[ii].id === 'admins');
  const r2 = reconcileLayout(G, toLayout(ren2, P, 'A'), P, 'A');
  t('renommage onglet survit au rechargement', item(r2, 'admins')?.label === 'MES SOCIETES');
  t('renommer deux fois garde le meme id',
    renameEntry(renameEntry(withSec, si, 'X'), si, 'Y')[si].id === 'sec_r');
}

console.log('\n=== 5. ONGLET AJOUTE DANS LES DEFAULTS — AUCUN RESET ===');
{
  const AVANT: LayoutDefaultSection[] = [
    { title: 'Principal', items: [{ id: 'overview', label: 'Dashboard' }, { id: 'info', label: 'Acces' }] },
    { title: 'Societes', items: [{ id: 'admins', label: 'Societes' }] },
  ];
  const APRES: LayoutDefaultSection[] = [
    { title: 'Principal', items: [{ id: 'overview', label: 'Dashboard' }, { id: 'info', label: 'Acces' }] },
    { title: 'Societes', items: [{ id: 'statuts', label: 'Statuts' }, { id: 'admins', label: 'Societes' }] },
  ];
  const oldDef = defaultEntries(AVANT);
  let perso = addSectionEntry(oldDef, 'MON COMP', 'sec_m');
  perso = addDividerEntry(perso, 'div_m');
  perso = renameEntry(perso, perso.findIndex(e => e.kind === 'item' && e.id === 'admins'), 'RENOMME');
  perso = toggleHiddenEntry(perso, perso.findIndex(e => e.kind === 'item' && e.id === 'info'));

  const r = reconcileLayout(defaultEntries(APRES), toLayout(perso, P, 'A'), P, 'A');
  t('compartiment personnalise CONSERVE', has(r, 'section:sec_m'));
  t('separateur personnalise CONSERVE', has(r, 'divider:div_m'));
  t('renommage CONSERVE', item(r, 'admins')?.label === 'RENOMME');
  t('masquage CONSERVE', item(r, 'info')?.hidden === true);
  t('le NOUVEL onglet apparait', has(r, 'item:statuts'));
  t('aucun onglet perdu', ['overview', 'info', 'statuts', 'admins'].every(id => has(r, 'item:' + id)));
}

console.log('\n=== 6. ONGLET RETIRE DES DEFAULTS — RIEN D AUTRE NE TOMBE ===');
{
  const APRES: LayoutDefaultSection[] = [
    { title: 'Principal', items: [{ id: 'overview', label: 'Dashboard' }] },
    { title: 'Societes', items: [{ id: 'admins', label: 'Societes' }] },
  ];
  let perso = addSectionEntry(G, 'MON COMP', 'sec_k');
  perso = addDividerEntry(perso, 'div_k');
  const r = reconcileLayout(defaultEntries(APRES), toLayout(perso, P, 'A'), P, 'A');
  t('compartiment conserve malgre un onglet supprime du code', has(r, 'section:sec_k'));
  t('separateur conserve', has(r, 'divider:div_k'));
  t('onglets disparus du code retires', !has(r, 'item:statuts') && !has(r, 'item:chat-admin'));
  t('onglets encore presents conserves', has(r, 'item:overview') && has(r, 'item:admins'));
}

console.log('\n=== 7. ISOLATION GROUPE A / GROUPE B ===');
{
  const confA = toLayout(addSectionEntry(G, 'COMP DE A', 'sec_a'), P, 'groupe-A');
  const confB = toLayout(addSectionEntry(G, 'COMP DE B', 'sec_b'), P, 'groupe-B');
  t('Groupe A voit sa config', has(reconcileLayout(G, confA, P, 'groupe-A'), 'section:sec_a'));
  const chezB = reconcileLayout(G, confA, P, 'groupe-B');
  t('Groupe B ne voit RIEN de A', !has(chezB, 'section:sec_a'));
  t('Groupe B recoit les defauts', ids(chezB).join() === ids(G).join());
  const a2 = reconcileLayout(G, confA, P, 'groupe-A');
  const b2 = reconcileLayout(G, confB, P, 'groupe-B');
  t('A et B coexistent sans se melanger',
    has(a2, 'section:sec_a') && !has(a2, 'section:sec_b') && has(b2, 'section:sec_b') && !has(b2, 'section:sec_a'));
}

console.log('\n=== 8. ISOLATION SOCIETE A / SOCIETE B (meme Groupe) ===');
{
  const S = defaultEntries(SOCIETE);
  const confSA = toLayout(addDividerEntry(addSectionEntry(S, 'COMP SA', 'sec_sa'), 'div_sa'), A, 'societe-A');
  t('Societe A voit sa config', has(reconcileLayout(S, confSA, A, 'societe-A'), 'section:sec_sa'));
  const chezSB = reconcileLayout(S, confSA, A, 'societe-B');
  t('Societe B ne voit RIEN de A', !has(chezSB, 'section:sec_sa') && !has(chezSB, 'divider:div_sa'));
  t('deux Societes du meme Groupe sont independantes', ids(chezSB).join() === ids(S).join());
  const croise = reconcileLayout(G, toLayout(addSectionEntry(G, 'X', 'sec_g'), P, 'entite-1'), A, 'entite-1');
  t('une config Groupe ne s applique pas au panel Societe', !has(croise, 'section:sec_g'));
}

console.log('\n=== 9. DEPLACEMENT, SUPPRESSION, DONNEES CORROMPUES ===');
{
  const withSec = addSectionEntry(G, 'C', 'sec_mv');
  const moved = moveEntry(withSec, withSec.length - 1, 0);
  t('deplacer en tete', ids(moved)[0] === 'section:sec_mv');
  t('deplacement survit au rechargement',
    ids(reconcileLayout(G, toLayout(moved, P, 'A'), P, 'A'))[0] === 'section:sec_mv');
  t('supprimer un compartiment', !has(removeEntry(moved, 0), 'section:sec_mv'));
  const itemIdx = G.findIndex(e => e.kind === 'item');
  t('un ONGLET ne peut pas etre supprime (on le masque)', removeEntry(G, itemIdx).length === G.length);

  t('config nulle -> defauts', ids(reconcileLayout(G, null, P, 'A')).join() === ids(G).join());
  t('mauvaise version -> defauts',
    ids(reconcileLayout(G, { v: 1, panel: P, entity: 'A', entries: [] } as never, P, 'A')).join() === ids(G).join());
  t('entries non tableau -> defauts',
    ids(reconcileLayout(G, { v: 2, panel: P, entity: 'A', entries: null } as never, P, 'A')).join() === ids(G).join());
  const doublons = toLayout([...G, ...G], P, 'A');
  const dedup = reconcileLayout(G, doublons, P, 'A');
  t('doublons elimines', dedup.length === G.length);
}

console.log('\n=== 10. ONGLETS PROTEGES (Talvex : dashboard, mon-compte, system) ===');
{
  const TALVEX: LayoutDefaultSection[] = [
    { title: 'Principal', items: [
      { id: 'dashboard', label: 'Dashboard' }, { id: 'mon-compte', label: 'Compte' }, { id: 'logo', label: 'Logo' }] },
    { title: 'Maintenance', items: [
      { id: 'system', label: 'Systeme' }, { id: 'tuto', label: 'Tuto' }] },
  ];
  const T = defaultEntries(TALVEX);
  const PROT = new Set(['dashboard', 'mon-compte', 'system']);

  for (const id of ['dashboard', 'mon-compte', 'system']) {
    const i = T.findIndex(e => e.kind === 'item' && e.id === id);
    t(`onglet protege ${id} : masquage REFUSE`, toggleHiddenEntry(T, i, PROT) === T);
  }
  for (const id of ['logo', 'tuto']) {
    const i = T.findIndex(e => e.kind === 'item' && e.id === id);
    const r = toggleHiddenEntry(T, i, PROT);
    t(`onglet normal ${id} : masquage autorise`, (r[i] as LayoutItem).hidden === true);
    t(`onglet normal ${id} : position inchangee`, ids(r).join() === ids(T).join());
  }
  const i0 = T.findIndex(e => e.kind === 'item' && e.id === 'dashboard');
  t('sans liste de protection, tout reste masquable',
    (toggleHiddenEntry(T, i0)[i0] as LayoutItem).hidden === true);

  // La protection ne doit pas empecher un compartiment de vivre sa vie.
  const avecComp = addSectionEntry(T, 'C', 'sec_p');
  t('compartiment conserve dans un panel a onglets proteges',
    has(reconcileLayout(T, toLayout(avecComp, 'super_admin', 'talvex'), 'super_admin', 'talvex'), 'section:sec_p'));
  t('isolation : la config Talvex ne fuit pas vers un autre compte',
    !has(reconcileLayout(T, toLayout(avecComp, 'super_admin', 'talvex'), 'super_admin', 'autre'), 'section:sec_p'));
}

// ---------------------------------------------------------------------------
// UN ONGLET AJOUTE AU CODE ARRIVE A SA PLACE DECLAREE, PAS EN FIN
// ---------------------------------------------------------------------------
{
  /*
   * Le defaut corrige le 20 octobre 2026 : tout onglet absent de la configuration
   * enregistree etait pousse a la FIN de la barre. Invisible pour qui n'avait jamais
   * reorganise — sa configuration EST celle du code. Mais des qu'une Societe avait
   * touche a l'ordre, le nouvel onglet atterrissait tout en bas, hors de son
   * compartiment : un onglet de Communication affiche sous l'Agenda.
   *
   * C'est exactement le piege rencontre sur DEFAULT_KEYS pour les cartes de
   * notification, et c'est celui qui attendait << Historique Notifications >>, declare
   * dans Communication juste apres Chat Direction.
   */
  const AVANT: LayoutDefaultSection[] = [
    { title: 'Principal', items: [{ id: 'dashboard', label: 'D' }, { id: 'boutique', label: 'B' }] },
    { title: 'Communication', items: [{ id: 'chat-client', label: 'CC' }, { id: 'chat-super-admin', label: 'CD' }] },
    { title: 'Agenda', items: [{ id: 'agenda', label: 'A' }] },
  ];
  const APRES: LayoutDefaultSection[] = [
    { title: 'Principal', items: [{ id: 'dashboard', label: 'D' }, { id: 'boutique', label: 'B' }] },
    { title: 'Communication', items: [
      { id: 'chat-client', label: 'CC' },
      { id: 'chat-super-admin', label: 'CD' },
      { id: 'historique-notifications', label: 'HN' },
    ] },
    { title: 'Agenda', items: [{ id: 'agenda', label: 'A' }] },
  ];

  const neufs = defaultEntries(APRES);
  const pos = (l: LayoutEntry[], id: string) => l.findIndex(e => e.kind === 'item' && e.id === id);

  // 1. Une Societe qui n'a RIEN reorganise.
  const r1 = reconcileLayout(neufs, toLayout(defaultEntries(AVANT), 'admin', 'soc1'), 'admin', 'soc1');
  t('onglet absent : insere JUSTE APRES chat-super-admin',
    pos(r1, 'historique-notifications') === pos(r1, 'chat-super-admin') + 1);
  t('onglet absent : il n atterrit PAS en fin',
    pos(r1, 'historique-notifications') < pos(r1, 'agenda'));

  // 2. Une Societe qui a REORGANISE : son ordre doit survivre intact.
  const base = defaultEntries(AVANT);
  const perso = moveEntry(base,
    base.findIndex(e => e.kind === 'item' && e.id === 'agenda'),
    base.findIndex(e => e.kind === 'item' && e.id === 'dashboard'));
  const avantIds = ids(perso);
  const r2 = reconcileLayout(neufs, toLayout(perso, 'admin', 'soc1'), 'admin', 'soc1');
  t('ordre personnalise : les anciens onglets gardent leur ordre relatif',
    ids(r2).filter(k => avantIds.includes(k)).join() === avantIds.join());
  t('ordre personnalise : le nouvel onglet suit toujours chat-super-admin',
    pos(r2, 'historique-notifications') === pos(r2, 'chat-super-admin') + 1);
  t('ordre personnalise : rien d autre n est ajoute ni retire',
    ids(r2).length === avantIds.length + 1);

  // 3. L'onglet DEJA present ne bouge pas, ou qu'il soit.
  const dejaLa = defaultEntries(APRES);
  const deplace = moveEntry(dejaLa,
    dejaLa.findIndex(e => e.kind === 'item' && e.id === 'historique-notifications'),
    dejaLa.findIndex(e => e.kind === 'item' && e.id === 'dashboard'));
  const r3 = reconcileLayout(neufs, toLayout(deplace, 'admin', 'soc1'), 'admin', 'soc1');
  t('onglet deja present : il RESTE ou l utilisateur l a mis',
    ids(r3).join() === ids(deplace).join());

  // 4. Un onglet masque par l'utilisateur reste masque.
  const masque = toggleHiddenEntry(dejaLa,
    dejaLa.findIndex(e => e.kind === 'item' && e.id === 'historique-notifications'));
  const r4 = reconcileLayout(neufs, toLayout(masque, 'admin', 'soc1'), 'admin', 'soc1');
  t('drapeau hidden conserve',
    (r4.find(e => e.kind === 'item' && e.id === 'historique-notifications') as LayoutItem).hidden === true);

  // 5. Le voisin de gauche lui-meme absent : on remonte, on ne retombe pas en fin.
  const SANS_CD: LayoutDefaultSection[] = [
    { title: 'Principal', items: [{ id: 'dashboard', label: 'D' }, { id: 'boutique', label: 'B' }] },
    { title: 'Communication', items: [{ id: 'chat-client', label: 'CC' }] },
    { title: 'Agenda', items: [{ id: 'agenda', label: 'A' }] },
  ];
  const r5 = reconcileLayout(neufs, toLayout(defaultEntries(SANS_CD), 'admin', 'soc1'), 'admin', 'soc1');
  t('voisin absent : on remonte au suivant, pas en fin',
    pos(r5, 'historique-notifications') < pos(r5, 'agenda'));
  t('voisin absent : chat-super-admin revient, et AVANT lui',
    pos(r5, 'chat-super-admin') < pos(r5, 'historique-notifications'));

  // 6. La garde d'entite reste prioritaire.
  const r6 = reconcileLayout(neufs, toLayout(perso, 'admin', 'soc1'), 'admin', 'AUTRE');
  t('config d une autre entite : on retombe sur les defauts, onglet compris',
    ids(r6).join() === ids(neufs).join());

  // 7. Une declaration fautive — le meme onglet dans DEUX compartiments — ne doit pas
  //    produire deux entrees dans la barre. Le cas arrive par copier-coller, et le
  //    resultat serait un onglet affiche deux fois, sans erreur nulle part.
  const DOUBLON: LayoutDefaultSection[] = [
    { title: 'Principal', items: [{ id: 'dashboard', label: 'D' }, { id: 'historique-notifications', label: 'HN' }] },
    { title: 'Communication', items: [{ id: 'chat-super-admin', label: 'CD' }, { id: 'historique-notifications', label: 'HN' }] },
  ];
  const r7 = reconcileLayout(defaultEntries(DOUBLON),
    toLayout([{ kind: 'item', id: 'dashboard' }], 'admin', 'soc1'), 'admin', 'soc1');
  t('declaration fautive : l onglet n apparait qu UNE fois',
    r7.filter(e => e.kind === 'item' && e.id === 'historique-notifications').length === 1);


}


console.log(`\n${ko === 0 ? '>>> TOUS LES TESTS PASSENT' : '>>> ' + ko + ' ECHEC(S)'}  (${ok} assertions)`);
if (ko > 0) process.exit(1);
