import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkMode } from '../../../../hooks/useWorkMode';
import { useSimulation } from '../../../../contexts/SimulationContext';
import { supabase } from '../../../../lib/supabase';
import type { ImportedLead, Vendor, StatutDef } from './types';

export function useCrmData() {
  const { isSimulating } = useSimulation();
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
  const recentUpdates = useRef<Map<string, number>>(new Map());

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
    if (isSimulating) return;
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
      .order('imported_at', { ascending: false })
      .order('id', { ascending: true });
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        const inserted = payload.new as ImportedLead;
        setLeads(prev => prev.some(l => l.id === inserted.id) ? prev : [inserted, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' }, (payload) => {
        setLeads(prev => prev.filter(l => l.id !== (payload.old as { id: string }).id));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const updated = payload.new as ImportedLead;
        const lockedUntil = recentUpdates.current.get(updated.id);
        if (lockedUntil && Date.now() < lockedUntil) return;
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
  }, [loadStatuts]);

  const handleStatut = async (id: string, statut: string) => {
    if (isSimulating) return;
    const prev = leads.find(l => l.id === id)?.statut;
    recentUpdates.current.set(id, Date.now() + 3000);
    setLeads(ls => ls.map(l => l.id === id ? { ...l, statut } : l));
    const { error } = await supabase.from('leads').update({ statut }).eq('id', id);
    if (error) {
      setLeads(ls => ls.map(l => l.id === id ? { ...l, statut: prev } : l));
    }
    recentUpdates.current.delete(id);
  };

  const handleToggleActif = async (id: string, current: boolean) => {
    if (isSimulating) return;
    setLeads(ls => ls.map(l => l.id === id ? { ...l, actif: !current } : l));
    const { error } = await supabase.from('leads').update({ actif: !current }).eq('id', id);
    if (error) setLeads(ls => ls.map(l => l.id === id ? { ...l, actif: current } : l));
  };

  const handleDeleteSelected = async () => {
    if (isSimulating) return;
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
        if (nomStatut !== '' && nomStatut !== 'Nouveau') return false;
      } else if (statutFilter !== 'Tous' && (l.statut || 'Nouveau') !== statutFilter) return false;
      if (filterVendor === 'admin' && l.vendor_id !== null) return false;
      if (filterVendor !== 'tous' && filterVendor !== 'admin' && l.vendor_id !== filterVendor) return false;
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.imported_at).getTime();
      const db = new Date(b.imported_at).getTime();
      const diff = sortOrder === 'recent' ? db - da : da - db;
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
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

  return {
    leads, statutDefs, vendors, loading, filtered, selected, setSelected, deleting,
    allChecked, someChecked, toggleAll, toggleOne,
    filterVendor, setFilterVendor,
    filterEmail, setFilterEmail, filterTel, setFilterTel,
    filterPrenom, setFilterPrenom, filterNom, setFilterNom,
    statutFilter, setStatutFilter, sortOrder, setSortOrder,
    detailLead, setDetailLead, showTransfer, setShowTransfer,
    workMode, cardRefsMap, rowRefsMap,
    topScrollRef, bottomScrollRef, topInnerRef,
    handleTopScroll, handleBottomScroll,
    handleStatut, handleToggleActif, handleDeleteSelected, handleTransfer,
  };
}
