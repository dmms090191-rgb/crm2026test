import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface VendorClientNotifEntry {
  clientAuthId: string;
  leadId: string;
  prenom: string;
  nom: string;
  email: string;
  count: number;
  latestAt: string;
}

export function useUnreadVendorClientMessages(vendorDbId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadEntries, setUnreadEntries] = useState<VendorClientNotifEntry[]>([]);
  const justMarked = useRef(false);

  const load = useCallback(async () => {
    if (justMarked.current) {
      justMarked.current = false;
      return;
    }
    if (!vendorDbId) {
      setUnreadCount(0);
      setUnreadEntries([]);
      return;
    }

    const { data: msgs } = await supabase
      .from('client_messages')
      .select('client_auth_id, created_at')
      .eq('sender', 'client')
      .eq('read', false)
      .eq('deleted', false)
      .eq('vendor_id', vendorDbId);

    if (!msgs || msgs.length === 0) {
      setUnreadCount(0);
      setUnreadEntries([]);
      return;
    }

    const grouped = new Map<string, { count: number; latestAt: string }>();
    for (const m of msgs) {
      const existing = grouped.get(m.client_auth_id);
      if (!existing) {
        grouped.set(m.client_auth_id, { count: 1, latestAt: m.created_at });
      } else {
        existing.count++;
        if (m.created_at > existing.latestAt) existing.latestAt = m.created_at;
      }
    }

    const { data: leads } = await supabase
      .from('leads')
      .select('id, data, vendor_id, prenom, nom, email')
      .eq('actif', true)
      .eq('vendor_id', vendorDbId);

    const authIds = [...grouped.keys()];
    const entries: VendorClientNotifEntry[] = [];
    for (const lead of leads ?? []) {
      const authId = lead.data?.['AuthId'] ?? lead.data?.['auth_id'] ?? lead.id;
      if (authIds.includes(authId)) {
        const g = grouped.get(authId)!;
        entries.push({
          clientAuthId: authId,
          leadId: lead.id,
          prenom: lead.prenom ?? lead.data?.['Prenom'] ?? lead.data?.['prenom'] ?? '',
          nom: lead.nom ?? lead.data?.['Nom'] ?? lead.data?.['nom'] ?? '',
          email: lead.email ?? lead.data?.['Email'] ?? lead.data?.['email'] ?? '',
          count: g.count,
          latestAt: g.latestAt,
        });
      }
    }

    entries.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
    setUnreadEntries(entries);
    setUnreadCount(entries.reduce((acc, e) => acc + e.count, 0));
  }, [vendorDbId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!vendorDbId) return;
    const ch = supabase
      .channel(`vendor-unread-client-notif-${vendorDbId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_messages' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [vendorDbId, load]);

  const markAsRead = useCallback(async (clientAuthId: string) => {
    if (!vendorDbId || !clientAuthId) return;

    justMarked.current = true;
    setUnreadEntries(prev => prev.filter(e => e.clientAuthId !== clientAuthId));
    setUnreadCount(prev => {
      const entry = unreadEntries.find(e => e.clientAuthId === clientAuthId);
      return Math.max(0, prev - (entry?.count ?? 0));
    });

    await supabase
      .from('client_messages')
      .update({ read: true })
      .eq('client_auth_id', clientAuthId)
      .eq('sender', 'client')
      .eq('read', false)
      .eq('deleted', false)
      .eq('vendor_id', vendorDbId);
  }, [vendorDbId, unreadEntries]);

  return { unreadCount, unreadEntries, markAsRead, reload: load };
}
