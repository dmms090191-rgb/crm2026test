import { Clock } from 'lucide-react';
import type { AiCompanyBrain, WeekSchedule, DaySchedule } from './brainTypes';
import { DAYS_OF_WEEK } from './brainTypes';

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
  embedded?: boolean;
}

export default function BrainScheduleSection({ brain, onChange, tokens: t, embedded }: Props) {
  const hours = (brain.opening_hours ?? {}) as WeekSchedule;

  function updateDay(dayKey: string, field: keyof DaySchedule, value: string | boolean) {
    const next = { ...hours, [dayKey]: { ...hours[dayKey], [field]: value } };
    onChange({ opening_hours: next });
  }

  const content = (
    <div className="space-y-2">
        {DAYS_OF_WEEK.map(({ key, label }) => {
          const day = hours[key] ?? { open: '09:00', close: '18:00', closed: false };
          return (
            <div key={key} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
              <span className="text-xs font-semibold w-20 flex-shrink-0" style={{ color: t.text.primary }}>{label}</span>
              <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={!day.closed}
                  onChange={e => updateDay(key, 'closed', !e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-current"
                  style={{ accentColor: t.accent.text }}
                />
                <span className="text-[10px] font-medium" style={{ color: day.closed ? t.text.tertiary : t.success.text }}>
                  {day.closed ? 'Ferme' : 'Ouvert'}
                </span>
              </label>
              {!day.closed && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <input
                    type="time"
                    value={day.open}
                    onChange={e => updateDay(key, 'open', e.target.value)}
                    className="px-2 py-1 rounded-lg text-xs outline-none"
                    style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
                  />
                  <span className="text-[10px]" style={{ color: t.text.tertiary }}>a</span>
                  <input
                    type="time"
                    value={day.close}
                    onChange={e => updateDay(key, 'close', e.target.value)}
                    className="px-2 py-1 rounded-lg text-xs outline-none"
                    style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
                  />
                </div>
              )}
            </div>
          );
        })}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
          <Clock className="w-4 h-4" style={{ color: t.accent.text }} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Horaires d'ouverture</h3>
      </div>
      {content}
    </div>
  );
}
