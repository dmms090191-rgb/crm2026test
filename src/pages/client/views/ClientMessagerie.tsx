import { useState, useEffect, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';
import { useThemeTokens } from '../../../hooks/useThemeTokens';

interface ClientMessagerieProps {
  clientName: string;
  clientAuthId: string;
}

interface VendorRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const ADMIN_CONTACT_ID = '__admin__';

export default function ClientMessagerie({ clientName, clientAuthId }: ClientMessagerieProps) {
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
    if (!clientAuthId) return;
    try {
      const { data: inserted, error } = await supabase.from('client_messages').insert({
        content: content || '',
        sender: 'client',
        client_auth_id: clientAuthId,
        vendor_id: leadVendorId,
        ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
      }).select().maybeSingle();
      if (error) {
        console.error('Erreur envoi message client:', error);
        return;
      }
      if (inserted) {
        setMessages(prev => [...prev, inserted as ChatMessage]);
      }
    } catch {
      // Ensure the promise resolves so the send button spinner stops
    }
  }, [clientAuthId, leadVendorId]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDelete = useCallback(async (_id: string) => {}, []);

  const contacts: ChatContact[] = vendor
    ? [{
        id: vendor.id,
        displayName: [vendor.first_name, vendor.last_name].filter(Boolean).join(' ') || vendor.email,
        subtitle: 'Votre conseiller',
        initial: (vendor.first_name || vendor.email || 'C').charAt(0).toUpperCase(),
      }]
    : [{
        id: ADMIN_CONTACT_ID,
        displayName: 'Support',
        subtitle: 'Assistance',
        initial: 'S',
      }];

  return (
    <div className="flex flex-col h-full space-y-2 md:space-y-4" style={{ minHeight: 0 }}>
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

      <div className="flex-1" style={{ minHeight: 0 }}>
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
          loading={loading}
          contactLoading={contactLoading}
        />
      </div>
    </div>
  );
}
