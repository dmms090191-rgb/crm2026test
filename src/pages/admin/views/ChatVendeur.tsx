import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';
import type { Vendor } from './ListeVendeurs';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useSimulation } from '../../../contexts/SimulationContext';

interface ChatVendeurProps {
  initialVendor?: Vendor | null;
  onMessageSent?: () => void;
  onVendorViewed?: (vendorId: string) => void;
}

export default function ChatVendeur({ initialVendor, onMessageSent, onVendorViewed }: ChatVendeurProps) {
  const tokens = useThemeTokens();
  const { isSimulating } = useSimulation();

  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [vendorsWithMessages, setVendorsWithMessages] = useState<string[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(initialVendor?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(true);
  const [lastMessages, setLastMessages] = useState<Record<string, { content: string; created_at: string; sender: string }>>({});

  useEffect(() => {
    let cancelled = false;
    setContactLoading(true);
    (async () => {
      try {
        const [{ data: vendorData }, { data: msgData }] = await Promise.all([
          supabase.from('vendors').select('id,first_name,last_name,email,auth_user_id,password,phone,created_at').order('last_name'),
          supabase.from('vendor_admin_messages').select('vendor_id').not('vendor_id', 'is', null).or('deleted.is.null,deleted.eq.false'),
        ]);
        if (cancelled) return;
        if (vendorData) setAllVendors(vendorData as Vendor[]);
        const vendorIdsWithMsgs = [...new Set((msgData ?? []).map((m: { vendor_id: string }) => m.vendor_id))];
        setVendorsWithMessages(vendorIdsWithMsgs);

        if (vendorIdsWithMsgs.length > 0) {
          const { data: lastMsgs } = await supabase
            .from('vendor_admin_messages')
            .select('vendor_id, content, created_at, sender')
            .in('vendor_id', vendorIdsWithMsgs)
            .or('deleted.is.null,deleted.eq.false')
            .order('created_at', { ascending: false });
          const map: Record<string, { content: string; created_at: string; sender: string }> = {};
          (lastMsgs ?? []).forEach((m: { vendor_id: string; content: string; created_at: string; sender: string }) => {
            if (!map[m.vendor_id]) map[m.vendor_id] = m;
          });
          if (!cancelled) setLastMessages(map);
        }
      } finally {
        if (!cancelled) setContactLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onVendorViewedRef = useRef(onVendorViewed);
  onVendorViewedRef.current = onVendorViewed;
  const markingRef = useRef(false);

  useEffect(() => {
    if (selectedVendorId) onVendorViewedRef.current?.(selectedVendorId);
  }, [selectedVendorId]);

  useEffect(() => {
    if (!selectedVendorId || messages.length === 0 || markingRef.current) return;
    const hasUnread = messages.some(m => m.sender === 'vendor' && m.read === false && !m.deleted);
    if (hasUnread) {
      markingRef.current = true;
      supabase
        .from('vendor_admin_messages')
        .update({ read: true })
        .eq('vendor_id', selectedVendorId)
        .eq('sender', 'vendor')
        .eq('read', false)
        .eq('deleted', false)
        .then(() => {
          onVendorViewedRef.current?.(selectedVendorId);
          markingRef.current = false;
        });
    }
  }, [selectedVendorId, messages]);

  const loadMessages = useCallback(async (showLoader = true) => {
    if (!selectedVendorId) return;
    if (showLoader) setLoading(true);
    try {
      const { data } = await supabase
        .from('vendor_admin_messages')
        .select('*')
        .eq('vendor_id', selectedVendorId)
        .or('deleted.is.null,deleted.eq.false')
        .order('created_at', { ascending: true });
      setMessages((data ?? []) as ChatMessage[]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedVendorId]);

  useEffect(() => {
    if (selectedVendorId) loadMessages(true);
    else setMessages([]);
  }, [selectedVendorId, loadMessages]);

  useEffect(() => {
    if (!selectedVendorId) return;
    const ch = supabase
      .channel(`admin-vendor-chat-${selectedVendorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_admin_messages' }, () => loadMessages(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedVendorId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (isSimulating) return;
    if (!selectedVendorId) throw new Error('missing_context');
    const vendor = allVendors.find(v => v.id === selectedVendorId) ?? initialVendor;
    const payload = {
      content: content || '',
      sender: 'admin' as const,
      vendor_id: selectedVendorId,
      vendor_auth_id: vendor?.auth_user_id ?? null,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    };

    setMessages(prev => [...prev, {
      id: `_local_${Date.now()}`,
      content: payload.content,
      sender: payload.sender,
      vendor_id: payload.vendor_id,
      vendor_auth_id: payload.vendor_auth_id ?? undefined,
      created_at: new Date().toISOString(),
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    } as ChatMessage]);

    supabase.from('vendor_admin_messages').insert(payload).then(({ error }) => {
      if (error) console.error('[ChatVendeur] insert error:', error.message);
      loadMessages(false).catch(() => {});
    });
    onMessageSent?.();
  }, [selectedVendorId, allVendors, initialVendor, onMessageSent, loadMessages, isSimulating]);

  const handleDelete = useCallback(async (id: string) => {
    if (isSimulating) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    supabase.from('vendor_admin_messages').delete().eq('id', id);
  }, [isSimulating]);

  const handleReset = useCallback(async () => {
    if (isSimulating) return;
    if (!selectedVendorId) return;
    await supabase.from('vendor_admin_messages').delete().eq('vendor_id', selectedVendorId);
    setMessages([]);
  }, [selectedVendorId, isSimulating]);

  const vendorsForContacts = (() => {
    const withMsgs = allVendors.filter(v => vendorsWithMessages.includes(v.id));
    if (initialVendor && !withMsgs.some(v => v.id === initialVendor.id)) {
      const fromAll = allVendors.find(v => v.id === initialVendor.id);
      return [fromAll ?? initialVendor, ...withMsgs];
    }
    if (initialVendor && allVendors.length === 0) {
      return [initialVendor];
    }
    return withMsgs;
  })();

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
      const allIds = vendorsForContacts.map(v => v.id);
      setSelectedConvos(new Set(allIds));
    } else {
      setSelectedConvos(new Set());
    }
  }, [vendorsForContacts]);

  const handleDeleteConvos = useCallback(() => { setConfirmDelete(true); }, []);

  const handleConfirmDeleteConvos = useCallback(async () => {
    const ids = [...selectedConvos];
    await Promise.all(ids.map(vendorId =>
      supabase.from('vendor_admin_messages').delete().eq('vendor_id', vendorId)
    ));
    if (selectedVendorId && ids.includes(selectedVendorId)) {
      setMessages([]);
      setSelectedVendorId(null);
    }
    setVendorsWithMessages(prev => prev.filter(id => !ids.includes(id)));
    setLastMessages(prev => {
      const next = { ...prev };
      ids.forEach(id => delete next[id]);
      return next;
    });
    setSelectedConvos(new Set());
    setSelectMode(false);
    setConfirmDelete(false);
  }, [selectedConvos, selectedVendorId]);

  const contacts: ChatContact[] = vendorsForContacts.map(v => {
    const lastMsg = lastMessages[v.id];
    return {
      id: v.id,
      displayName: [v.first_name, v.last_name].filter(Boolean).join(' ') || v.email,
      subtitle: v.email,
      initial: (v.first_name || v.email).charAt(0).toUpperCase(),
      lastMessage: lastMsg?.content || undefined,
      lastMessageAt: lastMsg?.created_at || undefined,
      lastMessageSender: lastMsg?.sender || undefined,
    };
  });

  const selectedConvoIds = useMemo(() => selectedConvos, [selectedConvos]);

  return (
    <div className="flex flex-col flex-1 space-y-2 md:space-y-4" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base md:text-xl font-bold" style={{ color: tokens.text.primary }}>Chat Vendeurs</h2>
          <p className="text-[11px] md:text-xs mt-0.5 hidden sm:block" style={{ color: tokens.text.quaternary }}>Chat avec les vendeurs</p>
        </div>
        <div
          className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(34,211,238,0.08)', boxShadow: '0 0 16px rgba(34,211,238,0.15)' }}
        >
          <MessageSquare className="w-4 h-4 text-cyan-400" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <MessagingPanel
          contacts={contacts}
          selectedContactId={selectedVendorId}
          onSelectContact={setSelectedVendorId}
          messages={messages}
          currentRole="admin"
          currentUserId=""
          displayName="Admin"
          accentColor="#22d3ee"
          accentRgb="34,211,238"
          onSendMessage={handleSend}
          onDeleteMessage={handleDelete}
          onResetChat={handleReset}
          isAdmin={true}
          loading={loading}
          contactLoading={contactLoading}
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
