import { useState, useEffect, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';
import type { ChatLead } from './Crm';

interface LeadRow {
  id: string;
  data: Record<string, string>;
  vendor_id?: string | null;
}

interface ChatClientProps {
  initialLead?: ChatLead | null;
  onMessageSent?: () => void;
}

export default function ChatClient({ initialLead, onMessageSent }: ChatClientProps) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(true);

  useEffect(() => {
    setContactLoading(true);
    (async () => {
      const { data: msgData } = await supabase
        .from('client_messages')
        .select('client_auth_id')
        .not('client_auth_id', 'is', null);

      const authIds = [...new Set((msgData ?? []).map((m: { client_auth_id: string }) => m.client_auth_id))];

      const { data } = await supabase
        .from('leads')
        .select('id,data,vendor_id')
        .eq('actif', true)
        .order('imported_at', { ascending: false });

      const allLeads = (data ?? []) as LeadRow[];

      const filtered = allLeads.filter(l => {
        if (initialLead && l.id === initialLead.id) return true;
        const authId = l.data['AuthId'] ?? l.data['auth_id'] ?? l.id;
        return authIds.includes(authId);
      });

      setLeads(filtered);
      setContactLoading(false);
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

  const loadMessages = useCallback(async () => {
    if (!clientAuthId) return;
    setLoading(true);
    const { data } = await supabase
      .from('client_messages')
      .select('*')
      .eq('client_auth_id', clientAuthId)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as ChatMessage[]);
    setLoading(false);
  }, [clientAuthId]);

  useEffect(() => {
    if (clientAuthId) loadMessages();
    else setMessages([]);
  }, [clientAuthId, loadMessages]);

  useEffect(() => {
    if (!clientAuthId) return;
    const ch = supabase
      .channel(`admin-client-chat-${clientAuthId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_messages' }, loadMessages)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientAuthId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!clientAuthId) return;
    const { data: inserted, error } = await supabase.from('client_messages').insert({
      content: content || '',
      sender: 'admin',
      client_auth_id: clientAuthId,
      vendor_id: selectedLead?.vendor_id ?? null,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    }).select().maybeSingle();
    if (!error && inserted) {
      setMessages(prev => [...prev, inserted as ChatMessage]);
    }
    onMessageSent?.();
  }, [clientAuthId, selectedLead, onMessageSent]);

  const handleDelete = useCallback(async (id: string) => {
    await supabase.from('client_messages').update({ deleted: true }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true } : m));
  }, []);

  const handleReset = useCallback(async () => {
    if (!clientAuthId) return;
    await supabase.from('client_messages').delete().eq('client_auth_id', clientAuthId);
    setMessages([]);
  }, [clientAuthId]);

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
          currentRole="admin"
          currentUserId=""
          displayName="Admin"
          accentColor="#34d399"
          accentRgb="52,211,153"
          onSendMessage={handleSend}
          onDeleteMessage={handleDelete}
          onResetChat={handleReset}
          loading={loading}
          contactLoading={contactLoading}
        />
      </div>
    </div>
  );
}
