import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useWorkMode } from '../../../../hooks/useWorkMode';
import type { ImportedLead, StatutDef } from '../vendorLeadsTypes';

export function useVendorLeadsData(vendorId: string | null) {
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
    const query = supabase.from('leads').select('id, data, imported_at, statut, actif, vendor_id').order('imported_at', { ascending: false });
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

  return {
    leads, statutDefs, loading, filtered, selected,
    allChecked, someChecked, toggleAll, toggleOne,
    filterEmail, setFilterEmail, filterTel, setFilterTel,
    filterPrenom, setFilterPrenom, filterNom, setFilterNom,
    statutFilter, setStatutFilter, sortOrder, setSortOrder,
    mobileFiltersOpen, setMobileFiltersOpen,
    detailLead, setDetailLead,
    workMode, cardRefsMap, rowRefsMap,
    handleStatut, handleToggleActif,
  };
}
