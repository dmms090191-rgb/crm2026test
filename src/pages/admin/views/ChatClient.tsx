import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';
import type { ChatLead } from './Crm';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { peekChatReturnContext } from '../../../lib/connectReturnContext';
import { useSimulation } from '../../../contexts/SimulationContext';

interface LeadRow {
  id: string;
  data: Record<string, string>;
  vendor_id?: string | null;
}

interface ChatClientProps {
  initialLead?: ChatLead | null;
  onMessageSent?: () => void;
  onClientViewed?: (clientAuthId: string) => void;
  onReturnToCrm?: () => void;
}

export default function ChatClient({ initialLead, onMessageSent, onClientViewed, onReturnToCrm }: ChatClientProps) {
  const tokens = useThemeTokens();
  const { isSimulating } = useSimulation();
  const chatReturnCtx = onReturnToCrm ? peekChatReturnContext() : null;

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(true);
  const [lastMessages, setLastMessages] = useState<Record<string, { content: string; created_at: string; sender: string }>>({});

  const onClientViewedRef = useRef(onClientViewed);
  onClientViewedRef.current = onClientViewed;

  useEffect(() => {
    setContactLoading(true);
    (async () => {
      const { data: msgData } = await supabase
        .from('client_messages')
        .select('client_auth_id')
        .not('client_auth_id', 'is', null)
        .or('deleted.is.null,deleted.eq.false');

      const authIds = [...new Set((msgData ?? []).map((m: { client_auth_id: string }) => m.client_auth_id))];
      const { data } = await supabase
        .from('leads')
        .select('id,data,vendor_id')
        .eq('actif', true)
        .order('imported_at', { ascending: false });

      const allLeads = (data ?? []) as LeadRow[];
      const filtered = allLeads.filter(l => {
        if (l.vendor_id) return false;
        if (initialLead && l.id === initialLead.id) return true;
        const authId = l.data['AuthId'] ?? l.data['auth_id'] ?? l.id;
        return authIds.includes(authId);
      });

      setLeads(filtered);
      setContactLoading(false);

      const filteredAuthIds = filtered.map(l => l.data['AuthId'] ?? l.data['auth_id'] ?? l.id);
      if (filteredAuthIds.length > 0) {
        const { data: lastMsgs } = await supabase
          .from('client_messages')
          .select('client_auth_id, content, created_at, sender')
          .in('client_auth_id', filteredAuthIds)
          .or('deleted.is.null,deleted.eq.false')
          .order('created_at', { ascending: false });
        const map: Record<string, { content: string; created_at: string; sender: string }> = {};
        (lastMsgs ?? []).forEach((m: { client_auth_id: string; content: string; created_at: string; sender: string }) => {
          if (!map[m.client_auth_id]) map[m.client_auth_id] = m;
        });
        setLastMessages(map);
      }
    })();
  }, [initialLead]);

  useEffect(() => {
    if (initialLead) {
      setSelectedId(initialLead.id);
    } else {
      setSelectedId(prev => {
        const stillInList = leads.some(l => l.id === prev);
        return stillInList ? prev : null;
      });
    }
  }, [initialLead, leads]);

  const selectedLead = leads.find(l => l.id === selectedId) ?? null;
  const clientAuthId = selectedLead ? (selectedLead.data['AuthId'] ?? selectedLead.data['auth_id'] ?? selectedLead.id) : null;

  const loadMessages = useCallback(async (showLoader = true) => {
    if (!clientAuthId) return;
    if (showLoader) setLoading(true);
    try {
      const { data } = await supabase
        .from('client_messages')
        .select('*')
        .eq('client_auth_id', clientAuthId)
        .or('deleted.is.null,deleted.eq.false')
        .order('created_at', { ascending: true });
      setMessages((data ?? []) as ChatMessage[]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [clientAuthId]);

  useEffect(() => {
    if (clientAuthId) loadMessages(true);
    else setMessages([]);
  }, [clientAuthId, loadMessages]);

  useEffect(() => {
    if (clientAuthId) onClientViewedRef.current?.(clientAuthId);
  }, [clientAuthId]);

  useEffect(() => {
    if (!clientAuthId) return;
    const ch = supabase
      .channel(`admin-client-chat-${clientAuthId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_messages' }, () => loadMessages(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientAuthId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (isSimulating) return;
    if (!clientAuthId) throw new Error('missing_context');
    const fileFields = file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {};
    const payload = { content: content || '', sender: 'admin' as const, client_auth_id: clientAuthId, vendor_id: null, ...fileFields };
    setMessages(prev => [...prev, { id: `_local_${Date.now()}`, content: payload.content, sender: payload.sender, client_auth_id: payload.client_auth_id, created_at: new Date().toISOString(), ...fileFields } as ChatMessage]);
    supabase.from('client_messages').insert(payload).then(({ error }) => {
      if (error) console.error('[ChatClient] insert error:', error.message);
      loadMessages(false).catch(() => {});
    });
    onMessageSent?.();
  }, [clientAuthId, onMessageSent, loadMessages, isSimulating]);

  const handleDelete = useCallback(async (id: string) => {
    if (isSimulating) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    supabase.from('client_messages').delete().eq('id', id);
  }, [isSimulating]);

  const handleReset = useCallback(async () => {
    if (isSimulating) return;
    if (!clientAuthId) return;
    await supabase.from('client_messages').delete().eq('client_auth_id', clientAuthId);
    setMessages([]);
  }, [clientAuthId, isSimulating]);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedConvos, setSelectedConvos] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => {
      if (prev) setSelectedConvos(new Set());
      return !prev;
    });
  }, []);

  const handleToggleConvo = useCallback((id: string) => {
    setSelectedConvos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((all: boolean) => {
    if (all) {
      const allIds = leads.map(l => l.id);
      setSelectedConvos(new Set(allIds));
    } else {
      setSelectedConvos(new Set());
    }
  }, [leads]);

  const handleDeleteConvos = useCallback(() => { setConfirmDelete(true); }, []);

  const handleConfirmDeleteConvos = useCallback(async () => {
    const ids = [...selectedConvos];
    const authIdsToDelete = ids.map(id => {
      const lead = leads.find(l => l.id === id);
      return lead ? (lead.data['AuthId'] ?? lead.data['auth_id'] ?? lead.id) : id;
    });
    await Promise.all(authIdsToDelete.map(authId =>
      supabase.from('client_messages').delete().eq('client_auth_id', authId)
    ));
    if (selectedId && ids.includes(selectedId)) {
      setMessages([]);
      setSelectedId(null);
    }
    setLeads(prev => prev.filter(l => !ids.includes(l.id)));
    setLastMessages(prev => {
      const next = { ...prev };
      authIdsToDelete.forEach(authId => delete next[authId]);
      return next;
    });
    setSelectedConvos(new Set());
    setSelectMode(false);
    setConfirmDelete(false);
  }, [selectedConvos, selectedId, leads]);

  const selectedConvoIds = useMemo(() => selectedConvos, [selectedConvos]);

  const contacts: ChatContact[] = leads.map(l => {
    const nom = l.data['Nom'] ?? l.data['nom'] ?? '';
    const prenom = l.data['Prenom'] ?? l.data['prenom'] ?? '';
    const email = l.data['Email'] ?? l.data['email'] ?? '';
    const displayName = [prenom, nom].filter(Boolean).join(' ') || email || l.id.slice(0, 8);
    const initial = (prenom || email || 'C').charAt(0).toUpperCase();
    const authId = l.data['AuthId'] ?? l.data['auth_id'] ?? l.id;
    const lastMsg = lastMessages[authId];
    return {
      id: l.id,
      displayName,
      subtitle: email,
      initial,
      lastMessage: lastMsg?.content || undefined,
      lastMessageAt: lastMsg?.created_at || undefined,
      lastMessageSender: lastMsg?.sender || undefined,
    };
  });

  const selectedContact = contacts.find(c => c.id === selectedId);

  return (
    <div className="flex flex-col flex-1 space-y-2 md:space-y-4" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base md:text-xl font-bold" style={{ color: tokens.text.primary }}>Chat Client</h2>
          <p className="text-[11px] md:text-xs mt-0.5 hidden sm:block" style={{ color: tokens.text.quaternary }}>
            {selectedContact ? `Conversation avec ${selectedContact.displayName}` : 'Sélectionnez un client'}
          </p>
        </div>
        <div
          className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(52,211,153,0.08)', boxShadow: '0 0 16px rgba(52,211,153,0.15)' }}
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <MessagingPanel
          contacts={contacts}
          selectedContactId={selectedId}
          onSelectContact={setSelectedId}
          messages={messages}
          currentRole="admin"
          currentUserId=""
          displayName="Admin"
          accentColor="#34d399"
          accentRgb="52,211,153"
          onSendMessage={handleSend}
          onDeleteMessage={handleDelete}
          onResetChat={handleReset}
          isAdmin={true}
          loading={loading}
          contactLoading={contactLoading}
          returnContactId={chatReturnCtx?.leadId ?? null}
          onReturnClick={onReturnToCrm}
          sidebarSelectable={true}
          sidebarSelectMode={selectMode}
          onSidebarToggleSelectMode={handleToggleSelectMode}
          sidebarSelectedIds={selectedConvoIds}
          onSidebarToggleSelect={handleToggleConvo}
          onSidebarSelectAll={handleSelectAll}
          onSidebarDeleteSelected={handleDeleteConvos}
        />
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4" style={{ background: tokens.surface.primary, border: `1px solid ${tokens.surface.border}` }}>
            <p className="text-sm font-semibold" style={{ color: tokens.text.primary }}>
              {selectedConvos.size > 1 ? 'Voulez-vous vraiment supprimer ces conversations ?' : 'Voulez-vous vraiment supprimer cette conversation ?'}
            </p>
            <p className="text-xs" style={{ color: tokens.text.tertiary }}>
              Les messages seront supprimés définitivement.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: tokens.surface.hover, color: tokens.text.secondary }}>Annuler</button>
              <button onClick={handleConfirmDeleteConvos} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#ef4444' }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
