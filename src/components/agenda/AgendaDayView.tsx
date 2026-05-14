import { Plus, X, Calendar, Clock, Phone, Mail } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { RdvProposal } from './agendaTypes';
import { STATUS_CFG, HOURS } from './agendaTypes';
import { formatDateFull, isRdvPast } from './agendaHelpers';
import { getRdvLocalHour, getRdvLocalTime } from '../../lib/timezoneUtils';

interface DayViewProps {
  dayDate: string;
  todayStr: string;
  rdvsByDate: Record<string, RdvProposal[]>;
  canAdd: boolean;
  onAdd: (date?: string) => void;
  onDetail: (rdv: RdvProposal) => void;
  accentColor: string;
  accentRgb: string;
  userTimezone?: string;
}

export default function DayView({ dayDate, todayStr, rdvsByDate, canAdd, onAdd, onDetail, accentColor, accentRgb, userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }: DayViewProps) {
  const tokens = useThemeTokens();
  const dayRdvs = rdvsByDate[dayDate] ?? [];
  const isToday = dayDate === todayStr;

  const sortedRdvs = [...dayRdvs].sort((a, b) =>
    getRdvLocalTime(a, userTimezone).localeCompare(getRdvLocalTime(b, userTimezone))
  );

  return (
    <div className="p-3 md:p-4">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div>
          <h3 className="font-semibold text-sm capitalize" style={{ color: tokens.text.primary }}>{formatDateFull(dayDate)}</h3>
          {isToday && <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>Aujourd'hui</span>}
        </div>
        {canAdd && (
          <button onClick={() => onAdd(dayDate)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-105" style={{ background: `rgba(${accentRgb},0.1)`, border: `1px solid rgba(${accentRgb},0.2)`, color: accentColor }}>
            <Plus className="w-3 h-3" />Ajouter
          </button>
        )}
      </div>

      {/* Mobile: compact card list */}
      <div className="md:hidden">
        {sortedRdvs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.borderLight}` }}>
            <Calendar className="w-8 h-8 mb-2" style={{ color: tokens.text.quaternary }} />
            <p className="text-sm font-medium" style={{ color: tokens.text.tertiary }}>Aucun rendez-vous aujourd'hui</p>
            {canAdd && (
              <button onClick={() => onAdd(dayDate)} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: `rgba(${accentRgb},0.1)`, border: `1px solid rgba(${accentRgb},0.2)`, color: accentColor }}>
                <Plus className="w-3.5 h-3.5" />Ajouter un RDV
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedRdvs.map(rdv => {
              const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
              const isPast = rdv.status === 'confirmed' && isRdvPast(rdv);
              const isTreated = !!rdv.treated_at;
              const showUntreated = isPast && !isTreated;

              return (
                <button
                  key={rdv.id}
                  onClick={() => onDetail(rdv)}
                  className="w-full text-left px-3.5 py-3 rounded-xl transition-all active:scale-[0.98] relative overflow-hidden"
                  style={{
                    background: isTreated ? 'rgba(148,163,184,0.06)' : cfg.bg,
                    border: `1px solid ${isTreated ? 'rgba(148,163,184,0.2)' : cfg.border}`,
                  }}
                >
                  {showUntreated && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <X className="w-12 h-12 text-red-500 opacity-[0.08]" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2 relative">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3 h-3 flex-shrink-0" style={{ color: isTreated ? '#64748b' : cfg.color }} />
                        <span className="text-xs font-bold" style={{ color: isTreated ? '#64748b' : cfg.color }}>{getRdvLocalTime(rdv, userTimezone)}</span>
                      </div>
                      <p className="text-sm font-semibold truncate" style={{ color: tokens.text.primary }}>{rdv.lead_name}</p>
                      {rdv.vendor_name && <p className="text-[11px] mt-0.5" style={{ color: tokens.text.secondary }}>{rdv.vendor_name}</p>}
                      {rdv.motif && <p className="text-[11px] mt-0.5 truncate" style={{ color: tokens.text.tertiary }}>{rdv.motif}</p>}
                      <div className="flex items-center gap-3 mt-1.5">
                        {rdv.lead_phone && (
                          <span className="flex items-center gap-1 text-[10px]" style={{ color: tokens.text.quaternary }}>
                            <Phone className="w-2.5 h-2.5" />{rdv.lead_phone}
                          </span>
                        )}
                        {rdv.lead_email && !rdv.lead_phone && (
                          <span className="flex items-center gap-1 text-[10px]" style={{ color: tokens.text.quaternary }}>
                            <Mail className="w-2.5 h-2.5" />{rdv.lead_email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                      {showUntreated && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                          Non traite
                        </span>
                      )}
                      {isTreated && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.18)' }}>
                          Traite
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: full hourly grid */}
      <div className="hidden md:block">
        {HOURS.map(h => {
          const slotRdvs = dayRdvs.filter(r => getRdvLocalHour(r, userTimezone) === h);
          return (
            <div key={h} className="flex gap-3 group" style={{ borderBottom: `1px solid ${tokens.agenda.slotBorder}`, minHeight: '52px' }}>
              <div className="w-14 flex-shrink-0 flex items-start pt-2 justify-end">
                <span className="text-[10px] font-medium" style={{ color: tokens.agenda.slotText }}>{String(h).padStart(2,'0')}:00</span>
              </div>
              <div
                className="flex-1 relative py-1 px-1 cursor-pointer rounded-lg transition-all"
                style={{ borderLeft: `2px solid ${tokens.agenda.slotBorder}` }}
                onClick={() => { if (canAdd && slotRdvs.length === 0) onAdd(dayDate); }}
              >
                {canAdd && slotRdvs.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px]" style={{ color: `rgba(${accentRgb},0.4)` }}>+ Ajouter un RDV</span>
                  </div>
                )}
                <div className="space-y-1">
                  {slotRdvs.map(rdv => {
                    const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
                    const isPast = rdv.status === 'confirmed' && isRdvPast(rdv);
                    const isTreated = !!rdv.treated_at;
                    const showUntreated = isPast && !isTreated;

                    return (
                      <button
                        key={rdv.id}
                        onClick={e => { e.stopPropagation(); onDetail(rdv); }}
                        className="w-full text-left px-3 py-2 rounded-xl transition-all hover:brightness-110 relative overflow-hidden"
                        style={{
                          background: isTreated ? 'rgba(148,163,184,0.06)' : cfg.bg,
                          border: `1px solid ${isTreated ? 'rgba(148,163,184,0.2)' : cfg.border}`,
                        }}
                      >
                        {showUntreated && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <X className="w-10 h-10 text-red-500 opacity-[0.12]" />
                          </div>
                        )}
                        <div className="flex items-center gap-2 relative">
                          <span className="text-xs font-bold" style={{ color: isTreated ? '#64748b' : cfg.color }}>{getRdvLocalTime(rdv, userTimezone)}</span>
                          <span className="text-xs font-semibold" style={{ color: tokens.text.primary }}>{rdv.lead_name}</span>
                          {rdv.vendor_name && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: tokens.surface.secondary, color: tokens.text.tertiary }}>{rdv.vendor_name}</span>}
                          {showUntreated && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold ml-auto" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                              Non traite
                            </span>
                          )}
                          {isTreated && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold ml-auto" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.18)' }}>
                              Traite
                            </span>
                          )}
                        </div>
                        {rdv.motif && <p className="text-[10px] mt-0.5 font-medium relative" style={{ color: tokens.text.secondary }}>{rdv.motif}</p>}
                        {rdv.lead_phone && <p className="text-[10px] mt-0.5 relative" style={{ color: isTreated ? '#94a3b8' : cfg.color, opacity: 0.7 }}>{rdv.lead_phone}</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
