import { Plus, ChevronRight } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { RdvProposal } from './agendaTypes';
import { DAYS_SHORT, HOURS } from './agendaTypes';
import { toIso } from './agendaHelpers';
import RdvPill from './AgendaRdvPill';
import { getRdvLocalHour } from '../../lib/timezoneUtils';

interface WeekViewProps {
  weekStart: Date;
  todayStr: string;
  rdvsByDate: Record<string, RdvProposal[]>;
  canAdd: boolean;
  onAdd: (date?: string) => void;
  onDetail: (rdv: RdvProposal) => void;
  onGoToDay: (date: string) => void;
  accentColor: string;
  accentRgb: string;
  userTimezone?: string;
}

export default function WeekView({ weekStart, todayStr, rdvsByDate, canAdd, onAdd, onDetail, onGoToDay, accentColor, accentRgb, userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }: WeekViewProps) {
  const tokens = useThemeTokens();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <>
      {/* Mobile: compact day cards */}
      <div className="md:hidden p-3 space-y-2">
        {days.map((d, i) => {
          const ds = toIso(d);
          const isToday = ds === todayStr;
          const dayRdvs = rdvsByDate[ds] ?? [];
          const count = dayRdvs.length;

          return (
            <button
              key={i}
              onClick={() => onGoToDay(ds)}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all active:scale-[0.98]"
              style={{
                background: isToday ? `rgba(${accentRgb},0.06)` : tokens.surface.secondary,
                border: `1px solid ${isToday ? `rgba(${accentRgb},0.25)` : tokens.surface.borderLight}`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                style={{
                  background: isToday ? accentColor : tokens.surface.secondary,
                  border: isToday ? 'none' : `1px solid ${tokens.surface.borderLight}`,
                }}
              >
                <span className="text-[9px] font-bold uppercase leading-none" style={{ color: isToday ? 'rgba(255,255,255,0.8)' : tokens.text.quaternary }}>
                  {DAYS_SHORT[i]}
                </span>
                <span className="text-sm font-bold leading-tight" style={{ color: isToday ? '#fff' : tokens.text.primary }}>
                  {d.getDate()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: isToday ? accentColor : tokens.text.primary }}>
                  {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: tokens.text.tertiary }}>
                  {count === 0 ? 'Aucun RDV' : `${count} rendez-vous`}
                </p>
              </div>
              {count > 0 && (
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: `rgba(${accentRgb},0.12)`, color: accentColor }}
                >
                  {count}
                </span>
              )}
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
            </button>
          );
        })}
      </div>

      {/* Desktop: full hourly grid */}
      <div className="hidden md:block overflow-x-auto">
        <div style={{ minWidth: '600px' }}>
          <div className="grid grid-cols-8 border-b" style={{ borderColor: tokens.agenda.border }}>
            <div className="py-2 px-3" />
            {days.map((d, i) => {
              const ds = toIso(d);
              const isToday = ds === todayStr;
              return (
                <div
                  key={i}
                  className="py-2 px-2 text-center cursor-pointer transition-all hover:opacity-80"
                  onClick={() => onGoToDay(ds)}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: isToday ? accentColor : tokens.agenda.dayHeaderText }}>
                    {DAYS_SHORT[i]}
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm font-bold transition-all"
                    style={{
                      background: isToday ? accentColor : 'transparent',
                      color: isToday ? tokens.agenda.dayNumberTodayBg : tokens.agenda.dayNumber,
                    }}
                  >
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            {HOURS.map(h => (
              <div key={h} className="grid grid-cols-8" style={{ borderBottom: `1px solid ${tokens.agenda.slotBorder}`, minHeight: '56px' }}>
                <div className="px-3 py-1.5 flex items-start justify-end">
                  <span className="text-[10px] font-medium" style={{ color: tokens.agenda.slotText }}>{String(h).padStart(2,'0')}:00</span>
                </div>
                {days.map((d, i) => {
                  const ds = toIso(d);
                  const isToday = ds === todayStr;
                  const slotRdvs = (rdvsByDate[ds] ?? []).filter(r => {
                    return getRdvLocalHour(r, userTimezone) === h;
                  });
                  return (
                    <div
                      key={i}
                      className="relative p-0.5 group cursor-pointer transition-all"
                      style={{ borderLeft: `1px solid ${tokens.agenda.slotBorder}`, background: isToday ? `rgba(${accentRgb},0.02)` : 'transparent' }}
                      onClick={() => { if (canAdd) onAdd(ds); }}
                    >
                      {canAdd && slotRdvs.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-3 h-3" style={{ color: `rgba(${accentRgb},0.4)` }} />
                        </div>
                      )}
                      <div className="space-y-0.5">
                        {slotRdvs.map(rdv => <RdvPill key={rdv.id} rdv={rdv} onDetail={onDetail} userTimezone={userTimezone} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
