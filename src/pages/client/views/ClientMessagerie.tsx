import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, User } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import MessagingPanel, { ChatMessage, ChatContact } from '../../../components/chat/ChatView';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useCompanyId } from '../../../hooks/useCompanyId';
import { sendPushForMessage } from '../../../lib/sendPushForMessage';
import { useClientConseiller } from '../../../hooks/useClientConseiller';

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
  const ctxCompanyId = useCompanyId();
  const { conseiller } = useClientConseiller(clientAuthId || null);
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(true);
  const [leadVendorId, setLeadVendorId] = useState<string | null>(null);
  const [leadCompanyId, setLeadCompanyId] = useState<string | null>(null);

  const companyId = ctxCompanyId || leadCompanyId;

  useEffect(() => {
    if (!clientAuthId) { setContactLoading(false); return; }
    supabase
      .from('leads')
      .select('id, vendor_id, company_id, vendors:vendor_id(id, first_name, last_name, email)')
      .eq('id', clientAuthId)
      .eq('actif', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLeadCompanyId(data.company_id ?? null);
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
      ...(companyId ? { company_id: companyId } : {}),
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

    if (companyId) {
      supabase.from('registrations').select('auth_user_id').eq('company_id', companyId).eq('role', 'admin').then(({ data }) => {
        const clientLabel = clientName || 'un client';
        (data ?? []).forEach(r => {
          if (r.auth_user_id) {
            sendPushForMessage({ targetUserId: r.auth_user_id, title: 'Talvex', body: `Nouveau message client de ${clientLabel}` });
          }
        });
      });
    }
    supabase.from('client_messages').insert(payload).select('id').single().then(({ data: inserted, error }) => {
      if (error) { console.error('[ClientMessagerie] insert error:', error.message); return; }
      loadMessages(false).catch(() => {});
      if (inserted?.id) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-auto-reply`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ message_id: inserted.id }),
          }).then(async (res) => {
            const body = await res.json().catch(() => null);
            console.log('[ClientMessagerie] chat-auto-reply response:', res.status, body);
          }).catch((err) => { console.error('[ClientMessagerie] chat-auto-reply fetch error:', err); });
        });
      }
    });
  }, [clientAuthId, leadVendorId, loadMessages]);

  const handleDelete = useCallback(async (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true } : m));
    const { error } = await supabase
      .from('client_messages')
      .update({ deleted: true })
      .eq('id', id)
      .eq('client_auth_id', clientAuthId);
    if (error) {
      console.error('[ClientMessagerie] delete error:', error.message);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: false } : m));
    }
  }, [clientAuthId]);


  const lastMsg = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].deleted) return messages[i];
    }
    return null;
  }, [messages]);

  const adminFallbackName = conseiller?.role === 'admin' && conseillerName ? conseillerName : null;

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
        displayName: adminFallbackName || 'Support',
        subtitle: adminFallbackName ? 'Responsable' : 'Assistance',
        initial: (adminFallbackName || 'S').charAt(0).toUpperCase(),
        lastMessage: lastMsg?.content || undefined,
        lastMessageAt: lastMsg?.created_at || undefined,
        lastMessageSender: lastMsg?.sender || undefined,
      }];

  const conseillerName = conseiller
    ? [conseiller.firstName, conseiller.lastName].filter(Boolean).join(' ')
    : null;

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

      {conseillerName && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl flex-shrink-0" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)' }}>
          <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#06b6d4' }} />
          <p className="text-[11px] font-medium" style={{ color: tokens.text.tertiary }}>
            Vous echangez avec : <span className="font-bold" style={{ color: tokens.text.primary }}>{conseillerName}</span>
          </p>
        </div>
      )}

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
