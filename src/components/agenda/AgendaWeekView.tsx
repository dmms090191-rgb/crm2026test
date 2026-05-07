import { Plus } from 'lucide-react';
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

export default function WeekView({ weekStart, todayStr, rdvsByDate, canAdd, onAdd, onDetail, onGoToDay, accentColor, accentRgb, userTimezone = 'Europe/Paris' }: WeekViewProps) {
  const tokens = useThemeTokens();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="overflow-x-auto">
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
  );
}
