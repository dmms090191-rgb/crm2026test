import { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';
import type { Vendor } from './ListeVendeurs';

interface ChatVendeurProps {
  initialVendor?: Vendor | null;
  onMessageSent?: () => void;
}

export default function ChatVendeur({ initialVendor, onMessageSent }: ChatVendeurProps) {
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [vendorsWithMessages, setVendorsWithMessages] = useState<string[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(initialVendor?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(true);

  useEffect(() => {
    setContactLoading(true);
    Promise.all([
      supabase.from('vendors').select('id,first_name,last_name,email,auth_user_id,password,phone,created_at').order('last_name'),
      supabase.from('vendor_admin_messages').select('vendor_id').not('vendor_id', 'is', null),
    ]).then(([{ data: vendorData }, { data: msgData }]) => {
      if (vendorData) setAllVendors(vendorData as Vendor[]);
      const vendorIdsWithMsgs = [...new Set((msgData ?? []).map((m: { vendor_id: string }) => m.vendor_id))];
      setVendorsWithMessages(vendorIdsWithMsgs);
      setContactLoading(false);
    });
  }, []);

  const selectedVendor = allVendors.find(v => v.id === selectedVendorId) ?? (initialVendor ?? null);

  const loadMessages = useCallback(async () => {
    if (!selectedVendorId) return;
    setLoading(true);
    const { data } = await supabase
      .from('vendor_admin_messages')
      .select('*')
      .eq('vendor_id', selectedVendorId)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as ChatMessage[]);
    setLoading(false);
  }, [selectedVendorId]);

  useEffect(() => {
    if (selectedVendorId) loadMessages();
    else setMessages([]);
  }, [selectedVendorId, loadMessages]);

  useEffect(() => {
    if (!selectedVendorId) return;
    const ch = supabase
      .channel(`admin-vendor-chat-${selectedVendorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_admin_messages' }, loadMessages)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedVendorId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!selectedVendorId) return;
    const vendor = allVendors.find(v => v.id === selectedVendorId) ?? initialVendor;
    const { data: inserted, error } = await supabase.from('vendor_admin_messages').insert({
      content: content || '',
      sender: 'admin',
      vendor_id: selectedVendorId,
      vendor_auth_id: vendor?.auth_user_id ?? null,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    }).select().maybeSingle();
    if (!error && inserted) {
      setMessages(prev => [...prev, inserted as ChatMessage]);
    }
    onMessageSent?.();
  }, [selectedVendorId, allVendors, initialVendor, onMessageSent]);

  const handleDelete = useCallback(async (id: string) => {
    await supabase.from('vendor_admin_messages').update({ deleted: true }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true } : m));
  }, []);

  const handleReset = useCallback(async () => {
    if (!selectedVendorId) return;
    await supabase.from('vendor_admin_messages').delete().eq('vendor_id', selectedVendorId);
    setMessages([]);
  }, [selectedVendorId]);

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

  const contacts: ChatContact[] = vendorsForContacts.map(v => ({
    id: v.id,
    displayName: [v.first_name, v.last_name].filter(Boolean).join(' ') || v.email,
    subtitle: v.email,
    initial: (v.first_name || v.email).charAt(0).toUpperCase(),
  }));

  return (
    <div className="flex flex-col h-full space-y-4" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-white text-xl font-bold">Chat Vendeurs</h2>
          <p className="text-slate-600 text-xs mt-0.5">
            {selectedVendor
              ? `Conversation avec ${[selectedVendor.first_name, selectedVendor.last_name].filter(Boolean).join(' ')}`
              : 'Sélectionnez un vendeur'}
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(34,211,238,0.08)', boxShadow: '0 0 16px rgba(34,211,238,0.15)' }}
        >
          <MessageSquare className="w-4 h-4 text-cyan-400" />
        </div>
      </div>

      <div className="flex-1" style={{ minHeight: 0 }}>
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
          loading={loading}
          contactLoading={contactLoading}
        />
      </div>
    </div>
  );
}
