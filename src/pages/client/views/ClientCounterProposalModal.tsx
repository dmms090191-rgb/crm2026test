import { useState } from 'react';
import { X, Send, CalendarDays, Clock } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import TimePickerInline from '../../../components/TimePickerInline';

interface ClientCounterProposalModalProps {
  currentDate: string;
  currentTime: string;
  onSubmit: (date: string, time: string, message: string) => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function ClientCounterProposalModal({ currentDate, currentTime, onSubmit, onCancel, saving, error }: ClientCounterProposalModalProps) {
  const tokens = useThemeTokens();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    onSubmit(date, time, message.trim());
  }

  const inputStyle: React.CSSProperties = {
    background: tokens.surface.secondary,
    border: `1px solid ${tokens.surface.border}`,
    color: tokens.text.primary,
  };

  const disabledStyle: React.CSSProperties = {
    background: tokens.surface.secondary,
    border: `1px solid ${tokens.surface.border}`,
    color: tokens.text.quaternary,
    opacity: 0.7,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-md rounded-2xl sm:rounded-2xl rounded-b-none sm:rounded-b-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}`, maxHeight: 'calc(100dvh - 16px)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" style={{ color: tokens.accent.text }} />
            <h3 className="text-sm font-bold" style={{ color: tokens.text.primary }}>Modifier l'horaire</h3>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg transition-colors hover:opacity-70">
            <X className="w-4 h-4" style={{ color: tokens.text.tertiary }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1 overscroll-contain">
          <p className="text-xs" style={{ color: tokens.text.tertiary }}>
            Proposez une autre date ou un autre horaire pour votre rendez-vous.
          </p>

          <div className="rounded-xl p-3.5" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: tokens.text.quaternary }}>
              Rendez-vous actuel
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: tokens.text.quaternary }}>
                  Ancienne date
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={disabledStyle}>
                  <CalendarDays className="w-3 h-3 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
                  <span className="text-xs">{formatDisplayDate(currentDate)}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: tokens.text.quaternary }}>
                  Ancienne heure
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm" style={disabledStyle}>
                  <Clock className="w-3 h-3 flex-shrink-0" style={{ color: tokens.text.quaternary }} />
                  <span className="text-xs">{currentTime || '--:--'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-3.5" style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.12)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: '#06b6d4' }}>
              Nouveau rendez-vous souhaite
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: tokens.text.tertiary }}>
                  Nouvelle date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1" style={{ color: tokens.text.tertiary }}>
                  Nouvelle heure
                </label>
                <TimePickerInline
                  value={time}
                  onChange={setTime}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: tokens.text.quaternary }}>
              Message (optionnel)
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Ex : Je suis disponible plutot a 18h30"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-[11px] font-medium" style={{ color: '#ef4444' }}>{error}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !date || !time}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
            >
              <Send className="w-3.5 h-3.5" />
              {saving ? 'Envoi...' : 'Envoyer'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.tertiary }}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
