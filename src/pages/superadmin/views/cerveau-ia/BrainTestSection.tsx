import { useState, useRef, useEffect } from 'react';
import { FlaskConical, Send, RotateCcw, Wrench } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { name: string; input: unknown; output: unknown }[];
}

interface Props {
  companyId: string;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
}

export default function BrainTestSection({ companyId, tokens: t }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: ChatMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur: non authentifie.' }]); return; }

      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/talvex-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ company_id: companyId, messages: history, session_id: sessionId.current, is_test: true }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Erreur: ${json.error || 'Erreur inconnue'}` }]);
        return;
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: json.reply || '',
        toolCalls: json.tool_calls,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Erreur reseau: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMessages([]);
    sessionId.current = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', height: 480 }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${t.card.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
            <FlaskConical className="w-4 h-4" style={{ color: t.accent.text }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Tester l'IA</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTools(v => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
            style={{ background: showTools ? t.accent.bg : t.surface.secondary, border: `1px solid ${showTools ? t.accent.border : t.surface.border}`, color: showTools ? t.accent.text : t.text.secondary }}
          >
            <Wrench className="w-3 h-3" /> Tools
          </button>
          <button onClick={reset} className="p-1.5 rounded-lg transition-all hover:scale-105" style={{ color: t.text.tertiary }} title="Reinitialiser">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color: t.input.placeholder }}>Envoyez un message pour tester le comportement de l'IA.</p>
        )}
        {messages.map((msg, idx) => (
          <div key={idx}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[80%] px-3 py-2 rounded-2xl text-xs whitespace-pre-wrap"
                style={msg.role === 'user'
                  ? { background: t.accent.text, color: '#fff', borderBottomRightRadius: 4 }
                  : { background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary, borderBottomLeftRadius: 4 }
                }
              >
                {msg.content}
              </div>
            </div>
            {showTools && msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="mt-1 ml-2 space-y-1">
                {msg.toolCalls.map((tc, i) => (
                  <details key={i} className="rounded-lg overflow-hidden text-[10px]" style={{ background: 'rgba(245,158,11,0.05)', border: `1px solid rgba(245,158,11,0.15)` }}>
                    <summary className="cursor-pointer px-2 py-1 font-semibold" style={{ color: '#d97706' }}>
                      <Wrench className="w-3 h-3 inline mr-1" />{tc.name}
                    </summary>
                    <div className="px-2 py-1.5 space-y-1" style={{ color: t.text.tertiary }}>
                      <p className="font-semibold">Input:</p>
                      <pre className="overflow-x-auto">{JSON.stringify(tc.input, null, 2)}</pre>
                      <p className="font-semibold">Output:</p>
                      <pre className="overflow-x-auto">{JSON.stringify(tc.output, null, 2)}</pre>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: t.text.tertiary, animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: t.text.tertiary, animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: t.text.tertiary, animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3" style={{ borderTop: `1px solid ${t.card.border}` }}>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Tapez un message..."
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-40"
            style={{ background: t.accent.text, color: '#fff' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
