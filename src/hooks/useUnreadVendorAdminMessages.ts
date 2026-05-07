import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useUnreadVendorAdminMessages(vendorDbId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const justMarked = useRef(false);

  const load = useCallback(async () => {
    if (justMarked.current) {
      justMarked.current = false;
      return;
    }
    if (!vendorDbId) { setUnreadCount(0); setLatestAt(null); return; }

    const { data } = await supabase
      .from('vendor_admin_messages')
      .select('created_at')
      .eq('vendor_id', vendorDbId)
      .eq('sender', 'admin')
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
  }, [vendorDbId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!vendorDbId) return;
    const ch = supabase
      .channel(`vendor-unread-admin-notif-${vendorDbId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_admin_messages' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [vendorDbId, load]);

  const markAsRead = useCallback(async () => {
    if (!vendorDbId) return;

    justMarked.current = true;
    setUnreadCount(0);
    setLatestAt(null);

    await supabase
      .from('vendor_admin_messages')
      .update({ read: true })
      .eq('vendor_id', vendorDbId)
      .eq('sender', 'admin')
      .eq('read', false)
      .eq('deleted', false);
  }, [vendorDbId]);

  return { unreadCount, latestAt, markAsRead, reload: load };
}
