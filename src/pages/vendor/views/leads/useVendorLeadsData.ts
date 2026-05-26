import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useWorkMode } from '../../../../hooks/useWorkMode';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import type { ImportedLead, StatutDef } from '../vendorLeadsTypes';

export function useVendorLeadsData(vendorId: string | null) {
  const companyId = useCompanyId();
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
  const hasFetched = useRef(false);
  const loadId = useRef(0);
  const recentUpdates = useRef<Map<string, number>>(new Map());

  const load = useCallback(async () => {
    if (!vendorId) return;
    const thisLoad = ++loadId.current;

    if (!hasFetched.current) setLoading(true);

    const statutsQuery = supabase
      .from('statuts')
      .select('id, nom, couleur');
    if (companyId) statutsQuery.eq('company_id', companyId);
    statutsQuery.order('created_at', { ascending: true });

    const [leadsRes, statutsRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id, data, imported_at, statut, actif, vendor_id, ai_enabled')
        .eq('vendor_id', vendorId)
        .order('imported_at', { ascending: false })
        .order('id', { ascending: true }),
      statutsQuery,
    ]);

    if (thisLoad !== loadId.current) return;

    if (leadsRes.error) {
      setLoading(false);
      return;
    }

    setLeads((leadsRes.data ?? []) as ImportedLead[]);
    setStatutDefs((statutsRes.data ?? []) as StatutDef[]);
    hasFetched.current = true;
    setLoading(false);
  }, [vendorId, companyId]);

  useEffect(() => {
    if (!vendorId) return;
    load();
  }, [vendorId, load]);

  useEffect(() => {
    if (!workMode.enabled || !workMode.activeId) return;
    const t = setTimeout(() => {
      const el = cardRefsMap.current.get(workMode.activeId!) ?? rowRefsMap.current.get(workMode.activeId!);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }, 50);
    return () => clearTimeout(t);
  }, [workMode.enabled, workMode.activeId]);

  useEffect(() => {
    if (!vendorId) return;
    const channel = supabase
      .channel(`vendor-leads-${vendorId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        const inserted = payload.new as ImportedLead;
        if (inserted.vendor_id === vendorId) {
          setLeads(prev => prev.some(l => l.id === inserted.id) ? prev : [inserted, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' }, (payload) => {
        setLeads(prev => prev.filter(l => l.id !== (payload.old as { id: string }).id));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        const updated = payload.new as ImportedLead;
        const lockedUntil = recentUpdates.current.get(updated.id);
        if (lockedUntil && Date.now() < lockedUntil) return;
        if (updated.vendor_id === vendorId) {
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
  }, [vendorId]);

  const handleStatut = async (id: string, statut: string) => {
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
    setLeads(ls => ls.map(l => l.id === id ? { ...l, actif: !current } : l));
    const { error } = await supabase.from('leads').update({ actif: !current }).eq('id', id);
    if (error) setLeads(ls => ls.map(l => l.id === id ? { ...l, actif: current } : l));
  };

  const handleToggleAi = async (id: string, current: boolean) => {
    recentUpdates.current.set(id, Date.now() + 3000);
    setLeads(ls => ls.map(l => l.id === id ? { ...l, ai_enabled: !current } : l));
    const { error } = await supabase.from('leads').update({ ai_enabled: !current }).eq('id', id);
    if (error) setLeads(ls => ls.map(l => l.id === id ? { ...l, ai_enabled: current } : l));
    recentUpdates.current.delete(id);
  };

  const filtered = useMemo(() => {
    const fNom = filterNom.toLowerCase();
    const fPrenom = filterPrenom.toLowerCase();
    const fEmail = filterEmail.toLowerCase();
    const fTel = filterTel.toLowerCase();

    const result = leads.filter(l => {
      if (fNom && !(l.data['Nom'] ?? '').toLowerCase().includes(fNom)) return false;
      if (fPrenom && !(l.data['Prenom'] ?? '').toLowerCase().includes(fPrenom)) return false;
      if (fEmail && !(l.data['Email'] ?? '').toLowerCase().includes(fEmail)) return false;
      if (fTel && !(l.data['Telephone'] ?? '').toLowerCase().includes(fTel)) return false;
      if (statutFilter === 'sans_statut') {
        const nomStatut = l.statut ?? '';
        if (nomStatut !== '' && nomStatut !== 'Nouveau') return false;
      } else if (statutFilter !== 'Tous' && (l.statut || 'Nouveau') !== statutFilter) return false;
      return true;
    });

    result.sort((a, b) => {
      const cmp = sortOrder === 'ancien'
        ? a.imported_at.localeCompare(b.imported_at)
        : b.imported_at.localeCompare(a.imported_at);
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });
    return result;
  }, [leads, filterNom, filterPrenom, filterEmail, filterTel, statutFilter, sortOrder]);

  const filteredIds = useMemo(() => filtered.map(l => l.id), [filtered]);
  const allChecked = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));
  const someChecked = filteredIds.some(id => selected.has(id));
  const toggleAll = () => {
    if (allChecked) { setSelected(prev => { const n = new Set(prev); filteredIds.forEach(id => n.delete(id)); return n; }); }
    else { setSelected(prev => { const n = new Set(prev); filteredIds.forEach(id => n.add(id)); return n; }); }
  };
  const toggleOne = (id: string) => { setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };

  return {
    leads, statutDefs, loading, filtered, selected, setSelected,
    allChecked, someChecked, toggleAll, toggleOne,
    filterEmail, setFilterEmail, filterTel, setFilterTel,
    filterPrenom, setFilterPrenom, filterNom, setFilterNom,
    statutFilter, setStatutFilter, sortOrder, setSortOrder,
    mobileFiltersOpen, setMobileFiltersOpen,
    detailLead, setDetailLead,
    workMode, cardRefsMap, rowRefsMap,
    handleStatut, handleToggleActif, handleToggleAi,
  };
}
