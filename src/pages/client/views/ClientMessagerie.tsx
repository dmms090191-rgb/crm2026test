import { useState, useEffect, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';

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

export default function ClientMessagerie({ clientName, clientAuthId }: ClientMessagerieProps) {
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(true);

  useEffect(() => {
    if (!clientAuthId) { setContactLoading(false); return; }
    supabase
      .from('leads')
      .select('vendor_id, vendors:vendor_id(id, first_name, last_name, email)')
      .eq('actif', true)
      .order('imported_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && data[0].vendors) {
          const v = data[0].vendors as unknown as VendorRow;
          setVendor(v);
          setSelectedId(v.id);
        }
        setContactLoading(false);
      });
  }, [clientAuthId]);

  const vendorDbId = vendor?.id ?? null;

  const loadMessages = useCallback(async () => {
    if (!clientAuthId) return;
    setLoading(true);
    let query = supabase
      .from('client_messages')
      .select('*')
      .eq('client_auth_id', clientAuthId)
      .order('created_at', { ascending: true });
    if (vendorDbId) {
      query = query.eq('vendor_id', vendorDbId);
    }
    const { data } = await query;
    setMessages((data ?? []) as ChatMessage[]);
    setLoading(false);
  }, [clientAuthId, vendorDbId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    const ch = supabase
      .channel(`client-messages-${clientAuthId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_messages' }, loadMessages)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientAuthId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!clientAuthId) return;
    await supabase.from('client_messages').insert({
      content: content || '',
      sender: 'client',
      client_auth_id: clientAuthId,
      vendor_id: vendorDbId,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    });
  }, [clientAuthId, vendorDbId]);

  const handleDelete = useCallback(async (_id: string) => {}, []);

  const contacts: ChatContact[] = vendor
    ? [{
        id: vendor.id,
        displayName: [vendor.first_name, vendor.last_name].filter(Boolean).join(' ') || vendor.email,
        subtitle: 'Votre conseiller',
        initial: (vendor.first_name || vendor.email || 'C').charAt(0).toUpperCase(),
      }]
    : [];

  return (
    <div className="flex flex-col h-full space-y-4" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-white text-xl font-bold">Messagerie</h2>
          <p className="text-slate-600 text-xs mt-0.5">Communiquez avec votre conseiller</p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
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
