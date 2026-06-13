import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, X, User, Sparkles, Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import type { ChatMessage } from './editeurIaTypes';
import QuickActions from './QuickActions';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

const GLASS_PANEL_STYLE = (t: ReturnType<typeof useThemeTokens>) => ({
  background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
  borderColor: t.surface.border,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
  backdropFilter: 'blur(8px)' as const,
  WebkitBackdropFilter: 'blur(8px)' as const,
});

interface SourceImageRef {
  url: string;
  name: string;
}

interface Props {
  messages: ChatMessage[];
  generating: boolean;
  onSend: (text: string, imageFile?: File, sourceImageUrl?: string) => void;
  sourceImageRef?: SourceImageRef | null;
  onClearSourceImage?: () => void;
}

export default function ChatPanel({ messages, generating, onSend, sourceImageRef, onClearSourceImage }: Props) {
  const t = useThemeTokens();
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAttach = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) return;
    setAttachedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    e.target.value = '';
  }, []);

  const removeAttachment = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setAttachedFile(null);
    setPreview(null);
  }, [preview]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed && !attachedFile && !sourceImageRef) return;
    onSend(trimmed, attachedFile || undefined, sourceImageRef?.url);
    setInput('');
    removeAttachment();
    onClearSourceImage?.();
  }, [input, attachedFile, onSend, removeAttachment, sourceImageRef, onClearSourceImage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleQuickAction = useCallback((prompt: string) => {
    setInput(prev => prev ? `${prev}\n${prompt}` : prompt);
  }, []);

  return (
    <div className="flex flex-col h-full border-r" style={GLASS_PANEL_STYLE(t)}>
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <h2 className="text-sm font-bold text-white/90">Conversation avec l'IA</h2>
        <p className="text-[11px] text-white/40 mt-0.5">Decrivez ce que vous voulez modifier</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mb-3 border border-cyan-500/10">
              <Sparkles className="w-6 h-6 text-cyan-400/60" />
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed max-w-[220px]">
              Envoyez un message pour generer ou modifier une image avec Stability AI
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {generating && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center flex-shrink-0 border border-cyan-500/10">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span className="text-[11px] text-white/50">Generation en cours...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="px-4 py-3">
          <p className="text-[10px] font-medium text-white/30 mb-1.5">
            Joindre une image (optionnel)
          </p>
          <p className="text-[9px] text-white/20 mb-2">
            Importez une image pour que l'IA l'analyse et la modifie
          </p>
        </div>

        {sourceImageRef && !attachedFile && (
          <div className="mx-4 mb-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 overflow-hidden">
            <div className="flex items-center gap-2.5 px-3 py-2">
              <RefreshCw className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-cyan-300 truncate">Modification de : {sourceImageRef.name}</p>
                <p className="text-[9px] text-cyan-400/60">Decrivez les modifications a apporter</p>
              </div>
              <button onClick={onClearSourceImage} className="p-1 rounded-md hover:bg-white/[0.06] text-cyan-400/50 hover:text-cyan-300 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-3 pb-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] font-semibold text-emerald-300/80">Correction legere active</span>
              <span className="text-[9px] text-white/25 ml-1">Personnages, visages et style preserves</span>
            </div>
          </div>
        )}

        {attachedFile && preview && (
          <div className="mx-4 mb-2 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <img src={preview} alt="" className="w-10 h-10 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-white/70 truncate">{attachedFile.name}</p>
              <p className="text-[9px] text-white/30">{(attachedFile.size / 1024).toFixed(0)} Ko</p>
            </div>
            <button onClick={removeAttachment} className="p-1 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <QuickActions onAction={handleQuickAction} />

        <div className="px-4 pb-4">
          <div className="relative rounded-xl bg-white/[0.04] border border-white/[0.08] focus-within:border-cyan-500/30 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Decrivez ce que vous voulez modifier..."
              rows={2}
              className="w-full bg-transparent text-[12px] text-white/80 placeholder-white/25 px-3 pt-2.5 pb-8 resize-none outline-none"
            />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleAttach} />
                <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors" title="Joindre une image">
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors" title="Image">
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={generating || (!input.trim() && !attachedFile)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 disabled:opacity-40 disabled:shadow-none transition-all duration-200 hover:scale-[1.02] disabled:hover:scale-100"
              >
                <Send className="w-3 h-3" />
                Envoyer a l'IA
              </button>
            </div>
          </div>
          <p className="text-[9px] text-white/20 mt-1.5 text-center">
            Shift + Entree pour aller a la ligne
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${
        isUser
          ? 'bg-white/[0.06] border-white/[0.08]'
          : 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-cyan-500/10'
      }`}>
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white/50" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        )}
      </div>
      <div className={`max-w-[85%] px-3 py-2 rounded-xl border ${
        isUser
          ? 'bg-white/[0.06] border-white/[0.08]'
          : 'bg-white/[0.03] border-white/[0.05]'
      }`}>
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt=""
            className="w-full max-w-[200px] rounded-lg mb-1.5 border border-white/[0.06]"
          />
        )}
        {message.text && (
          <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">{message.text}</p>
        )}
        <p className="text-[9px] text-white/20 mt-1 text-right">
          {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
