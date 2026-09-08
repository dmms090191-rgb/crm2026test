import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useUnreadAdminMessages(clientAuthId: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const [latestContent, setLatestContent] = useState('');
  const justMarked = useRef(false);

  const load = useCallback(async () => {
    if (justMarked.current) {
      justMarked.current = false;
      return;
    }
    if (!clientAuthId) { setUnreadCount(0); setLatestAt(null); setLatestContent(''); return; }

    const { data } = await supabase
      .from('client_messages')
      .select('created_at, content')
      .eq('client_auth_id', clientAuthId)
      .or('sender.eq.admin,sender.eq.vendor')
      .eq('read', false)
      .eq('deleted', false);

    if (!data || data.length === 0) {
      setUnreadCount(0);
      setLatestAt(null);
      setLatestContent('');
      return;
    }

    setUnreadCount(data.length);
    // Le message le plus recent fournit la date ET l apercu.
    const newest = data.reduce((a, b) => (b.created_at > a.created_at ? b : a), data[0]);
    setLatestAt(newest.created_at);
    setLatestContent(newest.content ?? '');
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
    setLatestContent('');

    await supabase
      .from('client_messages')
      .update({ read: true })
      .eq('client_auth_id', clientAuthId)
      .or('sender.eq.admin,sender.eq.vendor')
      .eq('read', false)
      .eq('deleted', false);
  }, [clientAuthId]);

  return { unreadCount, latestAt, latestContent, markAsRead, reload: load };
}