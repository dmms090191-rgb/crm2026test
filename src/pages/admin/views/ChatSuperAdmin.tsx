import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel from '../../../components/chat/ChatView';
import type { ChatMessage, ChatContact } from '../../../components/chat/chatTypes';
import { sendPushForMessage } from '../../../lib/sendPushForMessage';

interface ChatSuperAdminProps {
  adminIdOverride?: string | null;
  onMessageSent?: () => void;
  onSuperAdminViewed?: () => void;
}

export default function ChatSuperAdmin({ adminIdOverride, onMessageSent, onSuperAdminViewed }: ChatSuperAdminProps) {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [superAdminId, setSuperAdminId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAuthUserId(user.id);
    });
  }, []);

  const adminId = adminIdOverride ?? authUserId;

  const onSuperAdminViewedRef = useRef(onSuperAdminViewed);
  onSuperAdminViewedRef.current = onSuperAdminViewed;
  const markingRef = useRef(false);

  useEffect(() => {
    if (!adminId || messages.length === 0 || markingRef.current) return;
    const hasUnread = messages.some(m => m.sender === 'super_admin' && m.read === false && !m.deleted);
    if (hasUnread) {
      markingRef.current = true;
      supabase
        .from('super_admin_messages')
        .update({ read: true })
        .eq('admin_id', adminId)
        .eq('sender_role', 'super_admin')
        .eq('read', false)
        .eq('deleted', false)
        .then(() => {
          onSuperAdminViewedRef.current?.();
          markingRef.current = false;
        });
    }
  }, [adminId, messages]);

  useEffect(() => {
    if (superAdminId || !adminId) return;
    supabase
      .from('super_admin_messages')
      .select('super_admin_id')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.super_admin_id) setSuperAdminId(data.super_admin_id);
      });
  }, [adminId, superAdminId]);

  const loadMessages = useCallback(async (showLoader = true) => {
    if (!adminId) return;
    if (showLoader) setLoading(true);
    try {
      const { data } = await supabase
        .from('super_admin_messages')
        .select('*')
        .eq('admin_id', adminId)
        .eq('deleted', false)
        .order('created_at', { ascending: true });
      const rows = data ?? [];
      const mapped = rows.map((m: Record<string, unknown>) => ({
        ...m,
        sender: m.sender_role as string,
      })) as ChatMessage[];
      setMessages(mapped);
      if (rows.length > 0 && !superAdminId) {
        setSuperAdminId(rows[0].super_admin_id as string);
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [adminId, superAdminId]);

  useEffect(() => {
    if (adminId) loadMessages(true);
  }, [adminId, loadMessages]);

  useEffect(() => {
    if (!adminId) return;
    const ch = supabase
      .channel(`admin-sa-chat-${adminId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_admin_messages' }, () => loadMessages(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [adminId, loadMessages]);

  const isImpersonating = Boolean(adminIdOverride && authUserId && adminIdOverride !== authUserId);

  const triggerSupportAi = useCallback(async (messageId: string, aId: string, saId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sa-support-auto-reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ message_id: messageId, admin_id: aId, super_admin_id: saId }),
      });
      const json = await res.json().catch(() => ({}));
      console.log('[ChatSuperAdmin] AI support response:', res.status, json);
    } catch (err) {
      console.warn('[ChatSuperAdmin] AI trigger failed:', err);
    }
  }, []);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!adminId) throw new Error('no_admin_id');

    const effectiveSuperAdminId = isImpersonating ? authUserId : superAdminId;
    if (!effectiveSuperAdminId) throw new Error('no_super_admin_conversation');

    const payload = {
      content: content || '',
      sender_role: 'admin' as const,
      super_admin_id: effectiveSuperAdminId,
      admin_id: adminId,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    };

    const { error } = await supabase.from('super_admin_messages').insert(payload);
    if (error) throw new Error(error.message);

    sendPushForMessage({ targetUserId: effectiveSuperAdminId, title: 'Talvex', body: 'Nouveau message d\'une societe cliente' });
    onMessageSent?.();
    loadMessages(false).catch(() => {});

    {
      const { data: lastMsg } = await supabase
        .from('super_admin_messages')
        .select('id')
        .eq('admin_id', adminId)
        .eq('sender_role', 'admin')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastMsg?.id) {
        triggerSupportAi(lastMsg.id, adminId, effectiveSuperAdminId);
      }
    }
  }, [isImpersonating, adminId, authUserId, superAdminId, loadMessages, onMessageSent, triggerSupportAi]);

  const handleDelete = useCallback(async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    const { error } = await supabase.from('super_admin_messages').update({ deleted: true }).eq('id', id);
    if (error) {
      loadMessages(false).catch(() => {});
    }
  }, [loadMessages]);

  const SA_CONTACT: ChatContact = useMemo(() => ({
    id: 'super-admin',
    displayName: 'Super Admin',
    subtitle: 'Direction plateforme',
    initial: 'S',
    lastMessage: messages.length > 0 ? messages[messages.length - 1].content : undefined,
    lastMessageAt: messages.length > 0 ? messages[messages.length - 1].created_at : undefined,
    lastMessageSender: messages.length > 0 ? messages[messages.length - 1].sender : undefined,
  }), [messages]);

  const contacts = [SA_CONTACT];

  return (
    <MessagingPanel
      contacts={contacts}
      selectedContactId="super-admin"
      onSelectContact={() => {}}
      messages={messages}
      currentRole="admin"
      currentUserId={adminId ?? ''}
      displayName="Admin"
      accentColor="#f59e0b"
      accentRgb="245,158,11"
      onSendMessage={handleSend}
      onDeleteMessage={handleDelete}
      isAdmin={false}
      loading={loading}
      contactLoading={false}
      emptyText="Aucun message avec le Super Admin pour le moment."
    />
  );
}
