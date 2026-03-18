import { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';

interface VendorChatAdminProps {
  vendorName: string;
  vendorDbId?: string | null;
  vendorAuthId?: string;
}

const ADMIN_CONTACT: ChatContact = {
  id: 'admin',
  displayName: 'Administrateur',
  subtitle: 'Votre responsable',
  initial: 'A',
};

export default function VendorChatAdmin({ vendorName, vendorDbId, vendorAuthId }: VendorChatAdminProps) {
  const [userId, setUserId] = useState<string | null>(vendorAuthId ?? null);
  const [vendorId, setVendorId] = useState<string | null>(vendorDbId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>('admin');

  useEffect(() => {
    if (vendorDbId) setVendorId(vendorDbId);
    if (vendorAuthId) { setUserId(vendorAuthId); return; }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      if (!vendorDbId) {
        const { data: vendorRow } = await supabase
          .from('vendors')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (vendorRow) setVendorId(vendorRow.id);
      }
    });
  }, [vendorAuthId, vendorDbId]);

  const loadMessages = useCallback(async () => {
    if (!userId && !vendorId) return;
    let query = supabase.from('vendor_admin_messages').select('*');
    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    } else {
      query = query.eq('vendor_auth_id', userId!);
    }
    const { data } = await query.order('created_at', { ascending: true });
    setMessages((data ?? []) as ChatMessage[]);
    setLoading(false);
  }, [userId, vendorId]);

  useEffect(() => { if (userId || vendorId) loadMessages(); }, [userId, vendorId, loadMessages]);

  useEffect(() => {
    if (!userId && !vendorId) return;
    const ch = supabase
      .channel(`vendor-admin-chat-${vendorId ?? userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_admin_messages' }, loadMessages)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, vendorId, loadMessages]);

  const handleSend = useCallback(async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!userId) return;
    const { data: inserted, error } = await supabase.from('vendor_admin_messages').insert({
      content: content || '',
      sender: 'vendor',
      vendor_auth_id: userId,
      vendor_id: vendorId ?? null,
      ...(file ? { file_url: file.url, file_name: file.name, file_type: file.type } : {}),
    }).select().maybeSingle();
    if (!error && inserted) {
      setMessages(prev => [...prev, inserted as ChatMessage]);
    }
  }, [userId, vendorId]);

  const handleDelete = useCallback(async (id: string) => {
    await supabase.from('vendor_admin_messages').update({ deleted: true }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true } : m));
  }, []);

  return (
    <div className="flex flex-col h-full space-y-4" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-white text-xl font-bold">Chat Admin</h2>
          <p className="text-slate-600 text-xs mt-0.5">Communiquez avec votre responsable</p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(14,165,233,0.08)', boxShadow: '0 0 16px rgba(14,165,233,0.15)' }}
        >
          <MessageSquare className="w-4 h-4 text-sky-400" />
        </div>
      </div>

      <div className="flex-1" style={{ minHeight: 0 }}>
        <MessagingPanel
          contacts={[ADMIN_CONTACT]}
          selectedContactId={selectedId}
          onSelectContact={setSelectedId}
          messages={messages}
          currentRole="vendor"
          currentUserId={userId ?? ''}
          displayName={vendorName}
          accentColor="#22d3ee"
          accentRgb="34,211,238"
          onSendMessage={handleSend}
          onDeleteMessage={handleDelete}
          loading={loading}
        />
      </div>
    </div>
  );
}
