import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, Wrench, Zap, Bot, MessageCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { D } from './brainTheme';
import BrainTestChatMessages from './BrainTestChatMessages';

const QUICK_QUESTIONS = [
  'Quels sont les horaires du support ?',
  'Qui contacter en cas de probleme ?',
  'Comment ajouter un vendeur ?',
  'Comment activer les notifications ?',
];

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { name: string; input: unknown; output: unknown }[];
}

interface Props {
  companyId?: string;
  isPlatform?: boolean;
  tokens?: Record<string, any>;
  accentColor?: string;
}

export default function BrainTestChat({ companyId, isPlatform, tokens, accentColor }: Props) {
  const dark = !tokens;
  const ac = accentColor ?? D.accent;
  const acMuted = dark ? D.accentMuted : ac;
  const cardBg = dark ? D.card : tokens!.card.bg;
  const cardBorder = dark ? D.cardBorder : tokens!.card.border;
  const surfBg = dark ? D.surface : `${tokens!.surface.secondary}30`;
  const surfBorder = dark ? D.surfaceBorder : tokens!.surface.border;
  const text1 = dark ? D.text : tokens!.text.primary;
  const textM = dark ? D.textMuted : tokens!.text.quaternary;
  const textS = dark ? D.textSecondary : tokens!.text.secondary;
  const dimColor = dark ? D.textDim : tokens!.text.quaternary;
  const inputBg = dark ? D.inputBg : `${tokens!.text.quaternary}04`;
  const inputBorder = dark ? D.inputBorder : tokens!.surface.border;
  const inputText = dark ? D.text : tokens!.input.text;
  const acBg = dark ? D.accentBg : `${ac}08`;
  const acBorder = dark ? D.accentBorder : `${ac}15`;
  const acGlow = dark ? D.accentGlow : `${ac}15`;

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg: ChatMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur: non authentifie.' }]); return; }
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const cid = isPlatform ? 'platform' : companyId;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/talvex-ai-chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ company_id: cid, messages: history, session_id: sessionId.current, is_test: true }),
      });
      const json = await res.json();
      if (!res.ok) { setMessages(prev => [...prev, { role: 'assistant', content: `Erreur: ${json.error || 'Erreur inconnue'}` }]); return; }
      setMessages(prev => [...prev, { role: 'assistant', content: json.reply || '', toolCalls: json.tool_calls }]);
    } catch (err) { setMessages(prev => [...prev, { role: 'assistant', content: `Erreur: ${String(err)}` }]); }
    finally { setLoading(false); }
  }

  function reset() { setMessages([]); sessionId.current = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: cardBg, border: `1px solid ${cardBorder}`, height: 520 }}>
      <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${ac}40, transparent)` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${surfBorder}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: acBg, border: `1px solid ${acBorder}` }}>
            <MessageCircle className="w-4 h-4" style={{ color: ac }} />
          </div>
          <div>
            <h3 className="text-[13px] font-bold" style={{ color: text1 }}>Tester l'IA support</h3>
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: textM }}>Verifiez les reponses avant activation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTools(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all" style={{ background: showTools ? acBg : `${dimColor}08`, border: `1px solid ${showTools ? acBorder : `${dimColor}15`}`, color: showTools ? ac : textM }}>
            <Wrench className="w-3 h-3" />Debug
          </button>
          <button onClick={reset} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ background: `${dimColor}08`, border: `1px solid ${dimColor}15`, color: textM }} title="Reinitialiser">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5" style={{ background: surfBg }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: acBg, border: `1px solid ${acBorder}` }}>
                <Bot className="w-7 h-7" style={{ color: `${ac}60` }} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: cardBg, border: `1.5px solid ${cardBorder}` }}>
                <Zap className="w-2.5 h-2.5" style={{ color: ac }} />
              </div>
            </div>
            <div className="text-center space-y-1 max-w-xs">
              <p className="text-[13px] font-bold" style={{ color: text1 }}>Testez le Cerveau IA</p>
              <p className="text-[11px] font-medium leading-relaxed" style={{ color: textM }}>Posez une question pour verifier les reponses</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => send(q)} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[11px] font-medium text-left transition-all duration-200 hover:brightness-110" style={{ background: cardBg, border: `1px solid ${cardBorder}`, color: textS }}>
                  <Zap className="w-3 h-3 flex-shrink-0" style={{ color: ac }} />
                  <span className="line-clamp-1">{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <BrainTestChatMessages messages={messages} loading={loading} showTools={showTools} tokens={tokens} accentColor={accentColor} />
        )}
      </div>

      {/* Input */}
      <div className="px-5 py-4" style={{ borderTop: `1px solid ${surfBorder}` }}>
        <div className="flex items-center gap-3">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Posez votre question..." className="flex-1 pl-4 pr-4 py-3 rounded-xl text-[12px] font-medium outline-none transition-all duration-200" style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputText }} onFocus={e => { e.currentTarget.style.borderColor = `${ac}50`; e.currentTarget.style.boxShadow = `0 0 0 3px ${acGlow}`; }} onBlur={e => { e.currentTarget.style.borderColor = inputBorder; e.currentTarget.style.boxShadow = 'none'; }} />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-25" style={{ background: `linear-gradient(145deg, ${ac}, ${acMuted})`, color: '#fff', boxShadow: `0 4px 16px ${acGlow}` }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
