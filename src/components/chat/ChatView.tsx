import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { Send, Paperclip, Trash2, FileText, X, Loader2, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  deleted?: boolean;
  created_at: string;
  vendor_auth_id?: string;
  client_auth_id?: string;
  vendor_id?: string;
}

export type UserRole = 'admin' | 'vendor' | 'client';

export interface ChatContact {
  id: string;
  displayName: string;
  subtitle?: string;
  initial: string;
}

export interface MessagingPanelProps {
  contacts: ChatContact[];
  selectedContactId: string | null;
  onSelectContact: (id: string) => void;
  messages: ChatMessage[];
  currentRole: UserRole;
  currentUserId: string;
  displayName: string;
  accentColor: string;
  accentRgb: string;
  onSendMessage: (content: string, file?: { url: string; name: string; type: string }) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  onResetChat?: () => Promise<void>;
  loading: boolean;
  contactLoading?: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FilePreview({ url, name, type }: { url: string; name: string; type?: string | null }) {
  if (type === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        <img
          src={url}
          alt={name}
          className="max-w-[200px] max-h-[160px] rounded-xl object-cover hover:opacity-90 transition-opacity"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <span className="text-[10px] opacity-60 mt-0.5 block truncate max-w-[200px]">{name}</span>
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl hover:opacity-80 transition-opacity"
      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <FileText className="w-4 h-4 flex-shrink-0 text-slate-300" />
      <span className="text-xs text-slate-300 truncate max-w-[160px]">{name}</span>
    </a>
  );
}

interface AvatarProps {
  initial: string;
  gradient: string;
  glow: string;
  size?: 'sm' | 'md';
}

function Avatar({ initial, gradient, glow, size = 'sm' }: AvatarProps) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-sm';
  return (
    <div
      className={`${dim} rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: gradient, boxShadow: `0 0 10px ${glow}` }}
    >
      {initial}
    </div>
  );
}

const SENDER_STYLES: Record<string, { gradient: string; glow: string; bubbleGradient: string; bubbleSolid: React.CSSProperties }> = {
  admin: {
    gradient: 'linear-gradient(135deg,#0ea5e9,#2563eb)',
    glow: 'rgba(14,165,233,0.35)',
    bubbleGradient: 'linear-gradient(135deg,#0ea5e9,#2563eb)',
    bubbleSolid: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' },
  },
  vendor: {
    gradient: 'linear-gradient(135deg,#0ea5e9,#22d3ee)',
    glow: 'rgba(34,211,238,0.35)',
    bubbleGradient: 'linear-gradient(135deg,#0ea5e9,#22d3ee)',
    bubbleSolid: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' },
  },
  client: {
    gradient: 'linear-gradient(135deg,#34d399,#059669)',
    glow: 'rgba(52,211,153,0.35)',
    bubbleGradient: 'linear-gradient(135deg,#34d399,#059669)',
    bubbleSolid: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' },
  },
};

const SENDER_LABELS: Record<string, string> = {
  admin: 'Admin',
  vendor: 'Vendeur',
  client: 'Client',
};

export default function MessagingPanel({
  contacts,
  selectedContactId,
  onSelectContact,
  messages,
  currentRole,
  displayName,
  accentColor,
  accentRgb,
  onSendMessage,
  onDeleteMessage,
  onResetChat,
  loading,
  contactLoading,
}: MessagingPanelProps) {
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    await onSendMessage(text);
    setSending(false);
  }, [input, sending, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `chat/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('chat-files').upload(path, file, { upsert: false });
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(path);
      const isImage = file.type.startsWith('image/');
      await onSendMessage('', { url: publicUrl, name: file.name, type: isImage ? 'image' : 'document' });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleReset = async () => {
    if (!onResetChat) return;
    setResetting(true);
    await onResetChat();
    setResetting(false);
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const myCfg = SENDER_STYLES[currentRole] ?? SENDER_STYLES.admin;
  const myInitial = (displayName.charAt(0) || currentRole.charAt(0)).toUpperCase();

  const lastOwnMsgId = [...messages].reverse().find(m => m.sender === currentRole && !m.deleted)?.id;

  const canDelete = useCallback((msg: ChatMessage) => {
    if (msg.deleted) return false;
    if (currentRole === 'admin') return true;
    if (currentRole === 'vendor') return msg.sender === 'vendor' && msg.id === lastOwnMsgId;
    return false;
  }, [currentRole, lastOwnMsgId]);

  const filteredContacts = contacts.filter(c =>
    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    (c.subtitle ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const showSidebar = contacts.length >= 1;

  return (
    <div className="flex h-full gap-0 overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)', minHeight: 0 }}>
      {/* Sidebar */}
      {showSidebar && <div
        className="w-64 flex-shrink-0 flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white placeholder-slate-600 outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              onFocus={e => (e.currentTarget.style.borderColor = `rgba(${accentRgb},0.3)`)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {contactLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-5 h-5 border-2 border-slate-700 rounded-full animate-spin" style={{ borderTopColor: accentColor }} />
            </div>
          ) : filteredContacts.length === 0 ? (
            <p className="text-xs text-slate-700 text-center py-6">Aucune conversation</p>
          ) : (
            filteredContacts.map(contact => {
              const isActive = contact.id === selectedContactId;
              return (
                <button
                  key={contact.id}
                  onClick={() => onSelectContact(contact.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl mb-0.5 text-left transition-all"
                  style={isActive ? {
                    background: `rgba(${accentRgb},0.1)`,
                    border: `1px solid rgba(${accentRgb},0.2)`,
                  } : {
                    background: 'transparent',
                    border: '1px solid transparent',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{
                      background: isActive ? `rgba(${accentRgb},0.8)` : 'rgba(255,255,255,0.07)',
                      boxShadow: isActive ? `0 0 8px rgba(${accentRgb},0.3)` : 'none',
                    }}
                  >
                    {contact.initial}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {contact.displayName}
                    </p>
                    {contact.subtitle && (
                      <p className="text-[10px] text-slate-600 truncate">{contact.subtitle}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
        {!selectedContact ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Send className="w-5 h-5 text-slate-700" />
            </div>
            <p className="text-slate-600 text-sm">Sélectionnez une conversation</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: `rgba(${accentRgb},0.15)`, border: `1px solid rgba(${accentRgb},0.25)`, color: accentColor }}
                >
                  {selectedContact.initial}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{selectedContact.displayName}</p>
                  {selectedContact.subtitle && (
                    <p className="text-slate-600 text-[10px]">{selectedContact.subtitle}</p>
                  )}
                </div>
              </div>
              {currentRole === 'admin' && onResetChat && (
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-400 transition-all disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <RefreshCw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
                  Réinitialiser
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ minHeight: 0 }}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-slate-700 rounded-full animate-spin" style={{ borderTopColor: accentColor }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <p className="text-slate-700 text-xs">Aucun message pour l'instant</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.sender === currentRole;
                  const senderCfg = SENDER_STYLES[msg.sender] ?? SENDER_STYLES.admin;
                  const senderLabel = isOwn ? displayName : (selectedContact?.displayName ?? SENDER_LABELS[msg.sender] ?? msg.sender);

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                      onMouseEnter={() => setHoveredId(msg.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className={`flex flex-col max-w-xs ${isOwn ? 'items-end' : 'items-start'}`}>
                        <span className={`text-[11px] font-medium mb-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`} style={{ color: isOwn ? `rgba(${accentRgb},0.8)` : 'rgba(148,163,184,0.7)' }}>
                          {senderLabel}
                        </span>
                        <div
                          className="relative px-4 py-2.5 rounded-2xl"
                          style={isOwn
                            ? { background: isOwn ? myCfg.bubbleGradient : undefined, boxShadow: `0 2px 12px ${myCfg.glow}` }
                            : senderCfg.bubbleSolid
                          }
                        >
                          {msg.deleted ? (
                            <p className="text-xs italic text-slate-500 flex items-center gap-1.5">
                              <X className="w-3 h-3" />Message supprimé
                            </p>
                          ) : (
                            <>
                              {msg.content && (
                                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                              )}
                              {msg.file_url && msg.file_name && (
                                <FilePreview url={msg.file_url} name={msg.file_name} type={msg.file_type} />
                              )}
                            </>
                          )}

                          {!msg.deleted && canDelete(msg) && hoveredId === msg.id && (
                            <button
                              onClick={() => onDeleteMessage(msg.id)}
                              className="absolute -top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
                              style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)' }}
                              title="Supprimer"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          )}
                        </div>

                        <span className="text-[10px] mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
                  title="Joindre un fichier"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrire un message..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = `rgba(${accentRgb},0.3)`)}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 disabled:opacity-40"
                  style={{ background: myCfg.bubbleGradient, boxShadow: `0 0 14px rgba(${accentRgb},0.3)` }}
                >
                  {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
