import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCompanyId } from '../hooks/useCompanyId';

const STATUT_NOUVEAU = 'Nouveau';

export interface SansStatutLead {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  vendor_id: string | null;
}

export interface VendorCount {
  vendorId: string;
  vendorName: string;
  count: number;
}

interface SansStatutStatsAdmin {
  count: number;
  adminCount: number;
  byVendor: VendorCount[];
  leads: SansStatutLead[];
  vendors: { id: string; name: string }[];
  loading: boolean;
  reload: () => void;
}

interface SansStatutStatsVendor {
  count: number;
  leads: SansStatutLead[];
  loading: boolean;
  reload: () => void;
}

export function useSansStatutStats(role: 'admin'): SansStatutStatsAdmin;
export function useSansStatutStats(role: 'vendor', vendorId: string | null): SansStatutStatsVendor;
export function useSansStatutStats(role: 'admin' | 'vendor', vendorId?: string | null): SansStatutStatsAdmin | SansStatutStatsVendor {
  const companyId = useCompanyId();
  const [count, setCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [byVendor, setByVendor] = useState<VendorCount[]>([]);
  const [leads, setLeads] = useState<SansStatutLead[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    if (role === 'vendor') {
      if (!vendorId) {
        setCount(0);
        setLeads([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('leads')
        .select('id, prenom, nom, email, telephone, vendor_id')
        .in('statut', [STATUT_NOUVEAU, ''])
        .eq('vendor_id', vendorId);
      const results = (data ?? []) as SansStatutLead[];
      setCount(results.length);
      setLeads(results);
      setLoading(false);
      return;
    }

    if (!companyId) { setLoading(false); return; }
    const [leadsRes, vendorsRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id, prenom, nom, email, telephone, vendor_id')
        .eq('company_id', companyId)
        .in('statut', [STATUT_NOUVEAU, '']),
      supabase
        .from('vendors')
        .select('id, first_name, last_name')
        .eq('company_id', companyId),
    ]);

    const allLeads = (leadsRes.data ?? []) as SansStatutLead[];
    const allVendors = (vendorsRes.data ?? []).map((v: { id: string; first_name: string; last_name: string }) => ({
      id: v.id,
      name: [v.first_name, v.last_name].filter(Boolean).join(' ') || 'Sans nom',
    }));

    setLeads(allLeads);
    setVendors(allVendors);
    setCount(allLeads.length);
    setAdminCount(allLeads.filter(l => !l.vendor_id).length);

    const vendorMap = new Map<string, number>();
    allLeads.forEach(l => {
      if (l.vendor_id) {
        vendorMap.set(l.vendor_id, (vendorMap.get(l.vendor_id) ?? 0) + 1);
      }
    });
    setByVendor(
      allVendors
        .filter((v: { id: string }) => vendorMap.has(v.id))
        .map((v: { id: string; name: string }) => ({ vendorId: v.id, vendorName: v.name, count: vendorMap.get(v.id) ?? 0 }))
    );

    setLoading(false);
  }, [role, vendorId, companyId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ts = Date.now();
    const channel = supabase
      .channel(`sans-statut-${role}-${vendorId ?? 'all'}-${ts}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load, role, vendorId]);

  if (role === 'admin') {
    return { count, adminCount, byVendor, leads, vendors, loading, reload: load } as SansStatutStatsAdmin;
  }
  return { count, leads, loading, reload: load } as SansStatutStatsVendor;
}
