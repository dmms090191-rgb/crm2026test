import { Plus, X } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { RdvProposal } from './agendaTypes';
import { STATUS_CFG, DAYS_SHORT } from './agendaTypes';
import { getDaysInMonth, getFirstDayOfMonth, formatDateFull, isRdvPast } from './agendaHelpers';
import RdvPill from './AgendaRdvPill';
import { getRdvLocalTime } from '../../lib/timezoneUtils';

interface MonthViewProps {
  year: number;
  month: number;
  todayStr: string;
  selectedDate: string | null;
  onSelectDate: (d: string | null) => void;
  rdvsByDate: Record<string, RdvProposal[]>;
  canAdd: boolean;
  onAdd: (date?: string) => void;
  onDetail: (rdv: RdvProposal) => void;
  accentColor: string;
  accentRgb: string;
  userTimezone?: string;
}

export default function MonthView({ year, month, todayStr, selectedDate, onSelectDate, rdvsByDate, canAdd, onAdd, onDetail, accentColor, accentRgb, userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }: MonthViewProps) {
  const tokens = useThemeTokens();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  return (
    <div className="p-2.5 md:p-4">
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[9px] md:text-[10px] font-bold tracking-wider uppercase py-1.5 md:py-2" style={{ color: `rgba(${accentRgb},0.5)` }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px" style={{ background: tokens.agenda.slotBorder, borderRadius: '12px', overflow: 'hidden' }}>
        {Array.from({ length: totalCells }).map((_, idx) => {
          const cellDay = idx - firstDay + 1;
          const isCurrentMonth = cellDay >= 1 && cellDay <= daysInMonth;
          if (!isCurrentMonth) {
            return <div key={idx} className="min-h-[44px] md:min-h-[80px] p-1" style={{ background: tokens.surface.secondary }} />;
          }
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(cellDay).padStart(2,'0')}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayRdvs = rdvsByDate[dateStr] ?? [];

          return (
            <div
              key={idx}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className="min-h-[44px] md:min-h-[80px] p-1 md:p-1.5 cursor-pointer transition-all group"
              style={{
                background: isSelected ? `rgba(${accentRgb},0.08)` : isToday ? `rgba(${accentRgb},0.04)` : tokens.agenda.bg,
                outline: isSelected ? `1.5px solid rgba(${accentRgb},0.35)` : isToday ? `1.5px solid rgba(${accentRgb},0.2)` : 'none',
                outlineOffset: '-1px',
              }}
            >
              <div className="flex items-center justify-between mb-0.5 md:mb-1">
                <span
                  className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[11px] md:text-xs font-bold transition-all"
                  style={{
                    background: isToday ? accentColor : 'transparent',
                    color: isToday ? tokens.agenda.dayNumberTodayBg : isSelected ? accentColor : tokens.agenda.dayNumber,
                  }}
                >
                  {cellDay}
                </span>
                {canAdd && (
                  <button
                    onClick={e => { e.stopPropagation(); onAdd(dateStr); }}
                    className="hidden md:flex opacity-0 group-hover:opacity-100 w-5 h-5 rounded items-center justify-center transition-all"
                    style={{ background: `rgba(${accentRgb},0.15)`, color: accentColor }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
              {/* Mobile: dots */}
              {dayRdvs.length > 0 && (
                <div className="md:hidden flex items-center justify-center gap-0.5 mt-0.5">
                  {dayRdvs.length <= 3 ? (
                    dayRdvs.map(rdv => {
                      const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
                      return <span key={rdv.id} className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />;
                    })
                  ) : (
                    <>
                      {dayRdvs.slice(0, 2).map(rdv => {
                        const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
                        return <span key={rdv.id} className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />;
                      })}
                      <span className="text-[8px] font-bold" style={{ color: tokens.text.quaternary }}>+{dayRdvs.length - 2}</span>
                    </>
                  )}
                </div>
              )}
              {/* Desktop: pills */}
              <div className="hidden md:block space-y-0.5">
                {dayRdvs.slice(0, 3).map(rdv => <RdvPill key={rdv.id} rdv={rdv} compact onDetail={onDetail} userTimezone={userTimezone} />)}
                {dayRdvs.length > 3 && (
                  <span className="text-[9px] px-1" style={{ color: tokens.text.quaternary }}>+{dayRdvs.length - 3} autres</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 rounded-xl overflow-hidden" style={{ border: `1px solid rgba(${accentRgb},0.2)`, background: `rgba(${accentRgb},0.03)` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid rgba(${accentRgb},0.12)` }}>
            <p className="text-xs font-semibold capitalize" style={{ color: tokens.text.primary }}>{formatDateFull(selectedDate)}</p>
            <div className="flex items-center gap-2">
              {canAdd && (
                <button onClick={() => onAdd(selectedDate)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-105" style={{ background: `rgba(${accentRgb},0.1)`, border: `1px solid rgba(${accentRgb},0.2)`, color: accentColor }}>
                  <Plus className="w-3 h-3" />Ajouter
                </button>
              )}
              <button onClick={() => onSelectDate(null)} className="transition-colors" style={{ color: tokens.text.quaternary }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="px-4 py-3">
            {(rdvsByDate[selectedDate] ?? []).length === 0 ? (
              <p className="text-xs" style={{ color: tokens.text.quaternary }}>Aucun rendez-vous ce jour</p>
            ) : (
              <div className="space-y-2">
                {(rdvsByDate[selectedDate] ?? []).map(rdv => {
                  const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
                  const past = rdv.status === 'confirmed' && isRdvPast(rdv);
                  const treated = !!rdv.treated_at;
                  return (
                    <button
                      key={rdv.id}
                      onClick={() => onDetail(rdv)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:brightness-110"
                      style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.borderLight}` }}
                    >
                      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate" style={{ color: tokens.text.primary }}>{rdv.lead_name}</span>
                          <span className="text-[10px]" style={{ color: tokens.text.tertiary }}>{getRdvLocalTime(rdv, userTimezone)}</span>
                        </div>
                        {rdv.vendor_name && <p className="text-[10px]" style={{ color: tokens.text.secondary }}>{rdv.vendor_name}</p>}
                        {rdv.motif && <p className="text-[10px] truncate" style={{ color: tokens.text.tertiary }}>{rdv.motif}</p>}
                        {rdv.lead_phone && <p className="text-xs" style={{ color: tokens.text.quaternary }}>{rdv.lead_phone}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                        {past && !treated && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                            Non traité
                          </span>
                        )}
                        {treated && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.18)' }}>
                            Traité
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
