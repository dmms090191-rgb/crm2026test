import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';
import { useThemeTokens } from '../../../hooks/useThemeTokens';

interface ClientMessagerieProps {
  clientName: string;
  clientAuthId: string;
  isAdmin?: boolean;
}

interface VendorRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const ADMIN_CONTACT_ID = '__admin__';

export default function ClientMessagerie({ clientName, clientAuthId, isAdmin }: ClientMessagerieProps) {
  const tokens = useThemeTokens();
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(true);
  const [leadVendorId, setLeadVendorId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientAuthId) { setContactLoading(false); return; }
    supabase
      .from('leads')
      .select('id, vendor_id, vendors:vendor_id(id, first_name, last_name, email)')
      .eq('id', clientAuthId)
      .eq('actif', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.vendors && data.vendor_id) {
          const v = data.vendors as unknown as VendorRow;
          setVendor(v);
          setLeadVendorId(data.vendor_id);
          setSelectedId(v.id);
        } else {
          setVendor(null);
          setLeadVendorId(null);
          setSelectedId(ADMIN_CONTACT_ID);
        }
        setContactLoading(false);
      });
  }, [clientAuthId]);

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

  useEffect(() => { loadMessages(true); }, [loadMessages]);

  useEffect(() => {
    const ch = supabase
      .channel(`client-messages-${clientAuthId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_messages' }, () => loadMessages(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientAuthId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!clientAuthId) throw new Error('missing_context');
    const payload = {
      content: content || '',
      sender: 'client' as const,
      client_auth_id: clientAuthId,
      vendor_id: leadVendorId,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    };

    setMessages(prev => [...prev, {
      id: `_local_${Date.now()}`,
      content: payload.content,
      sender: payload.sender,
      client_auth_id: payload.client_auth_id,
      vendor_id: payload.vendor_id ?? undefined,
      created_at: new Date().toISOString(),
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    } as ChatMessage]);

    supabase.from('client_messages').insert(payload).then(({ error }) => {
      if (error) console.error('[ClientMessagerie] insert error:', error.message);
      loadMessages(false).catch(() => {});
    });
  }, [clientAuthId, leadVendorId, loadMessages]);

  const handleDelete = useCallback(async (id: string) => {
    if (!isAdmin) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    supabase.from('client_messages').delete().eq('id', id);
  }, [isAdmin]);


  const lastMsg = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].deleted) return messages[i];
    }
    return null;
  }, [messages]);

  const contacts: ChatContact[] = vendor
    ? [{
        id: vendor.id,
        displayName: [vendor.first_name, vendor.last_name].filter(Boolean).join(' ') || vendor.email,
        subtitle: 'Votre conseiller',
        initial: (vendor.first_name || vendor.email || 'C').charAt(0).toUpperCase(),
        lastMessage: lastMsg?.content || undefined,
        lastMessageAt: lastMsg?.created_at || undefined,
        lastMessageSender: lastMsg?.sender || undefined,
      }]
    : [{
        id: ADMIN_CONTACT_ID,
        displayName: 'Support',
        subtitle: 'Assistance',
        initial: 'S',
        lastMessage: lastMsg?.content || undefined,
        lastMessageAt: lastMsg?.created_at || undefined,
        lastMessageSender: lastMsg?.sender || undefined,
      }];

  return (
    <div className="flex flex-col flex-1 space-y-2 md:space-y-4" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base md:text-xl font-bold" style={{ color: tokens.text.primary }}>Messagerie</h2>
          <p className="text-[11px] md:text-xs mt-0.5 hidden sm:block" style={{ color: tokens.text.quaternary }}>Communiquez avec votre conseiller</p>
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
          currentRole="client"
          currentUserId={clientAuthId}
          displayName={clientName}
          accentColor="#34d399"
          accentRgb="52,211,153"
          onSendMessage={handleSend}
          onDeleteMessage={handleDelete}
          isAdmin={isAdmin}
          loading={loading}
          contactLoading={contactLoading}
        />
      </div>
    </div>
  );
}
