import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useCompanyId } from '../../../hooks/useCompanyId';
import { sendPushForMessage } from '../../../lib/sendPushForMessage';

interface VendorChatAdminProps {
  vendorName: string;
  vendorDbId?: string | null;
  vendorAuthId?: string;
  onAdminMessageViewed?: () => void;
  isAdmin?: boolean;
}

const ADMIN_CONTACT_BASE = {
  id: 'admin',
  displayName: 'Administrateur',
  subtitle: 'Votre responsable',
  initial: 'A',
};

export default function VendorChatAdmin({ vendorName, vendorDbId, vendorAuthId, onAdminMessageViewed, isAdmin }: VendorChatAdminProps) {
  const tokens = useThemeTokens();
  const companyId = useCompanyId();
  const [userId, setUserId] = useState<string | null>(vendorAuthId ?? null);
  const [vendorId, setVendorId] = useState<string | null>(vendorDbId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>('admin');

  useEffect(() => {
    if (vendorDbId) setVendorId(vendorDbId);
    if (vendorAuthId) { setUserId(vendorAuthId); return; }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      if (!vendorDbId) {
        const { data: vendorRow } = await supabase
          .from('vendors')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (vendorRow) setVendorId(vendorRow.id);
      }
    });
  }, [vendorAuthId, vendorDbId]);

  const loadMessages = useCallback(async (showLoader = true) => {
    if (!userId && !vendorId) { setLoading(false); return; }
    if (showLoader) setLoading(true);
    try {
      let query = supabase.from('vendor_admin_messages').select('*');
      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      } else {
        query = query.eq('vendor_auth_id', userId!);
      }
      const { data } = await query.or('deleted.is.null,deleted.eq.false').order('created_at', { ascending: true });
      setMessages((data ?? []) as ChatMessage[]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [userId, vendorId]);

  useEffect(() => { loadMessages(true); }, [userId, vendorId, loadMessages]);

  const markingRef = useRef(false);
  const onAdminMessageViewedRef = useRef(onAdminMessageViewed);
  onAdminMessageViewedRef.current = onAdminMessageViewed;

  useEffect(() => {
    if (!vendorId || messages.length === 0 || markingRef.current) return;
    const hasUnread = messages.some(m => m.sender === 'admin' && m.read === false && !m.deleted);
    if (hasUnread) {
      markingRef.current = true;
      supabase
        .from('vendor_admin_messages')
        .update({ read: true })
        .eq('vendor_id', vendorId)
        .eq('sender', 'admin')
        .eq('read', false)
        .eq('deleted', false)
        .then(() => {
          onAdminMessageViewedRef.current?.();
          markingRef.current = false;
        });
    }
  }, [vendorId, messages]);

  useEffect(() => {
    if (!userId && !vendorId) return;
    const ch = supabase
      .channel(`vendor-admin-chat-${vendorId ?? userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_admin_messages' }, () => loadMessages(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, vendorId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!userId) throw new Error('missing_context');
    const payload = {
      content: content || '',
      sender: 'vendor' as const,
      vendor_auth_id: userId,
      vendor_id: vendorId ?? null,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
      ...(companyId ? { company_id: companyId } : {}),
    };

    setMessages(prev => [...prev, {
      id: `_local_${Date.now()}`,
      content: payload.content,
      sender: payload.sender,
      vendor_auth_id: payload.vendor_auth_id,
      vendor_id: payload.vendor_id ?? undefined,
      created_at: new Date().toISOString(),
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    } as ChatMessage]);

    supabase.from('vendor_admin_messages').insert(payload).then(({ error }) => {
      if (error) console.error('[VendorChatAdmin] insert error:', error.message);
      loadMessages(false).catch(() => {});
    });
    if (companyId) {
      supabase.from('registrations').select('auth_user_id').eq('company_id', companyId).eq('role', 'admin').then(({ data }) => {
        (data ?? []).forEach(r => {
          if (r.auth_user_id && r.auth_user_id !== userId) {
            sendPushForMessage({ targetUserId: r.auth_user_id, title: 'Talvex', body: 'Nouveau message vendeur' });
          }
        });
      });
    }
  }, [userId, vendorId, loadMessages]);

  const handleDelete = useCallback(async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    supabase.from('vendor_admin_messages').delete().eq('id', id);
  }, []);

  const lastMsg = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].deleted) return messages[i];
    }
    return null;
  }, [messages]);

  const adminContact: ChatContact = useMemo(() => ({
    ...ADMIN_CONTACT_BASE,
    lastMessage: lastMsg?.content || undefined,
    lastMessageAt: lastMsg?.created_at || undefined,
    lastMessageSender: lastMsg?.sender || undefined,
  }), [lastMsg]);

  return (
    <div className="flex flex-col flex-1 space-y-2 md:space-y-4" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base md:text-xl font-bold" style={{ color: tokens.heading.primary }}>Chat Admin</h2>
          <p className="text-[11px] md:text-xs mt-0.5 hidden sm:block" style={{ color: tokens.text.quaternary }}>Communiquez avec votre responsable</p>
        </div>
        <div
          className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(14,165,233,0.08)', boxShadow: '0 0 16px rgba(14,165,233,0.15)' }}
        >
          <MessageSquare className="w-4 h-4 text-sky-400" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <MessagingPanel
          contacts={[adminContact]}
          selectedContactId={selectedId}
          onSelectContact={setSelectedId}
          messages={messages}
          currentRole="vendor"
          currentUserId={userId ?? ''}
          displayName={vendorName}
          accentColor="#22d3ee"
          accentRgb="34,211,238"
          onSendMessage={handleSend}
          onDeleteMessage={handleDelete}
          isAdmin={isAdmin}
          loading={loading}
        />
      </div>
    </div>
  );
}
