import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import MessagingPanel from '../../components/chat/ChatView';
import type { ChatMessage, ChatContact } from '../../components/chat/chatTypes';
import { sendPushForMessage } from '../../lib/sendPushForMessage';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { Crown } from 'lucide-react';

interface CSAChatRoisAdminProps {
  csaAuthId: string;
}

/** Identifiant local de l'unique conversation affichee (pas un id de base). */
const RA_CONTACT_ID = 'rois-admin';

export default function CSAChatRoisAdmin({ csaAuthId }: CSAChatRoisAdminProps) {
  const tokens = useThemeTokens();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [superAdminId, setSuperAdminId] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedConvos, setSelectedConvos] = useState<Set<string>>(new Set());

  const markingRef = useRef(false);

  useEffect(() => {
    if (superAdminId || !csaAuthId) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('super_admin_messages')
        .select('super_admin_id')
        .eq('admin_id', csaAuthId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data?.super_admin_id) { setSuperAdminId(data.super_admin_id); return; }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled || !session) return;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-parent-super-admin`,
          { headers: { Authorization: `Bearer ${session.access_token}`, Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } },
        );
        if (!res.ok || cancelled) return;
        const body = await res.json();
        if (body.super_admin_id && !cancelled) setSuperAdminId(body.super_admin_id);
      } catch { /* edge function not reachable */ }
    })();

    return () => { cancelled = true; };
  }, [csaAuthId, superAdminId]);

  useEffect(() => {
    if (!csaAuthId || messages.length === 0 || markingRef.current) return;
    const hasUnread = messages.some(m => m.sender === 'super_admin' && m.read === false && !m.deleted);
    if (hasUnread) {
      markingRef.current = true;
      supabase
        .from('super_admin_messages')
        .update({ read: true })
        .eq('admin_id', csaAuthId)
        .eq('sender_role', 'super_admin')
        .eq('read', false)
        .eq('deleted', false)
        .then(() => { markingRef.current = false; });
    }
  }, [csaAuthId, messages]);

  const loadMessages = useCallback(async (showLoader = true) => {
    if (!csaAuthId) return;
    if (showLoader) setLoading(true);
    try {
      const { data } = await supabase
        .from('super_admin_messages')
        .select('*')
        .eq('admin_id', csaAuthId)
        .eq('deleted', false)
        .order('created_at', { ascending: true });
      const mapped = (data ?? []).map((m: Record<string, unknown>) => ({
        ...m,
        sender: m.sender_role as string,
      })) as ChatMessage[];
      setMessages(mapped);
      if ((data ?? []).length > 0 && !superAdminId) {
        setSuperAdminId((data![0] as Record<string, unknown>).super_admin_id as string);
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [csaAuthId, superAdminId]);

  useEffect(() => {
    if (csaAuthId) loadMessages(true);
  }, [csaAuthId, loadMessages]);

  useEffect(() => {
    if (!csaAuthId) return;
    const ch = supabase
      .channel(`csa-ra-chat-${csaAuthId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_admin_messages' }, () => loadMessages(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [csaAuthId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!csaAuthId || !superAdminId) throw new Error('no_super_admin_conversation');

    const payload = {
      content: content || '',
      sender_role: 'company_super_admin' as const,
      super_admin_id: superAdminId,
      admin_id: csaAuthId,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    };

    const { error } = await supabase.from('super_admin_messages').insert(payload);
    if (error) throw new Error(error.message);

    sendPushForMessage({ targetUserId: superAdminId, title: 'Talvex', body: 'Nouveau message d\'un Super Admin' });
    loadMessages(false).catch(() => {});
  }, [csaAuthId, superAdminId, loadMessages]);

  const handleDelete = useCallback(async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    const { error } = await supabase.from('super_admin_messages').update({ deleted: true }).eq('id', id);
    if (error) loadMessages(false).catch(() => {});
  }, [loadMessages]);

  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => !prev);
    setSelectedConvos(new Set());
  }, []);

  const handleToggleConvo = useCallback((id: string) => {
    setSelectedConvos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((all: boolean) => {
    setSelectedConvos(all ? new Set([RA_CONTACT_ID]) : new Set());
  }, []);

  /**
   * Suppression logique, STRICTEMENT bornee au couple
   *   super_admin_id = Talvex  ·  admin_id = ce Groupe
   *
   * Les deux colonnes sont posees explicitement : le perimetre ne repose
   * jamais sur la seule RLS. Sans super_admin_id resolu, on refuse plutot
   * que d'emettre un UPDATE non borne qui toucherait aussi les
   * conversations Groupe <-> Societe (ou ce Groupe est super_admin_id).
   */
  const handleDeleteSelected = useCallback(async () => {
    if (!csaAuthId || !superAdminId) return;
    if (!selectedConvos.has(RA_CONTACT_ID)) return;

    const { error } = await supabase
      .from('super_admin_messages')
      .update({ deleted: true })
      .eq('super_admin_id', superAdminId)
      .eq('admin_id', csaAuthId);

    setSelectedConvos(new Set());
    setSelectMode(false);
    if (error) { loadMessages(false).catch(() => {}); return; }
    setMessages([]);
    loadMessages(false).catch(() => {});
  }, [csaAuthId, superAdminId, selectedConvos, loadMessages]);

  const raContact: ChatContact = useMemo(() => ({
    id: RA_CONTACT_ID,
    displayName: 'Talvex Administrateur',
    subtitle: 'Direction plateforme',
    initial: 'R',
    lastMessage: messages.length > 0 ? messages[messages.length - 1].content : undefined,
    lastMessageAt: messages.length > 0 ? messages[messages.length - 1].created_at : undefined,
    lastMessageSender: messages.length > 0 ? messages[messages.length - 1].sender : undefined,
  }), [messages]);

  return (
    <div className="flex flex-col flex-1 space-y-2 md:space-y-4 p-3 sm:p-4 md:p-6" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base md:text-xl font-bold" style={{ color: tokens.heading?.primary || tokens.text.primary }}>Chat Talvex Administrateur</h2>
          <p className="text-[11px] md:text-xs mt-0.5 hidden sm:block" style={{ color: tokens.text.quaternary }}>Communiquez avec la direction de la plateforme</p>
        </div>
        <div
          className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.08)', boxShadow: '0 0 16px rgba(245,158,11,0.15)' }}
        >
          <Crown className="w-4 h-4 text-amber-400" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <MessagingPanel
          contacts={[raContact]}
          selectedContactId={RA_CONTACT_ID}
          onSelectContact={() => {}}
          messages={messages}
          currentRole="company_super_admin"
          currentUserId={csaAuthId}
          displayName="Super Admin"
          accentColor="#f59e0b"
          accentRgb="245,158,11"
          onSendMessage={handleSend}
          onDeleteMessage={handleDelete}
          isAdmin={false}
          loading={loading}
          contactLoading={false}
          emptyText="Aucun message avec Talvex Administrateur pour le moment."
          sidebarSelectable
          sidebarSelectMode={selectMode}
          onSidebarToggleSelectMode={handleToggleSelectMode}
          sidebarSelectedIds={selectedConvos}
          onSidebarToggleSelect={handleToggleConvo}
          onSidebarSelectAll={handleSelectAll}
          onSidebarDeleteSelected={handleDeleteSelected}
        />
      </div>
    </div>
  );
}
