import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useUnreadFromSuperAdmin(adminAuthId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const justMarked = useRef(false);

  const load = useCallback(async () => {
    if (!adminAuthId) return;
    if (justMarked.current) {
      justMarked.current = false;
      return;
    }

    const { data } = await supabase
      .from('super_admin_messages')
      .select('created_at')
      .eq('admin_id', adminAuthId)
      .eq('sender_role', 'super_admin')
      .eq('read', false)
      .eq('deleted', false);

    if (!data || data.length === 0) {
      setUnreadCount(0);
      setLatestAt(null);
      return;
    }

    setUnreadCount(data.length);
    const latest = data.reduce((max, m) => m.created_at > max ? m.created_at : max, data[0].created_at);
    setLatestAt(latest);
  }, [adminAuthId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!adminAuthId) return;
    const ch = supabase
      .channel(`admin-unread-sa-notif-${adminAuthId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_admin_messages' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [adminAuthId, load]);

  const markAsRead = useCallback(async () => {
    if (!adminAuthId) return;
    justMarked.current = true;
    setUnreadCount(0);
    setLatestAt(null);

    await supabase
      .from('super_admin_messages')
      .update({ read: true })
      .eq('admin_id', adminAuthId)
      .eq('sender_role', 'super_admin')
      .eq('read', false)
      .eq('deleted', false);
  }, [adminAuthId]);

  return { unreadCount, latestAt, markAsRead, reload: load };
}
