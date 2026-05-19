import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface AdminNotifEntry {
  adminId: string;
  firstName: string;
  lastName: string;
  email: string;
  count: number;
  latestAt: string;
}

export function useUnreadSuperAdminMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadEntries, setUnreadEntries] = useState<AdminNotifEntry[]>([]);
  const entriesRef = useRef<AdminNotifEntry[]>([]);
  const justMarked = useRef(false);

  const load = useCallback(async () => {
    if (justMarked.current) {
      justMarked.current = false;
      return;
    }

    const { data: msgs } = await supabase
      .from('super_admin_messages')
      .select('admin_id, created_at')
      .eq('sender_role', 'admin')
      .eq('read', false)
      .eq('deleted', false);

    if (!msgs || msgs.length === 0) {
      setUnreadCount(0);
      setUnreadEntries([]);
      entriesRef.current = [];
      return;
    }

    const grouped = new Map<string, { count: number; latestAt: string }>();
    for (const m of msgs) {
      if (!m.admin_id) continue;
      const existing = grouped.get(m.admin_id);
      if (!existing) {
        grouped.set(m.admin_id, { count: 1, latestAt: m.created_at });
      } else {
        existing.count++;
        if (m.created_at > existing.latestAt) existing.latestAt = m.created_at;
      }
    }

    const adminIds = [...grouped.keys()];
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-admins`,
      {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
          'Content-Type': 'application/json',
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      }
    );
    const json = await res.json();
    const admins: { id: string; email: string; first_name: string; last_name: string }[] = json.admins || [];

    const entries: AdminNotifEntry[] = [];
    for (const a of admins) {
      const g = grouped.get(a.id);
      if (g) {
        entries.push({
          adminId: a.id,
          firstName: a.first_name ?? '',
          lastName: a.last_name ?? '',
          email: a.email ?? '',
          count: g.count,
          latestAt: g.latestAt,
        });
      }
    }
    for (const [aid, g] of grouped) {
      if (!entries.find(e => e.adminId === aid)) {
        entries.push({ adminId: aid, firstName: '', lastName: '', email: aid, count: g.count, latestAt: g.latestAt });
      }
    }

    entries.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
    entriesRef.current = entries;
    setUnreadEntries(entries);
    setUnreadCount(entries.reduce((acc, e) => acc + e.count, 0));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('sa-unread-admin-notif')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_admin_messages' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const markAsRead = useCallback(async (adminId: string) => {
    if (!adminId) return;
    justMarked.current = true;
    const entry = entriesRef.current.find(e => e.adminId === adminId);
    setUnreadEntries(prev => {
      const next = prev.filter(e => e.adminId !== adminId);
      entriesRef.current = next;
      return next;
    });
    setUnreadCount(prev => Math.max(0, prev - (entry?.count ?? 0)));

    await supabase
      .from('super_admin_messages')
      .update({ read: true })
      .eq('admin_id', adminId)
      .eq('sender_role', 'admin')
      .eq('read', false)
      .eq('deleted', false);
  }, []);

  return { unreadCount, unreadEntries, markAsRead, reload: load };
}
