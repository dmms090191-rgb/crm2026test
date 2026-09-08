import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel from '../../../components/chat/ChatView';
import type { ChatMessage, ChatContact } from '../../../components/chat/chatTypes';
import { sendPushForMessage } from '../../../lib/sendPushForMessage';
import { useSocieteInterlocutors } from '../../../hooks/useSocieteInterlocutors';

interface ChatSuperAdminProps {
  adminIdOverride?: string | null;
  onMessageSent?: () => void;
  /** Notifie que le fil `superAdminId` vient d'etre consulte. */
  onSuperAdminViewed?: (superAdminId: string) => void;
  /** Fil a ouvrir au montage (clic sur une notification). */
  initialSuperAdminId?: string | null;
}

export default function ChatSuperAdmin({
  adminIdOverride, onMessageSent, onSuperAdminViewed, initialSuperAdminId = null,
}: ChatSuperAdminProps) {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAuthUserId(user.id);
    });
  }, []);

  const adminId = adminIdOverride ?? authUserId;

  // Talvex et le Groupe sont DEUX conversations distinctes, identifiees par
  // leur super_admin_id. Le Groupe parent est toujours propose ; Talvex
  // n'apparait que si un echange existe deja.
  const { interlocutors, loading: contactLoading } = useSocieteInterlocutors(adminId);

  const [selectedSuperAdminId, setSelectedSuperAdminId] = useState<string | null>(initialSuperAdminId);

  // Selection par defaut : le fil demande, sinon le Groupe parent.
  // Jamais « le dernier qui a ecrit » : le destinataire ne se devine pas.
  useEffect(() => {
    if (interlocutors.length === 0) return;
    setSelectedSuperAdminId(prev => {
      if (prev && interlocutors.some(i => i.id === prev)) return prev;
      if (initialSuperAdminId && interlocutors.some(i => i.id === initialSuperAdminId)) return initialSuperAdminId;
      const groupe = interlocutors.find(i => i.kind === 'groupe');
      return (groupe ?? interlocutors[0]).id;
    });
  }, [interlocutors, initialSuperAdminId]);

  const selected = useMemo(
    () => interlocutors.find(i => i.id === selectedSuperAdminId) ?? null,
    [interlocutors, selectedSuperAdminId],
  );

  const onSuperAdminViewedRef = useRef(onSuperAdminViewed);
  onSuperAdminViewedRef.current = onSuperAdminViewed;
  const markingRef = useRef(false);

  useEffect(() => {
    if (!adminId || !selectedSuperAdminId || messages.length === 0 || markingRef.current) return;
    const hasUnread = messages.some(m => m.sender === 'super_admin' && m.read === false && !m.deleted);
    if (hasUnread) {
      markingRef.current = true;
      supabase
        .from('super_admin_messages')
        .update({ read: true })
        .eq('admin_id', adminId)
        // Scope au fil ouvert : lire Talvex ne marque jamais lu le fil du Groupe.
        .eq('super_admin_id', selectedSuperAdminId)
        .eq('sender_role', 'super_admin')
        .eq('read', false)
        .eq('deleted', false)
        .then(() => {
          onSuperAdminViewedRef.current?.(selectedSuperAdminId);
          markingRef.current = false;
        });
    }
  }, [adminId, selectedSuperAdminId, messages]);

  // ---- Messages du fil SELECTIONNE uniquement ----
  const loadMessages = useCallback(async (showLoader = true) => {
    if (!adminId || !selectedSuperAdminId) { setMessages([]); setLoading(false); return; }
    if (showLoader) setLoading(true);
    try {
      const { data } = await supabase
        .from('super_admin_messages')
        .select('*')
        .eq('admin_id', adminId)
        .eq('super_admin_id', selectedSuperAdminId)
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
  }, [adminId, selectedSuperAdminId]);

  useEffect(() => { loadMessages(true); }, [loadMessages]);

  // ---- Apercus de la liste de contacts, un par fil ----
  const [lastByThread, setLastByThread] = useState<Record<string, { content: string; created_at: string; sender: string }>>({});

  const loadPreviews = useCallback(async () => {
    if (!adminId) return;
    const { data } = await supabase
      .from('super_admin_messages')
      .select('super_admin_id, content, created_at, sender_role')
      .eq('admin_id', adminId)
      .eq('deleted', false)
      .order('created_at', { ascending: true });
    const map: Record<string, { content: string; created_at: string; sender: string }> = {};
    for (const m of data ?? []) {
      const sid = m.super_admin_id as string;
      if (!sid) continue;
      map[sid] = { content: m.content ?? '', created_at: m.created_at as string, sender: m.sender_role as string };
    }
    setLastByThread(map);
  }, [adminId]);

  useEffect(() => { loadPreviews(); }, [loadPreviews]);

  // ---- Realtime : le canal EXISTANT, qui rafraichit fil ouvert + apercus ----
  useEffect(() => {
    if (!adminId) return;
    const ch = supabase
      .channel(`admin-sa-chat-${adminId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_admin_messages' }, () => {
        loadMessages(false);
        loadPreviews();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [adminId, loadMessages, loadPreviews]);

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

    // Le destinataire est EXCLUSIVEMENT le fil ouvert. Ni le dernier expediteur,
    // ni le message le plus recent, ni created_by_user_id. Sans fil : on refuse.
    const effectiveSuperAdminId = selectedSuperAdminId;
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

    sendPushForMessage({
      targetUserId: effectiveSuperAdminId,
      title: selected?.display_name ?? 'Talvex',
      body: 'Nouveau message d\'une societe cliente',
    });
    onMessageSent?.();
    loadMessages(false).catch(() => {});
    loadPreviews().catch(() => {});

    // Le support IA appartient a Talvex. Le declencher sur le fil d'un Groupe
    // ferait repondre l'IA de la plateforme au nom de ce Groupe.
    if (selected?.kind === 'talvex') {
      const { data: lastMsg } = await supabase
        .from('super_admin_messages')
        .select('id')
        .eq('admin_id', adminId)
        .eq('super_admin_id', effectiveSuperAdminId)
        .eq('sender_role', 'admin')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastMsg?.id) {
        triggerSupportAi(lastMsg.id, adminId, effectiveSuperAdminId);
      }
    }
  }, [adminId, selectedSuperAdminId, selected, loadMessages, loadPreviews, onMessageSent, triggerSupportAi]);

  const handleDelete = useCallback(async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    const { error } = await supabase.from('super_admin_messages').update({ deleted: true }).eq('id', id);
    if (error) {
      loadMessages(false).catch(() => {});
    }
    loadPreviews().catch(() => {});
  }, [loadMessages, loadPreviews]);

  // Un contact = un fil = un super_admin_id.
  const contacts: ChatContact[] = useMemo(() =>
    interlocutors.map(i => {
      const last = lastByThread[i.id];
      return {
        id: i.id,
        displayName: i.display_name,
        subtitle: i.kind === 'talvex' ? 'Direction plateforme' : (i.company || 'Groupe'),
        initial: (i.display_name || '?').charAt(0).toUpperCase(),
        lastMessage: last?.content,
        lastMessageAt: last?.created_at,
        lastMessageSender: last?.sender,
      };
    }),
  [interlocutors, lastByThread]);

  return (
    <MessagingPanel
      contacts={contacts}
      selectedContactId={selectedSuperAdminId}
      onSelectContact={setSelectedSuperAdminId}
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
      contactLoading={contactLoading}
      emptyText="Aucun message dans cette conversation pour le moment."
    />
  );
}
