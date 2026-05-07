import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useUnreadAdminMessages(clientAuthId: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const justMarked = useRef(false);

  const load = useCallback(async () => {
    if (justMarked.current) {
      justMarked.current = false;
      return;
    }
    if (!clientAuthId) { setUnreadCount(0); setLatestAt(null); return; }

    const { data } = await supabase
      .from('client_messages')
      .select('created_at')
      .eq('client_auth_id', clientAuthId)
      .or('sender.eq.admin,sender.eq.vendor')
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
  }, [clientAuthId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!clientAuthId) return;
    const ch = supabase
      .channel(`client-unread-admin-notif-${clientAuthId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_messages' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientAuthId, load]);

  const markAsRead = useCallback(async () => {
    if (!clientAuthId) return;

    justMarked.current = true;
    setUnreadCount(0);
    setLatestAt(null);

    await supabase
      .from('client_messages')
      .update({ read: true })
      .eq('client_auth_id', clientAuthId)
      .or('sender.eq.admin,sender.eq.vendor')
      .eq('read', false)
      .eq('deleted', false);
  }, [clientAuthId]);

  return { unreadCount, latestAt, markAsRead, reload: load };
}