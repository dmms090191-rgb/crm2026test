import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Phone, Mail, ChevronDown, MessageCircle, CalendarClock, LogIn, Undo2, Redo2, Briefcase, CheckCircle2, LocateFixed } from 'lucide-react';
import { useWorkMode } from '../../../hooks/useWorkMode';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import type { ImportedLead, Vendor, StatutDef, ImpersonatedClient, ChatLead } from './crm/types';
import { getStatutCfg, FALLBACK_COLOR, getInitials, gradients } from './crm/utils';
import CheckBox from './crm/CheckBox';
import DetailModal from './crm/DetailModal';
import TransferModal from './crm/TransferModal';
import CrmFilters from './crm/CrmFilters';
import CrmTableRow from './crm/CrmTableRow';
import CrmActionBar from './crm/CrmActionBar';

export type { ImpersonatedClient, ChatLead } from './crm/types';

interface CrmProps {
  onConnectAsClient?: (client: ImpersonatedClient) => void;
  onOpenChat?: (lead: ChatLead) => void;
  onOpenRdv?: (lead: ChatLead) => void;
}

export default function Crm({ onConnectAsClient, onOpenChat, onOpenRdv }: CrmProps) {
  const tokens = useThemeTokens();

  const [leads, setLeads] = useState<ImportedLead[]>([]);
  const [statutDefs, setStatutDefs] = useState<StatutDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVendor, setFilterVendor] = useState<string>('tous');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterTel, setFilterTel] = useState('');
  const [filterPrenom, setFilterPrenom] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('Tous');
  const [sortOrder, setSortOrder] = useState<'recent' | 'ancien'>('recent');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [detailLead, setDetailLead] = useState<{ lead: ImportedLead; index: number } | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [authUserId, setAuthUserId] = useState<string>('');
  const workMode = useWorkMode(authUserId ? `crm_work_mode_admin_${authUserId}` : '');
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const rowRefsMap = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const cardStyle = { background: tokens.card.bg, border: tokens.card.border };
  const colSep = { borderRight: `1px solid ${tokens.table.colSep}` };

  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const topInnerRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'top' | 'bottom' | null>(null);

  useEffect(() => {
    const el = bottomScrollRef.current;
    if (!el) return;
    const sync = () => {
      if (topInnerRef.current) topInnerRef.current.style.width = el.scrollWidth + 'px';
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    const mo = new MutationObserver(sync);
    mo.observe(el, { childList: true, subtree: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [loading, leads.length]);

  const handleTopScroll = () => {
    if (syncingRef.current === 'bottom') { syncingRef.current = null; return; }
    syncingRef.current = 'top';
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };
  const handleBottomScroll = () => {
    if (syncingRef.current === 'top') { syncingRef.current = null; return; }
    syncingRef.current = 'bottom';
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  const loadStatuts = useCallback(async () => {
    const { data } = await supabase.from('statuts').select('id, nom, couleur').order('created_at', { ascending: true });
    setStatutDefs((data ?? []) as StatutDef[]);
  }, []);

  const loadVendors = useCallback(async () => {
    const { data } = await supabase.from('vendors').select('id, first_name, last_name, email').order('last_name', { ascending: true });
    setVendors((data ?? []) as Vendor[]);
  }, []);

  const handleTransfer = async (vendorId: string | null) => {
    const ids = Array.from(selected);
    await supabase.from('leads').update({ vendor_id: vendorId }).in('id', ids);
    setLeads(prev => prev.map(l => selected.has(l.id) ? { ...l, vendor_id: vendorId } : l));
    setSelected(new Set());
    setShowTransfer(false);
  };

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, data, imported_at, statut, actif, vendor_id')
      .order('imported_at', { ascending: false });
    setLeads((data ?? []) as ImportedLead[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setAuthUserId(data.user.id); });
  }, []);

  useEffect(() => {
    if (!workMode.enabled || !workMode.activeId) return;
    const t = setTimeout(() => {
      const el = cardRefsMap.current.get(workMode.activeId!) ?? rowRefsMap.current.get(workMode.activeId!);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }, 50);
    return () => clearTimeout(t);
  }, [workMode.enabled, workMode.activeId]);

  useEffect(() => { load(); loadStatuts(); loadVendors(); }, [load, loadStatuts, loadVendors]);

  useEffect(() => {
    const leadsChannel = supabase
      .channel('leads-crm')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, load)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' }, (payload) => {
        setLeads(prev => prev.filter(l => l.id !== (payload.old as { id: string }).id));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const updated = payload.new as ImportedLead;
        setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
      })
      .subscribe();
    const statutsChannel = supabase
      .channel('statuts-crm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuts' }, loadStatuts)
      .subscribe();
    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(statutsChannel);
    };
  }, [load, loadStatuts]);

  const handleStatut = async (id: string, statut: string) => {
    const prev = leads.find(l => l.id === id)?.statut;
    setLeads(ls => ls.map(l => l.id === id ? { ...l, statut } : l));
    const { error } = await supabase.from('leads').update({ statut }).eq('id', id);
    if (error) setLeads(ls => ls.map(l => l.id === id ? { ...l, statut: prev } : l));
  };

  const handleToggleActif = async (id: string, current: boolean) => {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, actif: !current } : l));
    const { error } = await supabase.from('leads').update({ actif: !current }).eq('id', id);
    if (error) setLeads(ls => ls.map(l => l.id === id ? { ...l, actif: current } : l));
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selected);
    await supabase.from('leads').delete().in('id', ids);
    setLeads(prev => prev.filter(l => !selected.has(l.id)));
    setSelected(new Set());
    setDeleting(false);
  };

  const filtered = leads
    .filter(l => {
      const nom = (l.data['Nom'] ?? '').toLowerCase();
      const prenom = (l.data['Prenom'] ?? '').toLowerCase();
      const email = (l.data['Email'] ?? '').toLowerCase();
      const tel = (l.data['Telephone'] ?? '').toLowerCase();
      if (filterNom && !nom.includes(filterNom.toLowerCase())) return false;
      if (filterPrenom && !prenom.includes(filterPrenom.toLowerCase())) return false;
      if (filterEmail && !email.includes(filterEmail.toLowerCase())) return false;
      if (filterTel && !tel.includes(filterTel.toLowerCase())) return false;
      if (statutFilter === 'sans_statut') {
        const nomStatut = l.statut ?? '';
        const statutConnu = statutDefs.some(s => s.nom === nomStatut);
        if (nomStatut !== '' && statutConnu) return false;
      } else if (statutFilter !== 'Tous' && (l.statut ?? '') !== statutFilter) return false;
      if (filterVendor === 'admin' && l.vendor_id !== null) return false;
      if (filterVendor !== 'tous' && filterVendor !== 'admin' && l.vendor_id !== filterVendor) return false;
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.imported_at).getTime();
      const db = new Date(b.imported_at).getTime();
      return sortOrder === 'recent' ? db - da : da - db;
    });

  const filteredIds = filtered.map(l => l.id);
  const allChecked = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));
  const someChecked = filteredIds.some(id => selected.has(id));

  const toggleAll = () => {
    if (allChecked) {
      setSelected(prev => { const n = new Set(prev); filteredIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); filteredIds.forEach(id => n.add(id)); return n; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  return (
    <div className="space-y-5">
      <CrmActionBar
        totalLeads={leads.length}
        selectedCount={selected.size}
        deleting={deleting}
        tokens={tokens}
        onTransfer={() => setShowTransfer(true)}
        onDelete={handleDeleteSelected}
      />

      <CrmFilters
        filterVendor={filterVendor} setFilterVendor={setFilterVendor}
        filterEmail={filterEmail} setFilterEmail={setFilterEmail}
        filterTel={filterTel} setFilterTel={setFilterTel}
        filterPrenom={filterPrenom} setFilterPrenom={setFilterPrenom}
        filterNom={filterNom} setFilterNom={setFilterNom}
        statutFilter={statutFilter} setStatutFilter={setStatutFilter}
        sortOrder={sortOrder} setSortOrder={setSortOrder}
        vendors={vendors} statutDefs={statutDefs} tokens={tokens}
      />

      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-t-cyan-400 rounded-full animate-spin" style={{ borderColor: tokens.text.quaternary, borderTopColor: '#22d3ee' }} />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.modal.fieldBg }}>
              <Users className="w-5 h-5" style={{ color: tokens.label.hint }} />
            </div>
            <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucun lead importe</p>
            <p className="text-xs" style={{ color: tokens.label.hint }}>Importez un fichier CSV depuis l'onglet Import de leads</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              {/* Desktop work mode bar */}
              <div className="flex items-center gap-4 px-5 py-2.5" style={{ borderBottom: `1px solid ${tokens.table.rowBorder}` }}>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <CheckBox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={toggleAll} />
                  <span className="text-[11px] font-medium" style={{ color: tokens.text.quaternary }}>Tout</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={workMode.enabled}
                    onChange={() => workMode.enabled ? workMode.deactivate() : workMode.activate()}
                    className="accent-orange-500 w-3.5 h-3.5"
                  />
                  <Briefcase className="w-3 h-3" style={{ color: workMode.enabled ? '#f97316' : tokens.text.quaternary }} />
                  <span className="text-[11px] font-medium" style={{ color: workMode.enabled ? '#f97316' : tokens.text.quaternary }}>Mode travail</span>
                </label>
                {workMode.enabled && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={workMode.undo}
                      disabled={!workMode.canUndo}
                      className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                      style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
                    >
                      <Undo2 className="w-3 h-3" />
                    </button>
                    {workMode.historyLength > 0 && (
                      <span className="text-[10px] font-semibold tabular-nums min-w-[28px] text-center" style={{ color: '#f97316' }}>
                        {workMode.historyPosition}/{workMode.historyLength}
                      </span>
                    )}
                    <button
                      onClick={workMode.redo}
                      disabled={!workMode.canRedo}
                      className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                      style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
                    >
                      <Redo2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (!workMode.activeId) return;
                        const el = rowRefsMap.current.get(workMode.activeId);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      disabled={!workMode.activeId || !filtered.some(l => l.id === workMode.activeId)}
                      className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                      style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
                    >
                      <LocateFixed className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div ref={topScrollRef} onScroll={handleTopScroll} className="dual-scroll-top md:!hidden">
                <div ref={topInnerRef} className="dual-scroll-top-inner" />
              </div>
              <div ref={bottomScrollRef} onScroll={handleBottomScroll} className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: tokens.table.headerBorder, background: tokens.table.headerBg }}>
                      <th className="px-3 py-3 w-28" style={colSep}></th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase w-12" style={{ ...colSep, color: tokens.table.headerText }}>#</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Nom</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Prenom</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Email</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Telephone</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Statut</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Actions</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Acces</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ ...colSep, color: tokens.table.headerText }}>Vendeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead, i) => (
                      <CrmTableRow
                        key={lead.id}
                        ref={el => { if (el) rowRefsMap.current.set(lead.id, el); else rowRefsMap.current.delete(lead.id); }}
                        lead={lead}
                        index={i}
                        isSelected={selected.has(lead.id)}
                        statutDefs={statutDefs}
                        vendors={vendors}
                        tokens={tokens}
                        colSep={colSep}
                        onToggle={toggleOne}
                        onStatutChange={handleStatut}
                        onToggleActif={handleToggleActif}
                        onDetail={(l, idx) => setDetailLead({ lead: l, index: idx })}
                        onConnectAsClient={onConnectAsClient}
                        onOpenChat={onOpenChat}
                        onOpenRdv={onOpenRdv}
                        workModeEnabled={workMode.enabled}
                        isWorkActive={workMode.activeId === lead.id}
                        onWorkSelect={workMode.select}
                        onWorkUndo={workMode.undo}
                        onWorkRedo={workMode.redo}
                        canWorkUndo={workMode.canUndo}
                        canWorkRedo={workMode.canRedo}
                        workHistoryPosition={workMode.historyPosition}
                        workHistoryLength={workMode.historyLength}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile select-all + work mode */}
            <div className="md:hidden flex items-center gap-3 px-3 py-2 flex-wrap" style={{ borderBottom: `1px solid ${tokens.table.rowBorder}` }}>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <CheckBox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={toggleAll} />
                <span className="text-[11px] font-medium" style={{ color: tokens.text.quaternary }}>Tout</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={workMode.enabled}
                  onChange={() => workMode.enabled ? workMode.deactivate() : workMode.activate()}
                  className="accent-orange-500 w-3.5 h-3.5"
                />
                <Briefcase className="w-3 h-3" style={{ color: workMode.enabled ? '#f97316' : tokens.text.quaternary }} />
                <span className="text-[11px] font-medium" style={{ color: workMode.enabled ? '#f97316' : tokens.text.quaternary }}>Mode travail</span>
              </label>
              {workMode.enabled && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={workMode.undo}
                    disabled={!workMode.canUndo}
                    className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                    style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
                  >
                    <Undo2 className="w-3 h-3" />
                  </button>
                  {workMode.historyLength > 0 && (
                    <span className="text-[10px] font-semibold tabular-nums min-w-[28px] text-center" style={{ color: '#f97316' }}>
                      {workMode.historyPosition}/{workMode.historyLength}
                    </span>
                  )}
                  <button
                    onClick={workMode.redo}
                    disabled={!workMode.canRedo}
                    className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                    style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
                  >
                    <Redo2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (!workMode.activeId) return;
                      const el = cardRefsMap.current.get(workMode.activeId);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    disabled={!workMode.activeId || !filtered.some(l => l.id === workMode.activeId)}
                    className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                    style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}
                  >
                    <LocateFixed className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: tokens.table.rowBorder }}>
              {filtered.map((lead, i) => {
                const nom = lead.data['Nom'] ?? '';
                const prenom = lead.data['Prenom'] ?? '';
                const email = lead.data['Email'] ?? '';
                const tel = lead.data['Telephone'] ?? '';
                const statut = lead.statut ?? '';
                const statutDef = statutDefs.find(s => s.nom === statut);
                const cfg = getStatutCfg(statutDef?.couleur ?? FALLBACK_COLOR);
                const initials = getInitials(nom, prenom);
                const grad = gradients[i % gradients.length];
                const assignedVendor = lead.vendor_id ? vendors.find(v => v.id === lead.vendor_id) : null;
                const actif = lead.actif !== false;
                return (
                  <div key={lead.id} ref={el => { if (el) cardRefsMap.current.set(lead.id, el); else cardRefsMap.current.delete(lead.id); }} className="px-3 py-3" style={{ borderColor: tokens.table.rowBorder, background: selected.has(lead.id) ? tokens.table.rowSelected : workMode.enabled && workMode.activeId === lead.id ? 'rgba(249,115,22,0.04)' : 'transparent' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {workMode.enabled ? (
                          <>
                            <button
                              onClick={() => workMode.select(lead.id)}
                              className="w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0"
                              style={workMode.activeId === lead.id
                                ? { background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)' }
                                : { background: tokens.input.bg, border: `1px solid ${tokens.input.border}` }
                              }
                            >
                              {workMode.activeId === lead.id && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#f97316' }} />}
                            </button>
                            {workMode.activeId === lead.id && workMode.historyLength > 0 && (
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={workMode.undo}
                                  disabled={!workMode.canUndo}
                                  className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30"
                                  style={{ color: '#f97316' }}
                                >
                                  <Undo2 className="w-3 h-3" />
                                </button>
                                <span className="text-[9px] font-semibold tabular-nums" style={{ color: '#f97316' }}>
                                  {workMode.historyPosition}/{workMode.historyLength}
                                </span>
                                <button
                                  onClick={workMode.redo}
                                  disabled={!workMode.canRedo}
                                  className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30"
                                  style={{ color: '#f97316' }}
                                >
                                  <Redo2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <CheckBox checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} />
                        )}
                      </div>
                      <span className="text-[10px] tabular-nums font-medium" style={{ color: tokens.table.indexText }}>#{i + 1}</span>
                    </div>
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: grad, boxShadow: '0 2px 6px rgba(0,0,0,0.3)', color: tokens.text.primary }}>{initials || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: tokens.table.cellText }}>{prenom} {nom}</p>
                        {email && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                            <span className="text-[11px] truncate" style={{ color: tokens.table.cellTextMuted }}>{email}</span>
                          </div>
                        )}
                        {tel && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                            <span className="text-[11px]" style={{ color: tokens.table.cellTextMuted }}>{tel}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2 text-[11px]" style={{ color: tokens.text.quaternary }}>
                      <div className="flex items-center gap-1.5">
                        <span>Statut</span>
                        <div className="relative inline-flex items-center">
                          <span className="pointer-events-none absolute left-1.5 w-1.5 h-1.5 rounded-full z-10" style={{ background: statut ? cfg.dot : 'rgba(148,163,184,0.5)', boxShadow: statut ? `0 0 4px ${cfg.dot}` : 'none' }} />
                          <select
                            value={statut}
                            onChange={e => handleStatut(lead.id, e.target.value)}
                            className="rounded-md text-[11px] font-semibold pl-4 pr-5 py-0.5 focus:outline-none cursor-pointer appearance-none"
                            style={{ background: statut ? cfg.bg : 'rgba(148,163,184,0.08)', color: statut ? cfg.color : 'rgba(148,163,184,0.7)', border: `1px solid ${statut ? cfg.border : 'rgba(148,163,184,0.18)'}` }}
                          >
                            <option value="" style={{ background: tokens.selectBg }}>Sans statut</option>
                            {statutDefs.map(s => (<option key={s.id} value={s.nom} style={{ background: tokens.selectBg }}>{s.nom}</option>))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1 w-2.5 h-2.5" style={{ color: statut ? cfg.color : 'rgba(148,163,184,0.5)' }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>Vendeur</span>
                        <span style={{ color: tokens.text.secondary }}>{assignedVendor ? `${assignedVendor.first_name} ${assignedVendor.last_name}` : 'Admin'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>Acces</span>
                        <button
                          onClick={() => handleToggleActif(lead.id, actif)}
                          className="relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none"
                          style={{ width: 32, height: 18, background: actif ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)', border: actif ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.1)' }}
                          title={actif ? 'Desactiver' : 'Activer'}
                        >
                          <span className="absolute rounded-full transition-all duration-300" style={{ width: 10, height: 10, left: actif ? 18 : 3, background: actif ? tokens.success.text : 'rgba(255,255,255,0.3)', boxShadow: actif ? '0 0 6px rgba(52,211,153,0.8)' : 'none' }} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={() => setDetailLead({ lead, index: i })} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}>
                        <ChevronDown className="w-3 h-3" />Details
                      </button>
                      <button onClick={() => onOpenChat?.({ id: lead.id, nom, prenom, email, tel })} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ background: tokens.warning.bg, border: `1px solid ${tokens.warning.border}`, color: tokens.warning.text }}>
                        <MessageCircle className="w-3 h-3" />Msg
                      </button>
                      <button onClick={() => onOpenRdv?.({ id: lead.id, nom, prenom, email, tel })} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', color: '#22d3ee' }}>
                        <CalendarClock className="w-3 h-3" />RDV
                      </button>
                      <button onClick={() => onConnectAsClient?.({ id: lead.id, nom, prenom, email })} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}>
                        <LogIn className="w-3 h-3" />Connect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${tokens.table.rowBorder}` }}>
              <p className="text-xs" style={{ color: tokens.table.footerText }}>{filtered.length} lead{filtered.length !== 1 ? 's' : ''} affiche{filtered.length !== 1 ? 's' : ''}</p>
              {selected.size > 0 && (
                <p className="text-xs" style={{ color: tokens.danger.text }}>{selected.size} selectionne{selected.size > 1 ? 's' : ''}</p>
              )}
              {filtered.length === 0 && (filterNom || filterPrenom || filterEmail || filterTel) && (
                <p className="text-xs" style={{ color: tokens.table.footerText }}>Aucun resultat pour ces filtres</p>
              )}
            </div>
          </>
        )}
      </div>

      {detailLead && (
        <DetailModal lead={detailLead.lead} gradIndex={detailLead.index} onClose={() => setDetailLead(null)} statutDefs={statutDefs} />
      )}

      {showTransfer && (
        <TransferModal count={selected.size} onClose={() => setShowTransfer(false)} onConfirm={handleTransfer} />
      )}
    </div>
  );
}
