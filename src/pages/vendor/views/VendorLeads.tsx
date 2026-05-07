import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Phone, Mail, ChevronDown, LogIn, Filter, MessageCircle, CalendarClock, SlidersHorizontal, Undo2, Redo2, Briefcase, CheckCircle2, LocateFixed,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useWorkMode } from '../../../hooks/useWorkMode';
import { getStatutCfg, FALLBACK_COLOR, getInitials, gradients } from '../../admin/views/crm/utils';
import CheckBox from '../../admin/views/crm/CheckBox';
import DualScrollWrapper from '../../../components/DualScrollWrapper';
import VendorLeadDetailModal from './VendorLeadDetailModal';
import type { ImportedLead, StatutDef, VendorLeadsProps } from './vendorLeadsTypes';

export type { VendorChatLeadRef } from './vendorLeadsTypes';

export default function VendorLeads({ vendorId, onOpenChat, onConnectAsClient, onOpenRdv }: VendorLeadsProps) {
  const tokens = useThemeTokens();
  const [leads, setLeads] = useState<ImportedLead[]>([]);
  const [statutDefs, setStatutDefs] = useState<StatutDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmail, setFilterEmail] = useState('');
  const [filterTel, setFilterTel] = useState('');
  const [filterPrenom, setFilterPrenom] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('Tous');
  const [sortOrder, setSortOrder] = useState<'recent' | 'ancien'>('recent');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailLead, setDetailLead] = useState<{ lead: ImportedLead; index: number } | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const workMode = useWorkMode(vendorId ? `crm_work_mode_vendor_${vendorId}` : '');
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const rowRefsMap = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const loadStatuts = useCallback(async () => {
    const { data } = await supabase.from('statuts').select('id, nom, couleur').order('created_at', { ascending: true });
    setStatutDefs((data ?? []) as StatutDef[]);
  }, []);

  const load = useCallback(async () => {
    if (vendorId === null && vendorId !== null) return;
    const query = supabase
      .from('leads')
      .select('id, data, imported_at, statut, actif, vendor_id')
      .order('imported_at', { ascending: false });

    const finalQuery = vendorId ? query.eq('vendor_id', vendorId) : query.is('vendor_id', null);
    const { data } = await finalQuery;
    setLeads((data ?? []) as ImportedLead[]);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => { setLoading(true); load(); loadStatuts(); }, [load, loadStatuts]);

  useEffect(() => {
    if (!workMode.enabled || !workMode.activeId) return;
    const t = setTimeout(() => {
      const el = cardRefsMap.current.get(workMode.activeId!) ?? rowRefsMap.current.get(workMode.activeId!);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }, 50);
    return () => clearTimeout(t);
  }, [workMode.enabled, workMode.activeId]);

  useEffect(() => {
    const channelName = `vendor-leads-${vendorId ?? 'unassigned'}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, load)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' }, (payload) => {
        setLeads(prev => prev.filter(l => l.id !== (payload.old as { id: string }).id));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const updated = payload.new as ImportedLead;
        const belongsToVendor = vendorId ? updated.vendor_id === vendorId : updated.vendor_id === null;
        if (belongsToVendor) {
          setLeads(prev => {
            const exists = prev.some(l => l.id === updated.id);
            if (exists) return prev.map(l => l.id === updated.id ? { ...l, ...updated } : l);
            return [...prev, updated];
          });
        } else {
          setLeads(prev => prev.filter(l => l.id !== updated.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, vendorId]);

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
    if (allChecked) { setSelected(prev => { const n = new Set(prev); filteredIds.forEach(id => n.delete(id)); return n; }); }
    else { setSelected(prev => { const n = new Set(prev); filteredIds.forEach(id => n.add(id)); return n; }); }
  };
  const toggleOne = (id: string) => { setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };

  const colSep = { borderRight: `1px solid ${tokens.table.colSep}` };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.heading.primary }}>Leads</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>Leads qui vous sont attribues</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
            <Users className="w-3.5 h-3.5" />
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
        {/* Desktop filters */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${tokens.table.headerBorder}` }}>
            <Filter className="w-3.5 h-3.5" style={{ color: tokens.text.tertiary }} />
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.text.tertiary }}>Filtres de recherche</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                <input type="text" placeholder="Rechercher par email..." value={filterEmail} onChange={e => setFilterEmail(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all placeholder-slate-600" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
              </div>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                <input type="text" placeholder="Rechercher par numero..." value={filterTel} onChange={e => setFilterTel(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all placeholder-slate-600" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
              </div>
              <div className="relative">
                <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                <input type="text" placeholder="Rechercher par prenom..." value={filterPrenom} onChange={e => setFilterPrenom(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all placeholder-slate-600" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="relative">
                <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                <input type="text" placeholder="Rechercher par nom..." value={filterNom} onChange={e => setFilterNom(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all placeholder-slate-600" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
              </div>
              <div className="relative">
                <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className="w-full pl-3 pr-7 py-2 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}>
                  <option value="Tous" style={{ background: tokens.selectBg }}>Tous les statuts</option>
                  {statutDefs.map(s => (<option key={s.id} value={s.nom} style={{ background: tokens.selectBg }}>{s.nom}</option>))}
                  <option value="sans_statut" style={{ background: tokens.selectBg }}>Sans statut</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.text.quaternary }} />
              </div>
              <div className="relative">
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'recent' | 'ancien')} className="w-full pl-3 pr-7 py-2 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}>
                  <option value="recent" style={{ background: tokens.selectBg }}>Plus recent</option>
                  <option value="ancien" style={{ background: tokens.selectBg }}>Plus ancien</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.text.quaternary }} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile filters */}
        <div className="md:hidden px-3 py-3 space-y-2">
          <div className="relative">
            <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
            <input type="text" placeholder="Rechercher par email..." value={filterEmail} onChange={e => setFilterEmail(e.target.value)} className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
          </div>
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: (filterTel || filterPrenom || filterNom || statutFilter !== 'Tous' || sortOrder !== 'recent') ? tokens.accent.bg : tokens.input.bg,
              border: `1px solid ${(filterTel || filterPrenom || filterNom || statutFilter !== 'Tous' || sortOrder !== 'recent') ? tokens.accent.border : tokens.input.border}`,
              color: (filterTel || filterPrenom || filterNom || statutFilter !== 'Tous' || sortOrder !== 'recent') ? tokens.accent.text : tokens.text.secondary,
            }}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {(() => {
                const count = [filterTel ? 1 : 0, filterPrenom ? 1 : 0, filterNom ? 1 : 0, statutFilter !== 'Tous' ? 1 : 0, sortOrder !== 'recent' ? 1 : 0].reduce((a, b) => a + b, 0);
                return count > 0 ? `${count} filtre${count > 1 ? 's' : ''} actif${count > 1 ? 's' : ''}` : 'Filtres';
              })()}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
          </button>
          {mobileFiltersOpen && (
            <div className="space-y-2 pt-1">
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                <input type="text" placeholder="Rechercher par numero..." value={filterTel} onChange={e => setFilterTel(e.target.value)} className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                  <input type="text" placeholder="Prenom..." value={filterPrenom} onChange={e => setFilterPrenom(e.target.value)} className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
                </div>
                <div className="relative">
                  <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.text.quaternary }} />
                  <input type="text" placeholder="Nom..." value={filterNom} onChange={e => setFilterNom(e.target.value)} className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className="w-full pl-3 pr-7 py-2.5 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}>
                    <option value="Tous" style={{ background: tokens.selectBg }}>Tous les statuts</option>
                    {statutDefs.map(s => (<option key={s.id} value={s.nom} style={{ background: tokens.selectBg }}>{s.nom}</option>))}
                    <option value="sans_statut" style={{ background: tokens.selectBg }}>Sans statut</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.text.quaternary }} />
                </div>
                <div className="relative">
                  <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'recent' | 'ancien')} className="w-full pl-3 pr-7 py-2.5 rounded-xl text-xs focus:outline-none appearance-none cursor-pointer transition-all" style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)} onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}>
                    <option value="recent" style={{ background: tokens.selectBg }}>Plus recent</option>
                    <option value="ancien" style={{ background: tokens.selectBg }}>Plus ancien</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.text.quaternary }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: tokens.text.quaternary, borderTopColor: tokens.accent.text }} />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.surface.hover }}>
              <Users className="w-5 h-5" style={{ color: tokens.table.footerText }} />
            </div>
            <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucun lead attribue</p>
            <p className="text-xs" style={{ color: tokens.table.footerText }}>L'administrateur peut vous attribuer des leads depuis le CRM</p>
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
              <DualScrollWrapper deps={[filtered.length]}>
                <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 'max-content' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tokens.table.headerBorder}`, background: tokens.table.headerBg }}>
                      <th className="px-3 py-3 w-28" style={colSep}></th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase w-12" style={{ color: tokens.table.headerText, ...colSep }}>#</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Nom</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Prenom</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Email</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Telephone</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Statut</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText, ...colSep }}>Acces</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
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
                      const actif = lead.actif !== false;
                      const isSelected = selected.has(lead.id);
                      const isWorkActive = workMode.enabled && workMode.activeId === lead.id;
                      const rowBg = isWorkActive ? 'rgba(249,115,22,0.04)' : isSelected ? tokens.table.rowSelected : 'transparent';
                      return (
                        <tr key={lead.id} data-row-id={lead.id} ref={el => { if (el) rowRefsMap.current.set(lead.id, el); else rowRefsMap.current.delete(lead.id); }} className="group transition-all duration-150" style={{ borderBottom: `1px solid ${tokens.table.rowBorder}`, background: rowBg }} onMouseEnter={e => { if (!isSelected && !isWorkActive) e.currentTarget.style.background = tokens.table.rowHover; }} onMouseLeave={e => { e.currentTarget.style.background = isWorkActive ? 'rgba(249,115,22,0.04)' : isSelected ? tokens.table.rowSelected : 'transparent'; }}>
                          <td className="px-3 py-3.5 w-28" style={colSep}>
                            {workMode.enabled ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => workMode.select(lead.id)}
                                  className="w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0"
                                  style={isWorkActive
                                    ? { background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)' }
                                    : { background: tokens.input.bg, border: `1px solid ${tokens.input.border}` }
                                  }
                                >
                                  {isWorkActive && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#f97316' }} />}
                                </button>
                                {isWorkActive && workMode.historyLength > 0 && (
                                  <div className="flex items-center gap-0.5 ml-1">
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
                              </div>
                            ) : (
                              <CheckBox checked={isSelected} onChange={() => toggleOne(lead.id)} />
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs tabular-nums" style={{ color: tokens.table.indexText, ...colSep }}>{i + 1}</td>
                          <td className="px-5 py-3.5" style={colSep}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: grad, boxShadow: '0 2px 6px rgba(0,0,0,0.3)', color: tokens.text.primary }}>{initials || '?'}</div>
                              <span className="text-sm font-semibold" style={{ color: tokens.table.cellText }}>{nom || '\u2014'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5" style={colSep}><span className="text-sm" style={{ color: tokens.text.secondary }}>{prenom || '\u2014'}</span></td>
                          <td className="px-5 py-3.5" style={colSep}>
                            <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} /><span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{email || '\u2014'}</span></div>
                          </td>
                          <td className="px-5 py-3.5" style={colSep}>
                            <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} /><span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{tel || '\u2014'}</span></div>
                          </td>
                          <td className="px-5 py-3.5" style={colSep}>
                            <div className="relative inline-flex items-center">
                              <span className="pointer-events-none absolute left-2 w-1.5 h-1.5 rounded-full flex-shrink-0 z-10" style={{ background: statut ? cfg.dot : 'rgba(148,163,184,0.5)', boxShadow: statut ? `0 0 4px ${cfg.dot}` : 'none' }} />
                              <select value={statut} onChange={e => handleStatut(lead.id, e.target.value)} className="rounded-lg text-xs font-semibold pl-5 pr-6 py-1 focus:outline-none cursor-pointer appearance-none" style={{ background: statut ? cfg.bg : 'rgba(148,163,184,0.08)', color: statut ? cfg.color : 'rgba(148,163,184,0.7)', border: `1px solid ${statut ? cfg.border : 'rgba(148,163,184,0.18)'}` }}>
                                <option value="" style={{ background: tokens.selectBg }}>Sans statut</option>
                                {statutDefs.map(s => (<option key={s.id} value={s.nom} style={{ background: tokens.selectBg }}>{s.nom}</option>))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-1.5 w-3 h-3" style={{ color: statut ? cfg.color : 'rgba(148,163,184,0.5)' }} />
                            </div>
                          </td>
                          <td className="px-5 py-3.5" style={colSep}>
                            <button onClick={() => handleToggleActif(lead.id, actif)} className="relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none" style={{ width: 36, height: 20, background: actif ? tokens.success.bg : tokens.surface.hover, border: actif ? `1px solid ${tokens.success.border}` : `1px solid ${tokens.surface.borderLight}` }} title={actif ? 'Desactiver' : 'Activer'}>
                              <span className="absolute rounded-full transition-all duration-300" style={{ width: 12, height: 12, left: actif ? 20 : 3, background: actif ? tokens.success.text : tokens.text.quaternary, boxShadow: actif ? `0 0 6px ${tokens.success.text}` : 'none' }} />
                            </button>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setDetailLead({ lead, index: i })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}><ChevronDown className="w-3 h-3" />Detail</button>
                              <button onClick={() => onConnectAsClient?.({ id: lead.id, nom, prenom, email })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}><LogIn className="w-3 h-3" />Connect</button>
                              <button onClick={() => onOpenChat?.({ id: lead.id, nom, prenom, email, tel })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.warning.bg, border: `1px solid ${tokens.warning.border}`, color: tokens.warning.text }}><MessageCircle className="w-3 h-3" />Chat</button>
                              <button onClick={() => onOpenRdv?.({ id: lead.id, nom, prenom, email, tel })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', color: '#22d3ee' }}><CalendarClock className="w-3 h-3" />RDV</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DualScrollWrapper>
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
                        <span>Acces</span>
                        <button
                          onClick={() => handleToggleActif(lead.id, actif)}
                          className="relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none"
                          style={{ width: 32, height: 18, background: actif ? tokens.success.bg : tokens.surface.hover, border: actif ? `1px solid ${tokens.success.border}` : `1px solid ${tokens.surface.borderLight}` }}
                          title={actif ? 'Desactiver' : 'Activer'}
                        >
                          <span className="absolute rounded-full transition-all duration-300" style={{ width: 10, height: 10, left: actif ? 18 : 3, background: actif ? tokens.success.text : tokens.text.quaternary, boxShadow: actif ? `0 0 6px ${tokens.success.text}` : 'none' }} />
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
              {selected.size > 0 && (<p className="text-xs" style={{ color: tokens.danger.text }}>{selected.size} selectionne{selected.size > 1 ? 's' : ''}</p>)}
            </div>
          </>
        )}
      </div>

      {detailLead && (
        <VendorLeadDetailModal
          lead={detailLead.lead}
          gradIndex={detailLead.index}
          onClose={() => setDetailLead(null)}
          statutDefs={statutDefs}
          onConnect={(client) => { setDetailLead(null); onConnectAsClient?.(client); }}
        />
      )}
    </div>
  );
}
