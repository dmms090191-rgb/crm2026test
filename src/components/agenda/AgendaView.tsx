import { useState, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, User, Phone, Mail,
  Check, AlertCircle, Calendar, CalendarDays, LayoutGrid, List,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface RdvProposal {
  id: string;
  vendor_id?: string | null;
  lead_id?: string | null;
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  proposed_date: string;
  proposed_time: string;
  notes: string;
  status: string;
  created_at: string;
}

export const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pending:   { label: 'En attente', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.25)',  dot: '#fbbf24' },
  confirmed: { label: 'Confirmé',   color: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.25)',  dot: '#34d399' },
  cancelled: { label: 'Annulé',     color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)', dot: '#f87171' },
  done:      { label: 'Terminé',    color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)', dot: '#94a3b8' },
};

const DAYS_SHORT  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_FULL   = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MONTHS      = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const HOURS       = Array.from({ length: 13 }, (_, i) => i + 8);

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getMondayOf(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return m;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function formatDateFull(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all';
const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' };

interface AddRdvModalProps {
  defaultDate?: string;
  canSetVendor?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function AddRdvModal({ defaultDate, onClose, onSaved }: AddRdvModalProps) {
  const [form, setForm] = useState({
    lead_name: '', lead_phone: '', lead_email: '',
    proposed_date: defaultDate ?? toIso(new Date()),
    proposed_time: '10:00',
    notes: '', status: 'pending',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.lead_name.trim() || !form.proposed_date) {
      setError('Le nom du contact et la date sont obligatoires.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('rdv_proposals').insert({
      lead_name: form.lead_name.trim(),
      lead_phone: form.lead_phone.trim(),
      lead_email: form.lead_email.trim(),
      proposed_date: form.proposed_date,
      proposed_time: form.proposed_time,
      notes: form.notes.trim(),
      status: form.status,
    });
    setSaving(false);
    if (err) { setError("Erreur lors de l'enregistrement."); return; }
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#0d1420 0%,#0a1019 100%)', border: '1px solid rgba(56,189,248,0.14)', boxShadow: '0 28px 72px rgba(0,0,0,0.65)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-white font-semibold text-sm">Nouveau rendez-vous</p>
            <p className="text-slate-600 text-xs">Proposer un créneau</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Nom du contact *</label>
            <input type="text" value={form.lead_name} onChange={e => set('lead_name', e.target.value)} className={inputCls} style={inputStyle} placeholder="Jean Dupont" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Téléphone</label>
              <input type="tel" value={form.lead_phone} onChange={e => set('lead_phone', e.target.value)} className={inputCls} style={inputStyle} placeholder="06 00 00 00 00" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Email</label>
              <input type="email" value={form.lead_email} onChange={e => set('lead_email', e.target.value)} className={inputCls} style={inputStyle} placeholder="jean@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Date *</label>
              <input type="date" value={form.proposed_date} onChange={e => set('proposed_date', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Heure</label>
              <input type="time" value={form.proposed_time} onChange={e => set('proposed_time', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Statut</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls + ' cursor-pointer'} style={{ ...inputStyle, appearance: 'none' as React.CSSProperties['appearance'] }}>
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <option key={k} value={k} style={{ background: '#0a0f1a' }}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} style={inputStyle} placeholder="Informations complémentaires..." />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50 hover:scale-105" style={{ background: 'linear-gradient(90deg,#0ea5e9,#22d3ee)', boxShadow: '0 0 16px rgba(34,211,238,0.2)' }}>
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-white transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RdvDetailModalProps {
  rdv: RdvProposal;
  onClose: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  readonly?: boolean;
}

function RdvDetailModal({ rdv, onClose, onDelete, onStatusChange, readonly }: RdvDetailModalProps) {
  const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#0d1420 0%,#0a1019 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 28px 72px rgba(0,0,0,0.65)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span className="text-white font-semibold text-sm">{rdv.lead_name}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span className="text-slate-300 text-sm capitalize">{formatDateFull(rdv.proposed_date)} — {rdv.proposed_time}</span>
          </div>
          {rdv.lead_phone && (
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-400 text-sm">{rdv.lead_phone}</span>
            </div>
          )}
          {rdv.lead_email && (
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-400 text-sm">{rdv.lead_email}</span>
            </div>
          )}
          {rdv.notes && (
            <div className="px-3 py-2.5 rounded-xl text-xs text-slate-400" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {rdv.notes}
            </div>
          )}
          {!readonly && (
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(STATUS_CFG).filter(([k]) => k !== rdv.status).map(([k, v]) => (
                <button key={k} onClick={() => { onStatusChange(rdv.id, k); onClose(); }} className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>
                  {v.label}
                </button>
              ))}
              <button onClick={() => { onDelete(rdv.id); onClose(); }} className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105 ml-auto" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ViewMode = 'month' | 'week' | 'day';

interface AgendaViewProps {
  rdvs: RdvProposal[];
  onReload: () => void;
  canAdd?: boolean;
  accentColor?: string;
  accentRgb?: string;
}

export default function AgendaView({ rdvs, onReload, canAdd = true, accentColor = '#22d3ee', accentRgb = '34,211,238' }: AgendaViewProps) {
  const today = new Date();
  const todayStr = toIso(today);

  const [view, setView] = useState<ViewMode>('month');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(today));
  const [dayDate, setDayDate] = useState<string>(todayStr);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addDefault, setAddDefault] = useState<string | undefined>();
  const [detailRdv, setDetailRdv] = useState<RdvProposal | null>(null);

  const rdvsByDate: Record<string, RdvProposal[]> = {};
  rdvs.forEach(r => {
    if (!rdvsByDate[r.proposed_date]) rdvsByDate[r.proposed_date] = [];
    rdvsByDate[r.proposed_date].push(r);
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
    .filter(r => r.proposed_date >= todayStr && r.status !== 'cancelled' && r.status !== 'done')
    .sort((a, b) => a.proposed_date.localeCompare(b.proposed_date) || a.proposed_time.localeCompare(b.proposed_time))
    .slice(0, 8);

  const cardStyle: React.CSSProperties = { background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.07)' };

  function RdvPill({ rdv, compact }: { rdv: RdvProposal; compact?: boolean }) {
    const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
    return (
      <button
        onClick={e => { e.stopPropagation(); setDetailRdv(rdv); }}
        className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-all hover:brightness-125"
        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
        title={`${rdv.proposed_time} — ${rdv.lead_name}`}
      >
        {!compact && <span className="opacity-70 mr-1">{rdv.proposed_time}</span>}
        {rdv.lead_name}
      </button>
    );
  }

  function MonthView() {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    return (
      <div className="p-4">
        <div className="grid grid-cols-7 mb-1">
          {DAYS_SHORT.map(d => (
            <div key={d} className="text-center text-[10px] font-bold tracking-wider uppercase py-2" style={{ color: `rgba(${accentRgb},0.5)` }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', overflow: 'hidden' }}>
          {Array.from({ length: totalCells }).map((_, idx) => {
            const cellDay = idx - firstDay + 1;
            const isCurrentMonth = cellDay >= 1 && cellDay <= daysInMonth;
            if (!isCurrentMonth) {
              return <div key={idx} className="min-h-[80px] p-1" style={{ background: 'rgba(255,255,255,0.01)' }} />;
            }
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(cellDay).padStart(2,'0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayRdvs = rdvsByDate[dateStr] ?? [];

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className="min-h-[80px] p-1.5 cursor-pointer transition-all group"
                style={{
                  background: isSelected
                    ? `rgba(${accentRgb},0.08)`
                    : isToday
                    ? `rgba(${accentRgb},0.04)`
                    : 'rgba(10,15,26,0.6)',
                  outline: isSelected ? `1.5px solid rgba(${accentRgb},0.35)` : isToday ? `1.5px solid rgba(${accentRgb},0.2)` : 'none',
                  outlineOffset: '-1px',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: isToday ? accentColor : 'transparent',
                      color: isToday ? '#0a0f1a' : isSelected ? accentColor : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {cellDay}
                  </span>
                  {canAdd && (
                    <button
                      onClick={e => { e.stopPropagation(); openAdd(dateStr); }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center transition-all"
                      style={{ background: `rgba(${accentRgb},0.15)`, color: accentColor }}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayRdvs.slice(0, 3).map(rdv => <RdvPill key={rdv.id} rdv={rdv} compact />)}
                  {dayRdvs.length > 3 && (
                    <span className="text-[9px] text-slate-600 px-1">+{dayRdvs.length - 3} autres</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-4 rounded-xl overflow-hidden" style={{ border: `1px solid rgba(${accentRgb},0.2)`, background: `rgba(${accentRgb},0.03)` }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid rgba(${accentRgb},0.12)` }}>
              <p className="text-xs font-semibold text-white capitalize">{formatDateFull(selectedDate)}</p>
              <div className="flex items-center gap-2">
                {canAdd && (
                  <button onClick={() => openAdd(selectedDate)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-105" style={{ background: `rgba(${accentRgb},0.1)`, border: `1px solid rgba(${accentRgb},0.2)`, color: accentColor }}>
                    <Plus className="w-3 h-3" />Ajouter
                  </button>
                )}
                <button onClick={() => setSelectedDate(null)} className="text-slate-600 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="px-4 py-3">
              {(rdvsByDate[selectedDate] ?? []).length === 0 ? (
                <p className="text-xs text-slate-600">Aucun rendez-vous ce jour</p>
              ) : (
                <div className="space-y-2">
                  {(rdvsByDate[selectedDate] ?? []).map(rdv => {
                    const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
                    return (
                      <button
                        key={rdv.id}
                        onClick={() => setDetailRdv(rdv)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:brightness-110"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">{rdv.lead_name}</span>
                            <span className="text-[10px] text-slate-500">{rdv.proposed_time}</span>
                          </div>
                          {rdv.lead_phone && <p className="text-xs text-slate-600">{rdv.lead_phone}</p>}
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold flex-shrink-0" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
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

  function WeekView() {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });

    return (
      <div className="overflow-x-auto">
        <div style={{ minWidth: '600px' }}>
          <div className="grid grid-cols-8 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="py-2 px-3" />
            {days.map((d, i) => {
              const ds = toIso(d);
              const isToday = ds === todayStr;
              return (
                <div
                  key={i}
                  className="py-2 px-2 text-center cursor-pointer transition-all hover:opacity-80"
                  onClick={() => { setDayDate(ds); setView('day'); }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: isToday ? accentColor : 'rgba(255,255,255,0.3)' }}>
                    {DAYS_SHORT[i]}
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm font-bold transition-all"
                    style={{
                      background: isToday ? accentColor : 'transparent',
                      color: isToday ? '#0a0f1a' : 'rgba(255,255,255,0.6)',
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
              <div key={h} className="grid grid-cols-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', minHeight: '56px' }}>
                <div className="px-3 py-1.5 flex items-start justify-end">
                  <span className="text-[10px] text-slate-700 font-medium">{String(h).padStart(2,'0')}:00</span>
                </div>
                {days.map((d, i) => {
                  const ds = toIso(d);
                  const isToday = ds === todayStr;
                  const slotRdvs = (rdvsByDate[ds] ?? []).filter(r => {
                    const rh = parseInt(r.proposed_time.split(':')[0], 10);
                    return rh === h;
                  });
                  return (
                    <div
                      key={i}
                      className="relative p-0.5 group cursor-pointer transition-all"
                      style={{ borderLeft: '1px solid rgba(255,255,255,0.04)', background: isToday ? `rgba(${accentRgb},0.02)` : 'transparent' }}
                      onClick={() => { if (canAdd) openAdd(ds); }}
                    >
                      {canAdd && slotRdvs.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-3 h-3" style={{ color: `rgba(${accentRgb},0.4)` }} />
                        </div>
                      )}
                      <div className="space-y-0.5">
                        {slotRdvs.map(rdv => <RdvPill key={rdv.id} rdv={rdv} />)}
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

  function DayView() {
    const dayRdvs = rdvsByDate[dayDate] ?? [];
    const isToday = dayDate === todayStr;

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-sm capitalize">{formatDateFull(dayDate)}</h3>
            {isToday && <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>Aujourd'hui</span>}
          </div>
          {canAdd && (
            <button onClick={() => openAdd(dayDate)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-105" style={{ background: `rgba(${accentRgb},0.1)`, border: `1px solid rgba(${accentRgb},0.2)`, color: accentColor }}>
              <Plus className="w-3 h-3" />Ajouter
            </button>
          )}
        </div>

        <div>
          {HOURS.map(h => {
            const slotRdvs = dayRdvs.filter(r => parseInt(r.proposed_time.split(':')[0], 10) === h);
            return (
              <div key={h} className="flex gap-3 group" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', minHeight: '52px' }}>
                <div className="w-14 flex-shrink-0 flex items-start pt-2 justify-end">
                  <span className="text-[10px] text-slate-700 font-medium">{String(h).padStart(2,'0')}:00</span>
                </div>
                <div
                  className="flex-1 relative py-1 px-1 cursor-pointer rounded-lg transition-all"
                  style={{ borderLeft: '2px solid rgba(255,255,255,0.05)' }}
                  onClick={() => { if (canAdd && slotRdvs.length === 0) openAdd(dayDate); }}
                >
                  {canAdd && slotRdvs.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px]" style={{ color: `rgba(${accentRgb},0.4)` }}>+ Ajouter un RDV</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    {slotRdvs.map(rdv => {
                      const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
                      return (
                        <button
                          key={rdv.id}
                          onClick={e => { e.stopPropagation(); setDetailRdv(rdv); }}
                          className="w-full text-left px-3 py-2 rounded-xl transition-all hover:brightness-110"
                          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: cfg.color }}>{rdv.proposed_time}</span>
                            <span className="text-xs font-semibold text-white">{rdv.lead_name}</span>
                          </div>
                          {rdv.lead_phone && <p className="text-[10px] mt-0.5" style={{ color: cfg.color, opacity: 0.7 }}>{rdv.lead_phone}</p>}
                          {rdv.notes && <p className="text-[10px] text-slate-500 truncate mt-0.5">{rdv.notes}</p>}
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">Agenda</h2>
          <p className="text-slate-600 text-xs mt-0.5">{rdvs.length} rendez-vous au total</p>
        </div>
        <div className="flex items-center gap-2">
          {canAdd && (
            <button
              onClick={() => openAdd(todayStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: `rgba(${accentRgb},0.08)`, border: `1px solid rgba(${accentRgb},0.18)`, color: accentColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau RDV
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className="xl:col-span-3 rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1">
              <button onClick={navPrev} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={navToday} className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all" style={{ background: `rgba(${accentRgb},0.08)`, color: accentColor, border: `1px solid rgba(${accentRgb},0.15)` }}>
                Aujourd'hui
              </button>
              <button onClick={navNext} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-white text-sm font-semibold capitalize">{navTitle()}</h3>

            <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {([
                { v: 'month', icon: LayoutGrid, label: 'Mois' },
                { v: 'week',  icon: CalendarDays, label: 'Semaine' },
                { v: 'day',   icon: List, label: 'Jour' },
              ] as const).map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                  style={view === v
                    ? { background: `rgba(${accentRgb},0.15)`, color: accentColor, border: `1px solid rgba(${accentRgb},0.25)` }
                    : { color: 'rgba(255,255,255,0.3)', border: '1px solid transparent' }
                  }
                >
                  <Icon className="w-3 h-3" />{label}
                </button>
              ))}
            </div>
          </div>

          {view === 'month' && <MonthView />}
          {view === 'week'  && <WeekView />}
          {view === 'day'   && <DayView />}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4" style={{ color: accentColor }} />
              <h3 className="text-white text-sm font-semibold">Prochains RDV</h3>
            </div>
            {upcomingRdvs.length === 0 ? (
              <p className="text-xs text-slate-600 py-2">Aucun rendez-vous à venir</p>
            ) : (
              <div className="space-y-2">
                {upcomingRdvs.map(rdv => {
                  const cfg = STATUS_CFG[rdv.status] ?? STATUS_CFG.pending;
                  return (
                    <button
                      key={rdv.id}
                      className="w-full text-left px-3 py-2.5 rounded-xl transition-all hover:brightness-110"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                      onClick={() => {
                        const d = new Date(rdv.proposed_date + 'T00:00:00');
                        setYear(d.getFullYear());
                        setMonth(d.getMonth());
                        setDayDate(rdv.proposed_date);
                        setWeekStart(getMondayOf(d));
                        setSelectedDate(rdv.proposed_date);
                        setView('month');
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white truncate">{rdv.lead_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-600">
                        <span>{new Date(rdv.proposed_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                        {rdv.proposed_time && <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{rdv.proposed_time}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-4" style={cardStyle}>
            <h3 className="text-white text-sm font-semibold mb-3">Résumé</h3>
            <div className="space-y-2">
              {Object.entries(STATUS_CFG).map(([k, cfg]) => {
                const count = rdvs.filter(r => r.status === k).length;
                return (
                  <div key={k} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                      <span className="text-xs text-slate-500">{cfg.label}</span>
                    </div>
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-xs text-slate-500">Total</span>
                <span className="text-xs font-bold" style={{ color: accentColor }}>{rdvs.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddRdvModal defaultDate={addDefault} onClose={() => setShowAdd(false)} onSaved={onReload} />
      )}
      {detailRdv && (
        <RdvDetailModal rdv={detailRdv} onClose={() => setDetailRdv(null)} onDelete={handleDelete} onStatusChange={handleStatusChange} readonly={!canAdd} />
      )}
    </div>
  );
}
