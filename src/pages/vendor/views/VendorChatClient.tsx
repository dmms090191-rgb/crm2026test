import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';
import type { VendorChatLead } from '../VendorDashboard';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { peekChatReturnContext } from '../../../lib/connectReturnContext';

interface LeadRow {
  id: string;
  data: Record<string, string>;
  vendor_id?: string | null;
}

interface VendorChatClientProps {
  vendorName: string;
  vendorDbId: string | null;
  initialLead?: VendorChatLead | null;
  onClientViewed?: (clientAuthId: string) => void;
  onReturnToLeads?: () => void;
  isAdmin?: boolean;
}

export default function VendorChatClient({ vendorName, vendorDbId, initialLead, onClientViewed, onReturnToLeads, isAdmin }: VendorChatClientProps) {
  const tokens = useThemeTokens();
  const chatReturnCtx = onReturnToLeads ? peekChatReturnContext() : null;
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialLead?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(true);
  const [lastMessages, setLastMessages] = useState<Record<string, { content: string; created_at: string; sender: string }>>({});

  const loadGenRef = useRef(0);

  useEffect(() => {
    if (!vendorDbId) { setContactLoading(false); return; }
    setContactLoading(true);
    (async () => {
      const { data } = await supabase
        .from('leads')
        .select('id,data,vendor_id')
        .eq('vendor_id', vendorDbId)
        .eq('actif', true)
        .order('imported_at', { ascending: false });
      const allLeads = (data ?? []) as LeadRow[];

      const authIds = allLeads.map(l => l.data['AuthId'] ?? l.data['auth_id'] ?? l.id);
      let authIdsWithMessages: string[] = [];
      const map: Record<string, { content: string; created_at: string; sender: string }> = {};

      if (authIds.length > 0) {
        const { data: msgData } = await supabase
          .from('client_messages')
          .select('client_auth_id, content, created_at, sender')
          .in('client_auth_id', authIds)
          .or('deleted.is.null,deleted.eq.false')
          .order('created_at', { ascending: false });
        (msgData ?? []).forEach((m: { client_auth_id: string; content: string; created_at: string; sender: string }) => {
          if (!map[m.client_auth_id]) map[m.client_auth_id] = m;
        });
        authIdsWithMessages = Object.keys(map);
      }

      const filtered = allLeads.filter(l => {
        if (initialLead && l.id === initialLead.id) return true;
        const authId = l.data['AuthId'] ?? l.data['auth_id'] ?? l.id;
        return authIdsWithMessages.includes(authId);
      });

      setLeads(filtered);
      setLastMessages(map);
      setContactLoading(false);
    })();
  }, [vendorDbId, initialLead]);

  useEffect(() => {
    if (initialLead) setSelectedId(initialLead.id);
  }, [initialLead]);

  const selectedLead = leads.find(l => l.id === selectedId) ?? null;
  const clientAuthId = selectedLead
    ? (selectedLead.data['AuthId'] ?? selectedLead.data['auth_id'] ?? selectedLead.id)
    : null;

  useEffect(() => {
    if (clientAuthId) onClientViewed?.(clientAuthId);
  }, [clientAuthId, onClientViewed]);

  const loadMessages = useCallback(async (authId: string, showLoader: boolean) => {
    const gen = ++loadGenRef.current;
    if (showLoader) setLoading(true);
    try {
      const { data } = await supabase
        .from('client_messages')
        .select('*')
        .eq('client_auth_id', authId)
        .or('deleted.is.null,deleted.eq.false')
        .order('created_at', { ascending: true });
      if (gen !== loadGenRef.current) return;
      setMessages((data ?? []) as ChatMessage[]);
    } finally {
      if (gen === loadGenRef.current && showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (clientAuthId && vendorDbId) {
      loadMessages(clientAuthId, true);
    } else {
      loadGenRef.current++;
      setMessages([]);
      setLoading(false);
    }
  }, [clientAuthId, vendorDbId, loadMessages]);

  useEffect(() => {
    if (!clientAuthId || !vendorDbId) return;
    const currentAuthId = clientAuthId;
    const ch = supabase
      .channel(`vendor-client-chat-${vendorDbId}-${clientAuthId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_messages' }, () => {
        loadMessages(currentAuthId, false);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientAuthId, vendorDbId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!clientAuthId || !vendorDbId) throw new Error('missing_context');
    const payload = {
      content: content || '',
      sender: 'vendor' as const,
      client_auth_id: clientAuthId,
      vendor_id: vendorDbId,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    };

    setMessages(prev => [...prev, {
      id: `_local_${Date.now()}`,
      content: payload.content,
      sender: payload.sender,
      client_auth_id: payload.client_auth_id,
      vendor_id: payload.vendor_id,
      created_at: new Date().toISOString(),
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    } as ChatMessage]);

    const capturedAuthId = clientAuthId;
    supabase.from('client_messages').insert(payload).then(({ error }) => {
      if (error) console.error('[VendorChatClient] insert error:', error.message);
      loadMessages(capturedAuthId, false).catch(() => {});
    });
  }, [clientAuthId, vendorDbId, loadMessages]);

  const handleDelete = useCallback(async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    supabase.from('client_messages').delete().eq('id', id);
  }, []);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedConvos, setSelectedConvos] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => { if (prev) setSelectedConvos(new Set()); return !prev; });
  }, []);
  const handleToggleConvo = useCallback((id: string) => {
    setSelectedConvos(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const handleSelectAll = useCallback((all: boolean) => {
    if (all) setSelectedConvos(new Set(leads.map(l => l.id)));
    else setSelectedConvos(new Set());
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
    if (selectedId && ids.includes(selectedId)) { setMessages([]); setSelectedId(null); }
    setLeads(prev => prev.filter(l => !ids.includes(l.id)));
    setLastMessages(prev => { const next = { ...prev }; authIdsToDelete.forEach(a => delete next[a]); return next; });
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
          <h2 className="text-base md:text-xl font-bold" style={{ color: tokens.heading.primary }}>Chat Client</h2>
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
          currentRole="vendor"
          currentUserId={vendorDbId ?? ''}
          displayName={vendorName}
          accentColor="#34d399"
          accentRgb="52,211,153"
          onSendMessage={handleSend}
          onDeleteMessage={handleDelete}
          isAdmin={isAdmin}
          loading={loading}
          contactLoading={contactLoading}
          returnContactId={chatReturnCtx?.leadId ?? null}
          onReturnClick={onReturnToLeads}
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
              {selectedConvos.size > 1 ? 'Supprimer ces conversations ?' : 'Supprimer cette conversation ?'}
            </p>
            <p className="text-xs" style={{ color: tokens.text.tertiary }}>
              Les messages seront supprimés définitivement.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ background: tokens.surface.hover, color: tokens.text.secondary }}>Annuler</button>
              <button onClick={handleConfirmDeleteConvos} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#ef4444' }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
