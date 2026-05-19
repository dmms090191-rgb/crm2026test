import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCompanyId } from './useCompanyId';

export interface VendorNotifEntry {
  vendorId: string;
  firstName: string;
  lastName: string;
  email: string;
  count: number;
  latestAt: string;
}

export function useUnreadVendorMessages() {
  const companyId = useCompanyId();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadEntries, setUnreadEntries] = useState<VendorNotifEntry[]>([]);
  const entriesRef = useRef<VendorNotifEntry[]>([]);
  const justMarked = useRef(false);

  const load = useCallback(async () => {
    if (justMarked.current) {
      justMarked.current = false;
      return;
    }
    if (!companyId) return;

    const { data: msgs } = await supabase
      .from('vendor_admin_messages')
      .select('vendor_id, created_at')
      .eq('company_id', companyId)
      .eq('sender', 'vendor')
      .eq('read', false)
      .eq('deleted', false);

    if (!msgs || msgs.length === 0) {
      setUnreadCount(0);
      setUnreadEntries([]);
      return;
    }

    const grouped = new Map<string, { count: number; latestAt: string }>();
    for (const m of msgs) {
      if (!m.vendor_id) continue;
      const existing = grouped.get(m.vendor_id);
      if (!existing) {
        grouped.set(m.vendor_id, { count: 1, latestAt: m.created_at });
      } else {
        existing.count++;
        if (m.created_at > existing.latestAt) existing.latestAt = m.created_at;
      }
    }

    const vendorIds = [...grouped.keys()];
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, first_name, last_name, email')
      .eq('company_id', companyId)
      .in('id', vendorIds);

    const entries: VendorNotifEntry[] = [];
    for (const v of vendors ?? []) {
      const g = grouped.get(v.id);
      if (g) {
        entries.push({
          vendorId: v.id,
          firstName: v.first_name ?? '',
          lastName: v.last_name ?? '',
          email: v.email ?? '',
          count: g.count,
          latestAt: g.latestAt,
        });
      }
    }

    entries.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
    entriesRef.current = entries;
    setUnreadEntries(entries);
    setUnreadCount(entries.reduce((acc, e) => acc + e.count, 0));
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin-unread-vendor-notif')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_admin_messages' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const markAsRead = useCallback(async (vendorId: string) => {
    if (!vendorId) return;

    justMarked.current = true;
    const entry = entriesRef.current.find(e => e.vendorId === vendorId);
    setUnreadEntries(prev => {
      const next = prev.filter(e => e.vendorId !== vendorId);
      entriesRef.current = next;
      return next;
    });
    setUnreadCount(prev => Math.max(0, prev - (entry?.count ?? 0)));

    await supabase
      .from('vendor_admin_messages')
      .update({ read: true })
      .eq('vendor_id', vendorId)
      .eq('sender', 'vendor')
      .eq('read', false)
      .eq('deleted', false);
  }, []);

  return { unreadCount, unreadEntries, markAsRead, reload: load };
}
