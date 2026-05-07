import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { Send, Paperclip, Trash2, X, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useTimezone } from '../../hooks/useTimezone';
import FilePreview from './FilePreview';
import ContactSidebar from './ContactSidebar';
import { SENDER_STYLES, SENDER_LABELS, formatTime } from './chatTypes';
import type { ChatMessage, MessagingPanelProps } from './chatTypes';

export type { ChatMessage, UserRole, ChatContact, MessagingPanelProps } from './chatTypes';

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
  const tokens = useThemeTokens();
  const { timezone } = useTimezone();

  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [mobileConvoOpen, setMobileConvoOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  const handleSelectContact = useCallback((id: string) => {
    onSelectContact(id);
    setMobileConvoOpen(true);
  }, [onSelectContact]);

  const handleMobileBack = useCallback(() => {
    setMobileConvoOpen(false);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      await onSendMessage(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `chat/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from('chat-files').upload(path, file, { upsert: false });
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(path);
        const isImage = file.type.startsWith('image/');
        await onSendMessage('', { url: publicUrl, name: file.name, type: isImage ? 'image' : 'document' });
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleReset = async () => {
    if (!onResetChat) return;
    setResetting(true);
    try {
      await onResetChat();
    } finally {
      setResetting(false);
    }
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const myCfg = SENDER_STYLES[currentRole] ?? SENDER_STYLES.admin;
  const lastOwnMsgId = [...messages].reverse().find(m => m.sender === currentRole && !m.deleted)?.id;

  const canDelete = useCallback((msg: ChatMessage) => {
    if (msg.deleted) return false;
    if (currentRole === 'admin') return true;
    if (currentRole === 'vendor') return msg.sender === 'vendor' && msg.id === lastOwnMsgId;
    return false;
  }, [currentRole, lastOwnMsgId]);

  const showSidebar = contacts.length >= 1;

  return (
    <div className={`flex gap-0 overflow-hidden rounded-2xl md:h-full ${mobileConvoOpen ? 'h-[calc(100dvh-100px)] md:h-full' : 'h-[calc(100dvh-180px)] md:h-full'}`} style={{ border: `1px solid ${tokens.chat.border}`, minHeight: 0 }}>
      {showSidebar && (
        <ContactSidebar
          contacts={contacts}
          selectedContactId={selectedContactId}
          onSelectContact={handleSelectContact}
          search={search}
          onSearchChange={setSearch}
          contactLoading={contactLoading ?? false}
          accentColor={accentColor}
          accentRgb={accentRgb}
          tokens={tokens}
          className={`w-full md:w-64 flex-shrink-0 ${mobileConvoOpen ? 'hidden md:flex' : 'flex'}`}
          currentRole={currentRole}
        />
      )}

      <div className={`flex-1 flex flex-col overflow-hidden ${mobileConvoOpen || !showSidebar ? 'flex' : 'hidden md:flex'}`} style={{ minWidth: 0 }}>
        {!selectedContact ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.chat.inputBg, border: `1px solid ${tokens.chat.border}` }}>
              <Send className="w-5 h-5" style={{ color: tokens.chat.emptyText }} />
            </div>
            <p className="text-sm" style={{ color: tokens.chat.emptyText }}>Selectionnez une conversation</p>
          </div>
        ) : (
          <>
            <div
              className="flex items-center justify-between px-2.5 md:px-5 py-1.5 md:py-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${tokens.chat.border}` }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMobileBack}
                  className="md:hidden p-1 -ml-0.5 rounded-lg transition-colors"
                  style={{ color: tokens.text.tertiary }}
                >
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <div
                  className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center text-[10px] md:text-xs font-bold"
                  style={{ background: `rgba(${accentRgb},0.15)`, border: `1px solid rgba(${accentRgb},0.25)`, color: accentColor }}
                >
                  {selectedContact.initial}
                </div>
                <div>
                  <p className="text-xs md:text-sm font-semibold" style={{ color: tokens.text.primary }}>{selectedContact.displayName}</p>
                  {selectedContact.subtitle && (
                    <p className="text-[9px] md:text-[10px] hidden sm:block" style={{ color: tokens.text.quaternary }}>{selectedContact.subtitle}</p>
                  )}
                </div>
              </div>
              {currentRole === 'admin' && onResetChat && (
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                  style={{
                    background: tokens.chat.inputBg,
                    border: `1px solid ${tokens.chat.border}`,
                    color: tokens.text.quaternary,
                  }}
                >
                  <RefreshCw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Reinitialiser</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-2.5 md:px-5 py-1.5 md:py-4 space-y-1 md:space-y-4" style={{ minHeight: 0 }}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: tokens.surface.border, borderTopColor: accentColor }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <p className="text-xs" style={{ color: tokens.chat.emptyText }}>Aucun message pour l'instant</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.sender === currentRole;
                  const senderCfg = SENDER_STYLES[msg.sender] ?? SENDER_STYLES.admin;
                  const senderLabel = isOwn ? displayName : (selectedContact?.displayName ?? SENDER_LABELS[msg.sender] ?? msg.sender);

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-1 md:gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                      onMouseEnter={() => setHoveredId(msg.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className={`flex flex-col max-w-[82%] md:max-w-xs ${isOwn ? 'items-end' : 'items-start'}`}>
                        <span className={`text-[9px] md:text-[11px] font-medium mb-px md:mb-1 px-0.5 md:px-1 ${isOwn ? 'text-right' : 'text-left'}`} style={{ color: isOwn ? `rgba(${accentRgb},0.8)` : tokens.text.tertiary }}>
                          {senderLabel}
                        </span>
                        <div
                          className="relative px-2.5 md:px-4 py-1 md:py-2.5 rounded-xl md:rounded-2xl"
                          style={isOwn
                            ? { background: isOwn ? myCfg.bubbleGradient : undefined, boxShadow: `0 2px 12px ${myCfg.glow}` }
                            : senderCfg.bubbleSolid(tokens)
                          }
                        >
                          {msg.deleted ? (
                            <p className="text-xs italic flex items-center gap-1.5" style={{ color: tokens.text.quaternary }}>
                              <X className="w-3 h-3" />Message supprime
                            </p>
                          ) : (
                            <>
                              {msg.content && (
                                <p className="text-xs md:text-sm leading-normal md:leading-relaxed whitespace-pre-wrap break-words" style={{ color: isOwn ? tokens.chat.messageTextOwn : tokens.chat.messageTextOther }}>{msg.content}</p>
                              )}
                              {msg.file_url && msg.file_name && (
                                <FilePreview url={msg.file_url} name={msg.file_name} type={msg.file_type} tokens={tokens} />
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

                        <span className="text-[8px] md:text-[10px] mt-px md:mt-1 px-0.5" style={{ color: tokens.chat.timestamp }}>
                          {formatTime(msg.created_at, timezone)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-2 md:px-4 py-2 md:py-3 flex-shrink-0" style={{ borderTop: `1px solid ${tokens.chat.border}` }}>
              <div className="flex items-center gap-1.5 md:gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 disabled:opacity-40"
                  style={{ background: tokens.chat.inputBg, border: `1px solid ${tokens.chat.inputBorder}`, color: tokens.text.tertiary }}
                  title="Joindre un fichier"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Paperclip className="w-3.5 h-3.5 md:w-4 md:h-4" />}
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
                  placeholder="Ecrire un message..."
                  className="flex-1 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm outline-none transition-all min-w-0"
                  style={{
                    background: tokens.chat.inputBg,
                    border: `1px solid ${tokens.chat.inputBorder}`,
                    color: tokens.chat.inputText,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = `rgba(${accentRgb},0.3)`)}
                  onBlur={e => (e.currentTarget.style.borderColor = tokens.chat.inputBorder)}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 disabled:opacity-40"
                  style={{ background: myCfg.bubbleGradient, boxShadow: `0 0 14px rgba(${accentRgb},0.3)` }}
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" style={{ color: '#ffffff' }} /> : <Send className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: '#ffffff' }} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
