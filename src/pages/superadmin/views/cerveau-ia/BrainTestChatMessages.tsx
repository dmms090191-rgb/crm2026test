import { Bot, User, Wrench } from 'lucide-react';
import { D } from './brainTheme';
import type { ChatMsg } from './BrainTestChat';

interface Props {
  messages: ChatMsg[];
  loading: boolean;
  showTools: boolean;
  tokens?: Record<string, any>;
  accentColor?: string;
}

export default function BrainTestChatMessages({ messages, loading, showTools, tokens, accentColor }: Props) {
  const dark = !tokens;
  const ac = accentColor ?? D.accent;
  const acMuted = dark ? D.accentMuted : ac;
  const acBg = dark ? D.accentBg : `${ac}08`;
  const acBorder = dark ? D.accentBorder : `${ac}15`;
  const acGlow = dark ? D.accentGlow : `${ac}15`;
  const cardBg = dark ? D.card : tokens!.card.bg;
  const cardBorder = dark ? D.cardBorder : tokens!.card.border;
  const surfBg = dark ? D.surface : tokens!.surface.secondary;
  const surfBorder = dark ? D.surfaceBorder : tokens!.surface.border;
  const text1 = dark ? D.text : tokens!.text.primary;
  const textM = dark ? D.textMuted : tokens!.text.tertiary;

  return (
    <div className="space-y-4">
      {messages.map((msg, idx) => (
        <div key={idx}>
          <div className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: acBg, border: `1px solid ${acBorder}` }}>
                <Bot className="w-3.5 h-3.5" style={{ color: ac }} />
              </div>
            )}
            <div
              className="max-w-[78%] px-4 py-3 text-[12px] leading-relaxed whitespace-pre-wrap font-medium"
              style={msg.role === 'user'
                ? { background: `linear-gradient(145deg, ${ac}, ${acMuted})`, color: '#fff', borderRadius: '18px 18px 6px 18px', boxShadow: `0 2px 12px ${acGlow}` }
                : { background: cardBg, border: `1px solid ${cardBorder}`, color: text1, borderRadius: '18px 18px 18px 6px' }
              }
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: acBg, border: `1px solid ${acBorder}` }}>
                <User className="w-3.5 h-3.5" style={{ color: ac }} />
              </div>
            )}
          </div>

          {showTools && msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="mt-2 ml-10 space-y-1.5">
              {msg.toolCalls.map((tc, i) => (
                <details key={i} className="rounded-lg overflow-hidden text-[10px]" style={{ background: surfBg, border: `1px solid ${surfBorder}` }}>
                  <summary className="cursor-pointer px-3 py-2 font-bold" style={{ color: ac }}>
                    <Wrench className="w-3 h-3 inline mr-1.5" />{tc.name}
                  </summary>
                  <div className="px-3 py-2 space-y-1.5 font-mono" style={{ color: textM, borderTop: `1px solid ${surfBorder}` }}>
                    <p className="font-bold font-sans">Input:</p>
                    <pre className="overflow-x-auto text-[9px]">{JSON.stringify(tc.input, null, 2)}</pre>
                    <p className="font-bold font-sans">Output:</p>
                    <pre className="overflow-x-auto text-[9px]">{JSON.stringify(tc.output, null, 2)}</pre>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      ))}

      {loading && (
        <div className="flex gap-3 justify-start">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: acBg, border: `1px solid ${acBorder}` }}>
            <Bot className="w-3.5 h-3.5" style={{ color: ac }} />
          </div>
          <div className="px-5 py-3 rounded-2xl" style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderBottomLeftRadius: 6 }}>
            <div className="flex gap-1.5">
              {[0, 150, 300].map(delay => (
                <span key={delay} className="w-2 h-2 rounded-full animate-bounce" style={{ background: `${ac}60`, animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
