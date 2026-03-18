import { useState, useEffect, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';
import type { VendorChatLead } from '../VendorDashboard';

interface LeadRow {
  id: string;
  data: Record<string, string>;
  vendor_id?: string | null;
}

interface VendorChatClientProps {
  vendorName: string;
  vendorDbId: string | null;
  initialLead?: VendorChatLead | null;
}

export default function VendorChatClient({ vendorName, vendorDbId, initialLead }: VendorChatClientProps) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialLead?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(true);

  useEffect(() => {
    if (!vendorDbId) { setContactLoading(false); return; }
    setContactLoading(true);
    supabase
      .from('leads')
      .select('id,data,vendor_id')
      .eq('vendor_id', vendorDbId)
      .eq('actif', true)
      .order('imported_at', { ascending: false })
      .then(({ data }) => {
        if (data) setLeads(data as LeadRow[]);
        setContactLoading(false);
      });
  }, [vendorDbId]);

  useEffect(() => {
    if (initialLead) setSelectedId(initialLead.id);
  }, [initialLead]);

  const selectedLead = leads.find(l => l.id === selectedId) ?? null;
  const clientAuthId = selectedLead
    ? (selectedLead.data['AuthId'] ?? selectedLead.data['auth_id'] ?? selectedLead.id)
    : null;

  const loadMessages = useCallback(async () => {
    if (!clientAuthId || !vendorDbId) return;
    setLoading(true);
    const { data } = await supabase
      .from('client_messages')
      .select('*')
      .eq('client_auth_id', clientAuthId)
      .eq('vendor_id', vendorDbId)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as ChatMessage[]);
    setLoading(false);
  }, [clientAuthId, vendorDbId]);

  useEffect(() => {
    if (clientAuthId && vendorDbId) loadMessages();
    else setMessages([]);
  }, [clientAuthId, vendorDbId, loadMessages]);

  useEffect(() => {
    if (!clientAuthId || !vendorDbId) return;
    const ch = supabase
      .channel(`vendor-client-chat-${vendorDbId}-${clientAuthId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_messages' }, loadMessages)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientAuthId, vendorDbId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!clientAuthId || !vendorDbId) return;
    const { data: inserted, error } = await supabase.from('client_messages').insert({
      content: content || '',
      sender: 'vendor',
      client_auth_id: clientAuthId,
      vendor_id: vendorDbId,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    }).select().maybeSingle();
    if (!error && inserted) {
      setMessages(prev => [...prev, inserted as ChatMessage]);
    }
  }, [clientAuthId, vendorDbId]);

  const handleDelete = useCallback(async (id: string) => {
    await supabase.from('client_messages').update({ deleted: true }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true } : m));
  }, []);

  const contacts: ChatContact[] = leads.map(l => {
    const nom = l.data['Nom'] ?? l.data['nom'] ?? '';
    const prenom = l.data['Prenom'] ?? l.data['prenom'] ?? '';
    const email = l.data['Email'] ?? l.data['email'] ?? '';
    const displayName = [prenom, nom].filter(Boolean).join(' ') || email || l.id.slice(0, 8);
    const initial = (prenom || email || 'C').charAt(0).toUpperCase();
    return { id: l.id, displayName, subtitle: email, initial };
  });

  const selectedContact = contacts.find(c => c.id === selectedId);

  return (
    <div className="flex flex-col h-full space-y-4" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-white text-xl font-bold">Chat Client</h2>
          <p className="text-slate-600 text-xs mt-0.5">
            {selectedContact ? `Conversation avec ${selectedContact.displayName}` : 'Sélectionnez un client'}
          </p>
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
          currentRole="vendor"
          currentUserId={vendorDbId ?? ''}
          displayName={vendorName}
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
