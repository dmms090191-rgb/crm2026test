import { ChangeEvent, useRef, useCallback, useState } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

interface ChatInputBarProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  onSendMessage: (content: string, file?: { url: string; name: string; type: string }) => Promise<void>;
  accentRgb: string;
  bubbleGradient: string;
  tokens: ThemeTokens;
}

export default function ChatInputBar({ input, setInput, onSend, sending, onSendMessage, accentRgb, bubbleGradient, tokens }: ChatInputBarProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  }, [onSend]);

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
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
    } catch {
      // Error handled by parent optimistic UI
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [onSendMessage]);

  return (
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
          onClick={onSend}
          disabled={!input.trim() || sending}
          className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 disabled:opacity-40"
          style={{ background: bubbleGradient, boxShadow: `0 0 14px rgba(${accentRgb},0.3)` }}
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" style={{ color: '#ffffff' }} /> : <Send className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: '#ffffff' }} />}
        </button>
      </div>
    </div>
  );
}
