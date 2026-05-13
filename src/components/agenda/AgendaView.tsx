import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Clock,
  Calendar, CalendarDays, LayoutGrid, List,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { RdvProposal, ViewMode } from './agendaTypes';
import { STATUS_CFG, MONTHS } from './agendaTypes';
import { toIso, getMondayOf, getRdvTimestamp } from './agendaHelpers';
import AgendaHeader from './AgendaHeader';
import AddRdvModal from './AgendaAddModal';
import RdvDetailModal from './AgendaDetailModal';
import MonthView from './AgendaMonthView';
import WeekView from './AgendaWeekView';
import DayView from './AgendaDayView';
import { getRdvLocalDate, getRdvLocalTime } from '../../lib/timezoneUtils';

export type { RdvProposal } from './agendaTypes';
export { STATUS_CFG } from './agendaTypes';

interface AgendaViewProps {
  rdvs: RdvProposal[];
  onReload: () => void;
  canAdd?: boolean;
  canDelete?: boolean;
  canTreat?: boolean;
  accentColor?: string;
  accentRgb?: string;
  userTimezone?: string;
  clientTimezone?: string;
  title?: string;
}

export default function AgendaView({ rdvs, onReload, canAdd = true, canDelete, canTreat = false, accentColor = '#22d3ee', accentRgb = '34,211,238', userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', clientTimezone, title = 'Agenda' }: AgendaViewProps) {
  const tokens = useThemeTokens();

  const today = new Date();
  const todayStr = toIso(today);

  const [view, setView] = useState<ViewMode>('day');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(today));
  const [dayDate, setDayDate] = useState<string>(todayStr);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addDefault, setAddDefault] = useState<string | undefined>();
  const [detailRdv, setDetailRdv] = useState<RdvProposal | null>(null);
  const [, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const nextUntreated = rdvs
      .filter(r => r.status === 'confirmed' && !r.treated_at)
      .map(r => getRdvTimestamp(r))
      .filter(ts => ts > now)
      .sort((a, b) => a - b)[0];

    if (timerRef.current) clearTimeout(timerRef.current);
    if (nextUntreated) {
      const delay = nextUntreated - now + 500;
      timerRef.current = setTimeout(() => setTick(t => t + 1), delay);
    }

    intervalRef.current = setInterval(() => setTick(t => t + 1), 60_000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rdvs]);

  const rdvsByDate: Record<string, RdvProposal[]> = {};
  rdvs.forEach(r => {
    const localDate = getRdvLocalDate(r, userTimezone);
    if (!rdvsByDate[localDate]) rdvsByDate[localDate] = [];
    rdvsByDate[localDate].push(r);
  });

  const openAdd = useCallback((date?: string) => {
    setAddDefault(date);
    setShowAdd(true);
  }, []);

  async function handleDelete(id: string) {
    await supabase.from('rdv_proposals').delete().eq('id', id);
    onReload();
  }

  async function handleStatusChange(id: string, status: string) {
    await supabase.from('rdv_proposals').update({ status }).eq('id', id);
    onReload();
  }

  async function handleTreat(id: string, treated: boolean) {
    await supabase.from('rdv_proposals').update({ treated_at: treated ? new Date().toISOString() : null }).eq('id', id);
    setDetailRdv(prev => prev ? { ...prev, treated_at: treated ? new Date().toISOString() : null } : null);
    onReload();
  }

  function navPrev() {
    if (view === 'month') {
      if (month === 0) { setYear(y => y - 1); setMonth(11); }
      else setMonth(m => m - 1);
    } else if (view === 'week') {
      setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
    } else {
      const d = new Date(dayDate + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      setDayDate(toIso(d));
    }
  }

  function navNext() {
    if (view === 'month') {
      if (month === 11) { setYear(y => y + 1); setMonth(0); }
      else setMonth(m => m + 1);
    } else if (view === 'week') {
      setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
    } else {
      const d = new Date(dayDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      setDayDate(toIso(d));
    }
  }

  function navToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setWeekStart(getMondayOf(t));
    setDayDate(todayStr);
    setSelectedDate(todayStr);
  }

  function navTitle() {
    if (view === 'month') return `${MONTHS[month]} ${year}`;
    if (view === 'week') {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0,3)} — ${end.getDate()} ${MONTHS[end.getMonth()].slice(0,3)} ${end.getFullYear()}`;
    }
    return new Date(dayDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  const upcomingRdvs = rdvs
    .filter(r => getRdvLocalDate(r, userTimezone) >= todayStr && r.status !== 'cancelled' && r.status !== 'done')
    .sort((a, b) => {
      const da = getRdvLocalDate(a, userTimezone);
      const db = getRdvLocalDate(b, userTimezone);
      if (da !== db) return da.localeCompare(db);
      return getRdvLocalTime(a, userTimezone).localeCompare(getRdvLocalTime(b, userTimezone));
    })
    .slice(0, 8);

  const cardStyle: React.CSSProperties = { background: tokens.card.bg, border: `1px solid ${tokens.card.border}` };

  return (
    <div className="space-y-5">
      <AgendaHeader title={title} totalCount={rdvs.length} canAdd={canAdd} accentColor={accentColor} accentRgb={accentRgb} onAdd={() => openAdd(todayStr)} tokens={tokens} />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className="xl:col-span-3 rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="flex items-center justify-between px-3 md:px-5 py-3 md:py-3.5 gap-2" style={{ borderBottom: `1px solid ${tokens.surface.borderLight}` }}>
            <div className="flex items-center gap-1">
              <button onClick={navPrev} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ background: tokens.agenda.navBtnBg, color: tokens.agenda.navBtnText }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={navToday} className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all" style={{ background: `rgba(${accentRgb},0.08)`, color: accentColor, border: `1px solid rgba(${accentRgb},0.15)` }}>
                Aujourd'hui
              </button>
              <button onClick={navNext} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ background: tokens.agenda.navBtnBg, color: tokens.agenda.navBtnText }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h3 className="hidden md:block text-sm font-semibold capitalize" style={{ color: tokens.text.primary }}>{navTitle()}</h3>
            <h3 className="md:hidden text-[11px] font-semibold capitalize flex-1 text-center" style={{ color: tokens.text.primary }}>{navTitle()}</h3>
            {/* Desktop: button group */}
            <div className="hidden md:flex items-center gap-1 p-0.5 rounded-xl" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}>
              {([
                { v: 'day',   icon: List, label: 'Jour' },
                { v: 'week',  icon: CalendarDays, label: 'Semaine' },
                { v: 'month', icon: LayoutGrid, label: 'Mois' },
              ] as const).map(({ v, icon: Icon, label }) => (
                <button key={v} onClick={() => setView(v)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                  style={view === v
                    ? { background: `rgba(${accentRgb},0.15)`, color: accentColor, border: `1px solid rgba(${accentRgb},0.25)` }
                    : { color: tokens.agenda.dayHeaderText, border: '1px solid transparent' }
                  }>
                  <Icon className="w-3 h-3" />{label}
                </button>
              ))}
            </div>
            {/* Mobile: select dropdown */}
            <select
              value={view}
              onChange={e => setView(e.target.value as ViewMode)}
              className="md:hidden px-2 py-1.5 rounded-lg text-xs font-semibold appearance-none cursor-pointer"
              style={{ background: `rgba(${accentRgb},0.08)`, color: accentColor, border: `1px solid rgba(${accentRgb},0.2)` }}
            >
              <option value="day">Jour</option>
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
            </select>
          </div>

          {view === 'month' && (
            <MonthView year={year} month={month} todayStr={todayStr} selectedDate={selectedDate}
              onSelectDate={setSelectedDate} rdvsByDate={rdvsByDate} canAdd={canAdd}
              onAdd={openAdd} onDetail={setDetailRdv} accentColor={accentColor} accentRgb={accentRgb} userTimezone={userTimezone} />
          )}
          {view === 'week' && (
            <WeekView weekStart={weekStart} todayStr={todayStr} rdvsByDate={rdvsByDate} canAdd={canAdd}
              onAdd={openAdd} onDetail={setDetailRdv} onGoToDay={ds => { setDayDate(ds); setView('day'); }}
              accentColor={accentColor} accentRgb={accentRgb} userTimezone={userTimezone} />
          )}
          {view === 'day' && (
            <DayView dayDate={dayDate} todayStr={todayStr} rdvsByDate={rdvsByDate} canAdd={canAdd}
              onAdd={openAdd} onDetail={setDetailRdv} accentColor={accentColor} accentRgb={accentRgb} userTimezone={userTimezone} />
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4" style={{ color: accentColor }} />
              <h3 className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Prochains RDV</h3>
            </div>
            {upcomingRdvs.length === 0 ? (
              <p className="text-xs py-2" style={{ color: tokens.text.quaternary }}>Aucun rendez-vous à venir</p>
            ) : (
              <div className="space-y-2">
                {upcomingRdvs.map(rdv => {
                  const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
                  return (
                    <button key={rdv.id} className="w-full text-left px-3 py-2.5 rounded-xl transition-all hover:brightness-110"
                      style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.borderLight}` }}
                      onClick={() => {
                        const localDate = getRdvLocalDate(rdv, userTimezone);
                        const d = new Date(localDate + 'T00:00:00');
                        setYear(d.getFullYear()); setMonth(d.getMonth());
                        setDayDate(localDate); setWeekStart(getMondayOf(d));
                        setSelectedDate(localDate); setView('month');
                      }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold truncate" style={{ color: tokens.text.primary }}>{rdv.lead_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]" style={{ color: tokens.text.quaternary }}>
                        <span>{new Date(getRdvLocalDate(rdv, userTimezone) + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                        <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{getRdvLocalTime(rdv, userTimezone)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: tokens.text.primary }}>Résumé</h3>
            <div className="space-y-2">
              {Object.entries(STATUS_CFG).map(([k, cfg]) => {
                const count = rdvs.filter(r => r.status === k).length;
                return (
                  <div key={k} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                      <span className="text-xs" style={{ color: tokens.text.tertiary }}>{cfg.label}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: tokens.text.primary }}>{count}</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-1" style={{ borderTop: `1px solid ${tokens.surface.borderLight}` }}>
                <span className="text-xs" style={{ color: tokens.text.tertiary }}>Total</span>
                <span className="text-xs font-bold" style={{ color: accentColor }}>{rdvs.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAdd && <AddRdvModal defaultDate={addDefault} onClose={() => setShowAdd(false)} onSaved={onReload} />}
      {detailRdv && <RdvDetailModal rdv={detailRdv} onClose={() => setDetailRdv(null)} onDelete={handleDelete} onStatusChange={handleStatusChange} onTreat={handleTreat} canTreat={canTreat} readonly={!canAdd} canDelete={canDelete ?? canAdd} userTimezone={userTimezone} clientTimezone={clientTimezone} />}
    </div>
  );
}
