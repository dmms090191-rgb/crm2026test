import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface UnreadEntry {
  clientAuthId: string;
  leadId: string;
  prenom: string;
  nom: string;
  email: string;
  count: number;
  latestAt: string;
}

export function useUnreadClientMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadEntries, setUnreadEntries] = useState<UnreadEntry[]>([]);
  const justMarked = useRef(false);

  const load = useCallback(async () => {
    if (justMarked.current) { justMarked.current = false; return; }
    const { data: msgs } = await supabase
      .from('client_messages')
      .select('client_auth_id, created_at')
      .eq('sender', 'client')
      .eq('read', false)
      .eq('deleted', false)
      .is('vendor_id', null);

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

    const authIds = [...grouped.keys()];

    const { data: leads } = await supabase
      .from('leads')
      .select('id, data, vendor_id, prenom, nom, email')
      .eq('actif', true)
      .is('vendor_id', null);

    const entries: UnreadEntry[] = [];
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin-unread-client-notif')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_messages' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const markAsRead = useCallback(async (clientAuthId: string) => {
    if (!clientAuthId) return;
    justMarked.current = true;
    const entry = unreadEntries.find(e => e.clientAuthId === clientAuthId);
    setUnreadEntries(prev => prev.filter(e => e.clientAuthId !== clientAuthId));
    setUnreadCount(prev => Math.max(0, prev - (entry?.count ?? 0)));

    await supabase
      .from('client_messages')
      .update({ read: true })
      .eq('client_auth_id', clientAuthId)
      .eq('sender', 'client')
      .eq('read', false)
      .is('vendor_id', null);
  }, [unreadEntries]);

  return { unreadCount, unreadEntries, markAsRead, reload: load };
}
