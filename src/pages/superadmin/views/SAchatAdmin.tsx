import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel from '../../../components/chat/ChatView';
import type { ChatMessage, ChatContact } from '../../../components/chat/chatTypes';
import { sendPushForMessage } from '../../../lib/sendPushForMessage';
import type { AdminUser } from './SAAdmins';

interface SAchatAdminProps {
  initialAdmin?: AdminUser | null;
  onAdminViewed?: (adminId: string) => void;
  cachedAdmins?: AdminUser[];
}

export default function SAchatAdmin({ initialAdmin, onAdminViewed, cachedAdmins = [] }: SAchatAdminProps) {
  const [superAdminId, setSuperAdminId] = useState<string | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(initialAdmin?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(true);
  const [adminsWithMessages, setAdminsWithMessages] = useState<string[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, { content: string; created_at: string; sender_role: string }>>({});
  const [csaUsers, setCsaUsers] = useState<AdminUser[]>([]);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedConvos, setSelectedConvos] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setSuperAdminId(user.id);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session) return;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-company-super-admins`,
          { headers: { Authorization: `Bearer ${session.access_token}`, Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } },
        );
        if (!res.ok || cancelled) return;
        const body = await res.json();
        if (body.company_super_admins && !cancelled) setCsaUsers(body.company_super_admins);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshContacts = useCallback(async (showLoader = true) => {
    if (!superAdminId) return;
    if (showLoader) setContactLoading(true);
    try {
      const { data: msgData } = await supabase
        .from('super_admin_messages')
        .select('admin_id')
        .eq('super_admin_id', superAdminId)
        .eq('deleted', false);

      const adminIdsWithMsgs = [...new Set((msgData ?? []).map((m: { admin_id: string }) => m.admin_id))];
      setAdminsWithMessages(adminIdsWithMsgs);

      if (adminIdsWithMsgs.length > 0) {
        const { data: lastMsgs } = await supabase
          .from('super_admin_messages')
          .select('admin_id, content, created_at, sender_role')
          .eq('super_admin_id', superAdminId)
          .in('admin_id', adminIdsWithMsgs)
          .eq('deleted', false)
          .order('created_at', { ascending: false });
        const map: Record<string, { content: string; created_at: string; sender_role: string }> = {};
        (lastMsgs ?? []).forEach((m: { admin_id: string; content: string; created_at: string; sender_role: string }) => {
          if (!map[m.admin_id]) map[m.admin_id] = m;
        });
        setLastMessages(map);
      } else {
        setLastMessages({});
      }
    } finally {
      if (showLoader) setContactLoading(false);
    }
  }, [superAdminId]);

  useEffect(() => {
    if (superAdminId) refreshContacts(true);
  }, [superAdminId, refreshContacts]);

  useEffect(() => {
    if (!superAdminId) return;
    const ch = supabase
      .channel('sa-admin-contacts-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'super_admin_messages', filter: `super_admin_id=eq.${superAdminId}` }, () => refreshContacts(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [superAdminId, refreshContacts]);

  const onAdminViewedRef = useRef(onAdminViewed);
  onAdminViewedRef.current = onAdminViewed;
  const markingRef = useRef(false);

  useEffect(() => {
    if (selectedAdminId) onAdminViewedRef.current?.(selectedAdminId);
  }, [selectedAdminId]);

  useEffect(() => {
    if (!selectedAdminId || messages.length === 0 || markingRef.current) return;
    const hasUnread = messages.some(m => m.sender !== 'super_admin' && m.read === false && !m.deleted);
    if (hasUnread) {
      markingRef.current = true;
      supabase
        .from('super_admin_messages')
        .update({ read: true })
        .eq('admin_id', selectedAdminId)
        .neq('sender_role', 'super_admin')
        .eq('read', false)
        .eq('deleted', false)
        .then(() => {
          onAdminViewedRef.current?.(selectedAdminId);
          markingRef.current = false;
        });
    }
  }, [selectedAdminId, messages]);

  const loadMessages = useCallback(async (showLoader = true) => {
    if (!selectedAdminId || !superAdminId) return;
    if (showLoader) setLoading(true);
    try {
      const { data } = await supabase
        .from('super_admin_messages')
        .select('*')
        .eq('admin_id', selectedAdminId)
        .eq('super_admin_id', superAdminId)
        .eq('deleted', false)
        .order('created_at', { ascending: true });
      const mapped = (data ?? []).map((m: Record<string, unknown>) => ({
        ...m,
        sender: m.sender_role as string,
      })) as ChatMessage[];
      setMessages(mapped);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedAdminId, superAdminId]);

  useEffect(() => {
    if (selectedAdminId && superAdminId) loadMessages(true);
    else setMessages([]);
  }, [selectedAdminId, superAdminId, loadMessages]);

  useEffect(() => {
    if (!selectedAdminId || !superAdminId) return;
    const ch = supabase
      .channel(`sa-admin-chat-${selectedAdminId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_admin_messages' }, () => loadMessages(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedAdminId, superAdminId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!selectedAdminId || !superAdminId) throw new Error('missing_context');
    const payload = {
      content: content || '',
      sender_role: 'super_admin' as const,
      super_admin_id: superAdminId,
      admin_id: selectedAdminId,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    };

    setMessages(prev => [...prev, {
      id: `_local_${Date.now()}`,
      content: payload.content,
      sender: 'super_admin',
      created_at: new Date().toISOString(),
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    } as ChatMessage]);

    supabase.from('super_admin_messages').insert(payload).then(({ error }) => {
      if (error) console.error('[SAchatAdmin] insert error:', error.message);
      loadMessages(false).catch(() => {});
    });
    sendPushForMessage({ targetUserId: selectedAdminId, title: 'Talvex', body: 'Nouveau message Super Admin' });
  }, [selectedAdminId, superAdminId, loadMessages]);

  const handleDelete = useCallback(async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    const { error } = await supabase.from('super_admin_messages').update({ deleted: true }).eq('id', id);
    if (error) {
      loadMessages(false).catch(() => {});
    }
  }, [loadMessages]);

  const handleReset = useCallback(async () => {
    if (!selectedAdminId || !superAdminId) return;
    await supabase.from('super_admin_messages').update({ deleted: true }).eq('admin_id', selectedAdminId).eq('super_admin_id', superAdminId);
    setMessages([]);
    setAdminsWithMessages(prev => prev.filter(id => id !== selectedAdminId));
    setSelectedAdminId(null);
    refreshContacts(false).catch(() => {});
  }, [selectedAdminId, superAdminId, refreshContacts]);

  const allKnownUsers = useMemo(() => {
    const map = new Map<string, AdminUser>();
    for (const a of cachedAdmins) map.set(a.id, a);
    for (const c of csaUsers) if (!map.has(c.id)) map.set(c.id, c);
    return map;
  }, [cachedAdmins, csaUsers]);

  const adminsForContacts = useMemo(() => {
    const withMsgs = adminsWithMessages
      .map(id => allKnownUsers.get(id))
      .filter((a): a is AdminUser => !!a);
    if (initialAdmin && !withMsgs.some(a => a.id === initialAdmin.id)) {
      const fromAll = allKnownUsers.get(initialAdmin.id);
      return [fromAll ?? initialAdmin, ...withMsgs];
    }
    return withMsgs;
  }, [allKnownUsers, adminsWithMessages, initialAdmin]);

  const contacts: ChatContact[] = useMemo(() =>
    adminsForContacts.map(a => {
      const isCsa = a.role === 'company_super_admin';
      const lastSender = lastMessages[a.id]?.sender_role;
      return {
        id: a.id,
        displayName: [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email,
        subtitle: isCsa ? `Super Admin · ${a.company || a.email}` : a.email,
        initial: (a.first_name || a.email || '?').charAt(0).toUpperCase(),
        lastMessage: lastMessages[a.id]?.content,
        lastMessageAt: lastMessages[a.id]?.created_at,
        lastMessageSender: lastSender === 'super_admin' ? 'super_admin' : lastSender || 'admin',
      };
    }),
  [adminsForContacts, lastMessages]);

  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => { if (prev) setSelectedConvos(new Set()); return !prev; });
  }, []);
  const handleToggleConvo = useCallback((id: string) => {
    setSelectedConvos(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const handleSelectAll = useCallback((all: boolean) => {
    if (all) setSelectedConvos(new Set(adminsForContacts.map(a => a.id)));
    else setSelectedConvos(new Set());
  }, [adminsForContacts]);
  const handleDeleteSelected = useCallback(async () => {
    if (!superAdminId || selectedConvos.size === 0) return;
    const ids = [...selectedConvos];
    for (const adminId of ids) {
      await supabase.from('super_admin_messages').update({ deleted: true }).eq('admin_id', adminId).eq('super_admin_id', superAdminId);
    }
    setAdminsWithMessages(prev => prev.filter(id => !selectedConvos.has(id)));
    setSelectedConvos(new Set());
    setSelectMode(false);
    if (selectedAdminId && selectedConvos.has(selectedAdminId)) { setMessages([]); setSelectedAdminId(null); }
    refreshContacts(false).catch(() => {});
  }, [superAdminId, selectedConvos, selectedAdminId, refreshContacts]);

  return (
    <MessagingPanel
      contacts={contacts}
      selectedContactId={selectedAdminId}
      onSelectContact={setSelectedAdminId}
      messages={messages}
      currentRole="super_admin"
      currentUserId={superAdminId ?? ''}
      displayName="Super Admin"
      accentColor="#f59e0b"
      accentRgb="245,158,11"
      onSendMessage={handleSend}
      onDeleteMessage={handleDelete}
      onResetChat={handleReset}
      isAdmin={true}
      loading={loading}
      contactLoading={contactLoading}
      sidebarSelectable
      sidebarSelectMode={selectMode}
      onSidebarToggleSelectMode={handleToggleSelectMode}
      sidebarSelectedIds={selectedConvos}
      onSidebarToggleSelect={handleToggleConvo}
      onSidebarSelectAll={handleSelectAll}
      onSidebarDeleteSelected={handleDeleteSelected}
    />
  );
}
