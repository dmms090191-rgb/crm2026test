import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';
import type { Vendor } from './ListeVendeurs';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useCompanyId } from '../../../hooks/useCompanyId';
import { useSimulation } from '../../../contexts/SimulationContext';
import { sendPushForMessage } from '../../../lib/sendPushForMessage';
import ChatVendeurHeader from './chat-vendeur/ChatVendeurHeader';
import ChatVendeurDeleteModal from './chat-vendeur/ChatVendeurDeleteModal';

interface ChatVendeurProps {
  initialVendor?: Vendor | null;
  onMessageSent?: () => void;
  onVendorViewed?: (vendorId: string) => void;
}

export default function ChatVendeur({ initialVendor, onMessageSent, onVendorViewed }: ChatVendeurProps) {
  const tokens = useThemeTokens();
  const companyId = useCompanyId();
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
      if (!companyId) return;
      try {
        const [{ data: vendorData }, { data: msgData }] = await Promise.all([
          supabase.from('vendors').select('id,first_name,last_name,email,auth_user_id,password,phone,created_at').eq('company_id', companyId).order('last_name'),
          supabase.from('vendor_admin_messages').select('vendor_id').eq('company_id', companyId).not('vendor_id', 'is', null).or('deleted.is.null,deleted.eq.false'),
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
  }, [companyId]);

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
      ...(companyId ? { company_id: companyId } : {}),
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
    if (vendor?.auth_user_id) {
      sendPushForMessage({ targetUserId: vendor.auth_user_id, title: 'Talvex', body: 'Nouveau message admin' });
    }
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
      <ChatVendeurHeader tokens={tokens} />

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
        <ChatVendeurDeleteModal
          count={selectedConvos.size}
          tokens={tokens}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleConfirmDeleteConvos}
        />
      )}
    </div>
  );
}
