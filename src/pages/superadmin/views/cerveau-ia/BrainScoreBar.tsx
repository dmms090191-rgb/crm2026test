import { Gauge, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { D } from './brainTheme';

interface ScoreSection { label: string; filled: boolean; }

interface Props {
  sections: ScoreSection[];
  tokens?: Record<string, any>;
  accentColor?: string;
}

export default function BrainScoreBar({ sections, tokens, accentColor }: Props) {
  const useDark = !tokens;
  const filled = sections.filter(s => s.filled).length;
  const total = sections.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const missing = sections.filter(s => !s.filled);

  const green = useDark ? D.green : '#22c55e';
  const orange = useDark ? D.orange : '#f97316';
  const ac = accentColor ?? D.accent;
  const pctColor = pct >= 80 ? green : pct >= 50 ? ac : orange;

  const cardBg = useDark ? D.card : tokens!.card.bg;
  const cardBorder = useDark ? D.cardBorder : tokens!.card.border;
  const textPrimary = useDark ? D.text : tokens!.text.primary;
  const textMuted = useDark ? D.textMuted : tokens!.text.quaternary;
  const textSecondary = useDark ? D.textSecondary : tokens!.text.secondary;
  const borderColor = useDark ? D.surfaceBorder : tokens!.surface.border;
  const dimColor = useDark ? D.textDim : `${tokens!.text.quaternary}25`;
  const acBg = useDark ? `${D.accent}08` : `${ac}05`;
  const acBorder = useDark ? D.accentBorder : `${ac}10`;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
      <div className="p-6 md:p-7">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${pctColor}12`, border: `1px solid ${pctColor}20` }}>
              <Gauge className="w-5 h-5" style={{ color: pctColor }} />
            </div>
            <div>
              <h2 className="text-[13px] font-bold" style={{ color: textPrimary }}>Score de configuration</h2>
              <p className="text-[11px] mt-0.5 font-medium" style={{ color: textMuted }}>{filled} sur {total} sections</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tabular-nums leading-none" style={{ color: pctColor }}>{pct}</span>
            <span className="text-sm font-bold" style={{ color: `${pctColor}80` }}>%</span>
          </div>
        </div>

        <div className="w-full h-2.5 rounded-full mb-5" style={{ background: borderColor }}>
          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.max(pct, 3)}%`, background: `linear-gradient(90deg, ${pctColor}cc, ${pctColor})`, boxShadow: `0 0 12px ${pctColor}30` }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sections.map(s => (
            <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: s.filled ? acBg : `${dimColor}08`, border: `1px solid ${s.filled ? acBorder : `${dimColor}15`}` }}>
              {s.filled
                ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: green }} />
                : <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: dimColor }} />
              }
              <span className="text-[10px] font-semibold" style={{ color: s.filled ? textSecondary : textMuted }}>{s.label}</span>
            </div>
          ))}
        </div>

        {missing.length > 0 && (
          <div className="mt-4 pt-4 flex items-center gap-2.5" style={{ borderTop: `1px solid ${borderColor}` }}>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: orange }} />
            <p className="text-[11px] font-medium" style={{ color: textMuted }}>
              Prochaine etape : <span className="font-bold" style={{ color: textSecondary }}>{missing[0].label}</span>
              {missing.length > 1 && <span> et {missing.length - 1} autre{missing.length > 2 ? 's' : ''}</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
