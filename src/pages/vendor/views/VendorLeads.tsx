import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Hash, User, Mail, Phone, CalendarDays, Signal, Settings, Lock, Bot, Columns3, CheckSquare, Briefcase, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useTimezone } from '../../../hooks/useTimezone';
import { useCompanyId } from '../../../hooks/useCompanyId';
import DualScrollWrapper from '../../../components/DualScrollWrapper';
import VendorLeadDetailModal from './VendorLeadDetailModal';
import VendorLeadDesktopRow from './leads/VendorLeadDesktopRow';
import VendorLeadMobileCard from './leads/VendorLeadMobileCard';
import VendorLeadWorkModeBar from './leads/VendorLeadWorkModeBar';
import VendorLeadsFilters from './leads/VendorLeadsFilters';
import { useVendorLeadsData } from './leads/useVendorLeadsData';
import useColumnOrder from '../../../components/table/useColumnOrder';
import useColumnOrderMobile from '../../../components/table/useColumnOrderMobile';
import ColumnOrganizerModal from '../../../components/table/ColumnOrganizerModal';
import { useCustomColumns } from '../../../hooks/useCustomColumns';
import { useActionMenuOrder } from '../../../components/action-menu/useActionMenuOrder';
import ToolbarOrganizerModal from '../../../components/toolbar/ToolbarOrganizerModal';
import type { ToolbarItem } from '../../../components/toolbar/ToolbarOrganizerModal';
import type { VendorLeadsProps } from './vendorLeadsTypes';
import SelecteurFormatTel from '../../../components/telephone/SelecteurFormatTel';
import { useOngletsLeads } from '../../../hooks/useOngletsLeads';
import { useRenduProgressif } from '../../../hooks/useRenduProgressif';
import { useEstBureau } from '../../../hooks/useEstBureau';
import { ONGLET_PRINCIPAL, CLE_COLONNE_ONGLETS } from '../../../lib/ongletsLeads';
import BarreOnglet from '../../../components/leads/BarreOnglet';
import OngletsModal from '../../../components/leads/OngletsModal';
import { useLeadDemande, leadMontre, defilerVersLead } from '../../../lib/leadAMontrer';

const VENDOR_LEADS_COLUMNS = [
  { key: 'hash', label: '#' },
  { key: 'nom', label: 'Nom' },
  { key: 'prenom', label: 'Prenom' },
  { key: 'email', label: 'Email' },
  { key: 'telephone', label: 'Telephone' },
  { key: 'date_ajout', label: "Date d'ajout" },
  { key: 'statut', label: 'Statut', required: true },
  { key: 'actions', label: 'Actions', required: true },
  { key: 'acces', label: 'Acces', required: true },
  { key: 'ia', label: 'IA', required: true },
];

const VENDOR_HEADER_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  hash: Hash, nom: User, prenom: User, email: Mail, telephone: Phone,
  date_ajout: CalendarDays, statut: Signal, actions: Settings, acces: Lock, ia: Bot,
};

export type { VendorChatLeadRef } from './vendorLeadsTypes';

const SYNC_TS_KEY = 'talvex_columns_vendor_leads_sync_ts';

export default function VendorLeads({ vendorId, onOpenChat, onConnectAsClient, onOpenRdv }: VendorLeadsProps) {
  const tokens = useThemeTokens();
  const { timezone } = useTimezone();
  const companyId = useCompanyId();
  /* Les onglets de colonnes de la societe, en LECTURE : le commercial choisit l'onglet et
     voit ses colonnes, mais ne cree, ne renomme ni n'archive rien (la RLS le refuse aussi). */
  const og = useOngletsLeads(companyId);
  const d = useVendorLeadsData(vendorId, { ongletActif: og.ongletActif, dansOnglet: og.dansOnglet });
  const principal = og.ongletActif === ONGLET_PRINCIPAL;
  const [showOnglets, setShowOnglets] = useState(false);
  const [avis, setAvis] = useState('');
  const estBureau = useEstBureau();
  const colSep = { borderRight: `1px solid ${tokens.table.colSep}` };
  const showLoading = d.loading || !vendorId;
  const cc = useCustomColumns('vendor_leads');
  const allColumns = useMemo(() => [...VENDOR_LEADS_COLUMNS, ...cc.customDefs], [cc.customDefs]);
  const colOrder = useColumnOrder('talvex_columns_vendor_leads', allColumns);
  const colMobile = useColumnOrderMobile('talvex_columns_vendor_leads', allColumns);
  const [showColModal, setShowColModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [canCustomizeColumns, setCanCustomizeColumns] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('company_column_config')
      .select('desktop_order, desktop_hidden, mobile_order, mobile_card_style, pushed_at')
      .eq('company_id', companyId)
      .eq('table_key', 'vendor_leads')
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.pushed_at) return;
        const localTs = localStorage.getItem(SYNC_TS_KEY) || '';
        if (localTs >= data.pushed_at) return;
        const validKeys = new Set(VENDOR_LEADS_COLUMNS.map(c => c.key));
        const desktopOrder = (data.desktop_order as string[] || []).filter(k => validKeys.has(k));
        const desktopHidden = (data.desktop_hidden as string[] || []).filter(k => validKeys.has(k));
        if (desktopOrder.length > 0) {
          const missing = VENDOR_LEADS_COLUMNS.map(c => c.key).filter(k => !desktopOrder.includes(k));
          colOrder.saveAll({ order: [...desktopOrder, ...missing], hiddenDesktop: desktopHidden });
        }
        const mobileOrder = data.mobile_order as { key: string; role: string; visible: boolean }[] | null;
        if (mobileOrder && mobileOrder.length > 0) {
          const filteredMobile = mobileOrder.filter(e => validKeys.has(e.key));
          colMobile.saveMobile({ order: filteredMobile, cardStyle: (data.mobile_card_style as 'comfort') || 'comfort' });
        }
        try { localStorage.setItem(SYNC_TS_KEY, data.pushed_at); } catch {}
      });
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!vendorId) return;
    supabase.from('vendors').select('can_customize_columns').eq('id', vendorId).maybeSingle().then(({ data }) => {
      if (data) setCanCustomizeColumns(data.can_customize_columns !== false);
    });
  }, [vendorId]);
  const displayColumns = useMemo(() => allColumns.map(c => colOrder.labelOverrides[c.key] ? { ...c, label: colOrder.labelOverrides[c.key] } : c), [allColumns, colOrder.labelOverrides]);
  const colMap = useMemo(() => new Map(displayColumns.map(c => [c.key, c])), [displayColumns]);
  const colonnesOnglet = useMemo(() => (principal ? [] : og.colonnesParOnglet.get(og.ongletActif) ?? []), [principal, og.colonnesParOnglet, og.ongletActif]);
  const colonnesParCle = useMemo(() => new Map(colonnesOnglet.map(c => [c.cle, c])), [colonnesOnglet]);
  const colonnesDyn = useMemo(() => new Map(colonnesOnglet.filter(c => !c.systeme).map(c => [c.cle, c])), [colonnesOnglet]);
  /* La colonne Vendeur n'existe pas cote commercial : elle est ecartee d'un onglet qui l'a. */
  const clesAffichees = useMemo(() => {
    if (d.rechercheActive) {
      const base = colOrder.visibleOrderedKeys;
      const i = base.indexOf('nom');
      return [...base.slice(0, i + 1), CLE_COLONNE_ONGLETS, ...base.slice(i + 1)];
    }
    if (principal) return colOrder.visibleOrderedKeys;
    return colonnesOnglet.filter(c => c.visible && c.systeme !== 'vendeur').map(c => c.cle);
  }, [d.rechercheActive, principal, colOrder.visibleOrderedKeys, colonnesOnglet]);
  const libelleColonne = (cle: string) => {
    if (cle === CLE_COLONNE_ONGLETS) return 'Onglets';
    if (!principal && !d.rechercheActive) return colonnesParCle.get(cle)?.libelle ?? cle;
    return colMap.get(cle)?.label ?? cle;
  };
  const champsCarte = principal || d.rechercheActive ? undefined : colonnesOnglet.filter(c => c.visible && !c.systeme);
  const rp = useRenduProgressif(d.filtered, [og.ongletActif, d.recherche, d.filterNom, d.filterPrenom, d.filterEmail, d.filterTel, d.statutFilter, d.sortOrder].join('|'));
  const chargementVue = showLoading || (!principal && og.chargement);
  /* Dans un onglet, les colonnes sont celles que la Societe a reglees pour cet onglet : le
     reglage personnel ne s'y applique pas. On le dit plutot que d'ouvrir un reglage sans effet. */
  const ouvrirColonnes = () => {
    if (!principal && !d.rechercheActive) { setAvis('Les colonnes de cet onglet sont réglées par votre société. Votre réglage personnel s\'applique à « Principal ».'); return; }
    if (canCustomizeColumns) setShowColModal(true);
  };
  const { inclure } = rp;

  /* Le lead du mode travail doit etre MONTE pour qu'on puisse y defiler (« Localiser »). */
  useEffect(() => {
    if (!d.workMode.activeId) return;
    const i = d.filtered.findIndex(l => l.id === d.workMode.activeId);
    if (i >= 0) inclure(i);
  }, [d.workMode.activeId, d.filtered, inclure]);

  /* « Montrer ce lead » : meme regle que cote Societe (voir lib/leadAMontrer). */
  const leadDemande = useLeadDemande();
  const { recherche, setRecherche } = d;
  useEffect(() => {
    if (!leadDemande || chargementVue || og.chargement) return;
    const i = d.filtered.findIndex(l => l.id === leadDemande);
    if (i >= 0) { inclure(i); leadMontre(leadDemande); defilerVersLead(leadDemande); return; }
    if (!d.leads.some(l => l.id === leadDemande)) { leadMontre(leadDemande); return; }
    if (og.ongletActif !== ONGLET_PRINCIPAL) og.choisir(ONGLET_PRINCIPAL);
    else if (recherche) setRecherche('');
    else leadMontre(leadDemande);
  }, [leadDemande, chargementVue, og, d.filtered, d.leads, recherche, setRecherche, inclure]);

  /* Les comptes de la fenetre des onglets : les SIENS, pas ceux de toute la societe. */
  const comptesCommercial = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of d.leads) for (const o of og.appartenances.get(l.id) ?? []) m.set(o, (m.get(o) ?? 0) + 1);
    return m;
  }, [d.leads, og.appartenances]);

  const VENDOR_TOOLBAR_DEFAULT = ['select', 'workmode', 'columns', 'organize'];
  const tbOrder = useActionMenuOrder('talvex_toolbar_order_vendor_leads', VENDOR_TOOLBAR_DEFAULT);
  const toolbarItems: ToolbarItem[] = useMemo(() => [
    { id: 'select', label: 'Selectionner', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { id: 'workmode', label: 'Mode travail', icon: <Briefcase className="w-3.5 h-3.5" />, pinned: true },
    { id: 'columns', label: 'Colonnes', icon: <Columns3 className="w-3.5 h-3.5" />, pinned: true },
    { id: 'organize', label: 'Organiser', icon: <SlidersHorizontal className="w-3.5 h-3.5" />, pinned: true },
  ], []);

  const [selectMode, setSelectMode] = useState(false);
  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => {
      if (prev) d.setSelected(new Set());
      return !prev;
    });
  }, [d]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.heading.primary }}>Leads</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>Leads qui vous sont attribues</p>
        </div>
        <div className="flex items-center gap-3">
          {!showLoading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
              <Users className="w-3.5 h-3.5" />
              {d.leads.length} lead{d.leads.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <BarreOnglet
        ongletNom={og.ongletActifNom} principal={principal} onOuvrir={() => setShowOnglets(true)}
        recherche={d.recherche} onRecherche={d.setRecherche}
        resultats={d.rechercheActive && !showLoading ? d.filtered.length : null}
      />

      {avis && (
        <p className="text-xs px-3 py-2 rounded-xl flex items-center justify-between gap-2" role="status" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
          {avis}
          <button type="button" onClick={() => setAvis('')} className="text-[11px] underline flex-shrink-0">OK</button>
        </p>
      )}

      <VendorLeadsFilters
        filterEmail={d.filterEmail} setFilterEmail={d.setFilterEmail}
        filterTel={d.filterTel} setFilterTel={d.setFilterTel}
        filterPrenom={d.filterPrenom} setFilterPrenom={d.setFilterPrenom}
        filterNom={d.filterNom} setFilterNom={d.setFilterNom}
        statutFilter={d.statutFilter} setStatutFilter={d.setStatutFilter}
        sortOrder={d.sortOrder} setSortOrder={d.setSortOrder}
        statutDefs={d.statutDefs}
        mobileFiltersOpen={d.mobileFiltersOpen} setMobileFiltersOpen={d.setMobileFiltersOpen}
        tokens={tokens}
      />

      {/* LE SELECTEUR DE FORMAT, AU-DESSUS DES DEUX PRESENTATIONS.
          Il est pose ICI, entre les filtres et la carte du tableau, et non dans la barre
          d'outils : la barre est montee DEUX FOIS, une par branche `md:`, et le selecteur y
          aurait existe en double. Un seul montage sert donc le tableau et les cartes, et le
          reglage ne peut pas se desynchroniser entre les deux.

          Rien ne s'affiche quand la liste est vide : un reglage de format d'appel devant zero
          numero n'est pas un reglage, c'est du bruit. */}
      {!showLoading && d.leads.length > 0 && <SelecteurFormatTel />}

      <div className="rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}`, boxShadow: tokens.card.shadow }}>
        {chargementVue ? (
          <div className="px-4 md:px-5 py-4 space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: tokens.surface.hover }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded-full w-1/3" style={{ background: tokens.surface.hover }} />
                  <div className="h-2.5 rounded-full w-2/3" style={{ background: tokens.surface.hover, opacity: 0.6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : d.leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.surface.hover }}>
              <Users className="w-5 h-5" style={{ color: tokens.table.footerText }} />
            </div>
            <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucun lead attribue</p>
            <p className="text-xs" style={{ color: tokens.table.footerText }}>L'administrateur peut vous attribuer des leads depuis le CRM</p>
          </div>
        ) : (
          <>
            {/* Desktop table — un seul arbre monte, selon la largeur */}
            {estBureau ? (
            <div className="hidden md:block">
              <VendorLeadWorkModeBar
                allChecked={d.allChecked} someChecked={d.someChecked} toggleAll={d.toggleAll}
                selectMode={selectMode} onToggleSelectMode={handleToggleSelectMode}
                workModeEnabled={d.workMode.enabled} onWorkModeToggle={() => d.workMode.enabled ? d.workMode.deactivate() : d.workMode.activate()}
                onUndo={d.workMode.undo} onRedo={d.workMode.redo} canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                historyPosition={d.workMode.historyPosition} historyLength={d.workMode.historyLength}
                onLocate={() => { if (d.workMode.activeId) d.rowRefsMap.current.get(d.workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                canLocate={!!d.workMode.activeId && d.filtered.some(l => l.id === d.workMode.activeId)}
                onResetHistory={d.workMode.resetHistory}
                onOpenColumns={ouvrirColonnes}
                onOpenOrganize={() => setShowOrgModal(true)}
                toolbarOrder={tbOrder.order}
                columnsLocked={!canCustomizeColumns}
              />
              <DualScrollWrapper deps={[d.filtered.length]}>
                <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 'max-content' }}>
                  <thead>
                    <tr className="sticky top-0 z-10" style={{ background: tokens.table.headerBg }}>
                      {(selectMode || d.workMode.enabled) && <th className="px-3 py-4 w-12" style={{ borderBottom: `2px solid ${tokens.accent.solid}` }}></th>}
                      {clesAffichees.map(key => {
                        const Icon = VENDOR_HEADER_ICONS[key];
                        return (
                          <th key={key} className={`text-left px-5 py-4 ${key === 'hash' ? 'w-12' : ''}`} style={{ borderBottom: `2px solid ${tokens.accent.solid}` }}>
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="w-3 h-3 flex-shrink-0" style={{ color: tokens.accent.text, opacity: 0.6 }} />}
                              <span className="text-[10px] font-bold tracking-[0.1em] uppercase whitespace-nowrap" style={{ color: tokens.table.headerText }}>{libelleColonne(key)}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rp.visibles.map((lead, i) => (
                      <VendorLeadDesktopRow
                        key={lead.id}
                        ref={el => { if (el) d.rowRefsMap.current.set(lead.id, el); else d.rowRefsMap.current.delete(lead.id); }}
                        lead={lead} index={i} statutDefs={d.statutDefs} isSelected={d.selected.has(lead.id)} timezone={timezone} colSep={colSep}
                        selectMode={selectMode}
                        workModeEnabled={d.workMode.enabled} isWorkActive={d.workMode.activeId === lead.id}
                        workHistoryLength={d.workMode.historyLength} workHistoryPosition={d.workMode.historyPosition}
                        canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                        onWorkSelect={d.workMode.select} onWorkUndo={d.workMode.undo} onWorkRedo={d.workMode.redo}
                        onToggle={d.toggleOne} onStatutChange={d.handleStatut} onToggleActif={d.handleToggleActif} onToggleAi={d.handleToggleAi}
                        onDetail={(l, idx) => d.setDetailLead({ lead: l, index: idx })}
                        onOpenChat={onOpenChat} onOpenRdv={onOpenRdv} onConnectAsClient={onConnectAsClient}
                        columnOrder={clesAffichees}
                        customColumnDefs={cc.customDefs}
                        customColumnValues={cc.getValuesForRow(lead.id)}
                        colonnesDyn={colonnesDyn}
                        ongletsDuLead={d.rechercheActive ? og.nomsOngletsDuLead(lead.id) : undefined}
                      />
                    ))}
                  </tbody>
                </table>
              </DualScrollWrapper>
            </div>
            ) : (
            <div className="md:hidden">
              <VendorLeadWorkModeBar
                allChecked={d.allChecked} someChecked={d.someChecked} toggleAll={d.toggleAll}
                selectMode={selectMode} onToggleSelectMode={handleToggleSelectMode}
                workModeEnabled={d.workMode.enabled} onWorkModeToggle={() => d.workMode.enabled ? d.workMode.deactivate() : d.workMode.activate()}
                onUndo={d.workMode.undo} onRedo={d.workMode.redo} canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                historyPosition={d.workMode.historyPosition} historyLength={d.workMode.historyLength}
                onLocate={() => { if (d.workMode.activeId) d.cardRefsMap.current.get(d.workMode.activeId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                canLocate={!!d.workMode.activeId && d.filtered.some(l => l.id === d.workMode.activeId)}
                onResetHistory={d.workMode.resetHistory}
                onOpenColumns={ouvrirColonnes}
                onOpenOrganize={() => setShowOrgModal(true)}
                toolbarOrder={tbOrder.order}
                columnsLocked={!canCustomizeColumns}
              />
              <div className="divide-y" style={{ borderColor: tokens.table.rowBorder }}>
                {rp.visibles.map((lead, i) => (
                  <VendorLeadMobileCard
                    key={lead.id}
                    lead={lead} index={i} statutDefs={d.statutDefs} timezone={timezone} isSelected={d.selected.has(lead.id)}
                    selectMode={selectMode}
                    workModeEnabled={d.workMode.enabled} workModeActiveId={d.workMode.activeId}
                    workHistoryLength={d.workMode.historyLength} workHistoryPosition={d.workMode.historyPosition}
                    canUndo={d.workMode.canUndo} canRedo={d.workMode.canRedo}
                    onWorkSelect={d.workMode.select} onWorkUndo={d.workMode.undo} onWorkRedo={d.workMode.redo} onWorkReset={d.workMode.resetHistory}
                    onToggle={d.toggleOne} onStatutChange={d.handleStatut} onToggleActif={d.handleToggleActif} onToggleAi={d.handleToggleAi}
                    onDetail={(l, idx) => d.setDetailLead({ lead: l, index: idx })}
                    onOpenChat={onOpenChat} onOpenRdv={onOpenRdv} onConnectAsClient={onConnectAsClient}
                    cardRef={el => { if (el) d.cardRefsMap.current.set(lead.id, el); else d.cardRefsMap.current.delete(lead.id); }}
                    champsOnglet={champsCarte}
                    ongletsDuLead={d.rechercheActive ? og.nomsOngletsDuLead(lead.id) : null}
                  />
                ))}
              </div>
            </div>
            )}

            {rp.restant > 0 && (
              <div ref={rp.sentinelle} className="flex items-center justify-center py-4">
                <button type="button" onClick={rp.afficherPlus} className="min-h-[44px] px-4 rounded-xl text-xs font-semibold"
                  style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
                  Afficher plus ({rp.restant.toLocaleString('fr-FR')} restant{rp.restant > 1 ? 's' : ''})
                </button>
              </div>
            )}

            {d.filtered.length === 0 && (
              <p className="text-center text-xs py-10" style={{ color: tokens.text.quaternary }}>
                {d.rechercheActive ? 'Aucun lead ne correspond à cette recherche.' : principal ? 'Aucun lead pour ces filtres.' : `Aucun de vos leads dans l'onglet « ${og.ongletActifNom} ».`}
              </p>
            )}

            <div className="flex items-center justify-between px-6 py-3.5" style={{ borderTop: `1px solid ${tokens.surface.border}`, background: tokens.table.headerBg }}>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
                  <Users className="w-3 h-3" />{d.filtered.length}
                </span>
                <span className="text-xs" style={{ color: tokens.table.footerText }}>lead{d.filtered.length !== 1 ? 's' : ''} affiche{d.filtered.length !== 1 ? 's' : ''}</span>
              </div>
              {d.selected.size > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}` }}>{d.selected.size} selectionne{d.selected.size > 1 ? 's' : ''}</span>
              )}
            </div>
          </>
        )}
      </div>

      {d.detailLead && (
        <VendorLeadDetailModal
          lead={d.detailLead.lead}
          gradIndex={d.detailLead.index}
          onClose={() => d.setDetailLead(null)}
          statutDefs={d.statutDefs}
          onConnect={(client) => { d.setDetailLead(null); onConnectAsClient?.(client); }}
        />
      )}

      {showColModal && <ColumnOrganizerModal columns={displayColumns} orderedKeys={colOrder.orderedKeys} hiddenDesktopKeys={colOrder.hiddenDesktopKeys} tableKey="vendor_leads" onSave={colOrder.saveAll} onReset={colOrder.resetAll} onClose={() => setShowColModal(false)} onCreateCustomColumn={cc.createColumn} onDeleteCustomColumn={cc.deleteColumn} onRenameCustomColumn={cc.renameColumn} onRenameLabel={colOrder.renameLabel} mobileOrder={colMobile.mobileOrder} mobileCardStyle={colMobile.cardStyle} onSaveMobile={colMobile.saveMobile} onResetMobile={colMobile.resetMobile} />}

      {showOnglets && <OngletsModal og={og} totalLeads={d.leads.length} comptes={comptesCommercial} peutGerer={false} onClose={() => setShowOnglets(false)} />}

      {showOrgModal && <ToolbarOrganizerModal items={toolbarItems} order={tbOrder.order} onSave={tbOrder.save} onClose={() => setShowOrgModal(false)} t={tokens} />}
    </div>
  );
}
