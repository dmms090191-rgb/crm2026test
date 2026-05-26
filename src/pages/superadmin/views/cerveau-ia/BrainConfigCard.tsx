import { CheckCircle2, ChevronRight, Circle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { D } from './brainTheme';

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  summary?: string;
  filled: boolean;
  onConfigure: () => void;
  tokens?: Record<string, any>;
  accentColor?: string;
}

export default function BrainConfigCard({ icon, title, description, summary, filled, onConfigure, tokens, accentColor }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const dark = !tokens;
  const ac = accentColor ?? D.accent;

  const cardBg = dark ? D.card : tokens!.card.bg;
  const cardBorder = dark ? D.cardBorder : tokens!.card.border;
  const acBg = dark ? D.accentBg : `${ac}08`;
  const acBorder = dark ? D.accentBorder : `${ac}15`;
  const text1 = dark ? D.text : tokens!.text.primary;
  const textM = dark ? D.textMuted : tokens!.text.quaternary;
  const textS = dark ? D.textSecondary : tokens!.text.secondary;
  const dimColor = dark ? D.textDim : tokens!.text.quaternary;
  const surfBg = dark ? D.surface : tokens!.surface.secondary;
  const surfBorder = dark ? D.surfaceBorder : tokens!.surface.border;
  const green = dark ? D.green : '#22c55e';
  const greenBg = dark ? D.greenBg : 'rgba(34,197,94,0.06)';
  const greenBorder = dark ? D.greenBorder : 'rgba(34,197,94,0.1)';
  const hoverGlow = dark ? D.accentGlow : `${ac}08`;

  return (
    <button
      ref={ref}
      onClick={onConfigure}
      className="w-full text-left rounded-2xl transition-all duration-300 relative overflow-hidden group"
      style={{ background: cardBg, border: `1px solid ${filled ? acBorder : cardBorder}` }}
      onMouseEnter={() => {
        const el = ref.current;
        if (!el) return;
        el.style.transform = 'translateY(-2px)';
        el.style.borderColor = `${ac}40`;
        el.style.boxShadow = `0 8px 32px ${hoverGlow}`;
      }}
      onMouseLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.transform = 'translateY(0)';
        el.style.borderColor = filled ? acBorder : cardBorder;
        el.style.boxShadow = 'none';
      }}
    >
      {filled && <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${ac}, ${ac}60, transparent)` }} />}

      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: filled ? acBg : `${dimColor}10`, border: `1px solid ${filled ? acBorder : `${dimColor}15`}` }}>
            <span style={{ color: filled ? ac : textM }}>{icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-bold mb-0.5" style={{ color: text1 }}>{title}</h3>
            <p className="text-[11px] font-medium leading-relaxed" style={{ color: textM }}>{description}</p>

            {summary && (
              <div className="mt-2.5 px-3 py-2 rounded-lg" style={{ background: surfBg, border: `1px solid ${surfBorder}` }}>
                <p className="text-[11px] font-medium line-clamp-2" style={{ color: textS }}>{summary}</p>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              {filled ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: greenBg, color: green, border: `1px solid ${greenBorder}` }}>
                  <CheckCircle2 className="w-3 h-3" /> Complete
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: `${dimColor}08`, color: textM, border: `1px solid ${dimColor}15` }}>
                  <Circle className="w-3 h-3" /> A configurer
                </span>
              )}
              <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:translate-x-1" style={{ background: acBg }}>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: ac }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
