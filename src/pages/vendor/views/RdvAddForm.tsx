import { Check, User, UserPlus, AlertCircle, Globe } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useTimezone } from '../../../hooks/useTimezone';
import { getTzLabel } from '../../../lib/timezoneUtils';

interface RdvAddFormProps {
  form: {
    proposed_date: string;
    proposed_time: string;
    motif: string;
    description: string;
    notes: string;
  };
  leadName?: string;
  onChange: (key: string, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onPickContact?: () => void;
  saving: boolean;
  error?: string;
}

export default function RdvAddForm({ form, leadName, onChange, onSubmit, onCancel, onPickContact, saving, error }: RdvAddFormProps) {
  const tokens = useThemeTokens();
  const { timezone } = useTimezone();

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all';
  const inputStyle = { background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text };

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 space-y-4 pb-6 sm:pb-5"
      style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}` }}
    >
      <p className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Nouvelle proposition de rendez-vous</p>
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
      {leadName ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 flex-shrink-0" style={{ color: tokens.accent.text }} />
            <span className="text-sm font-medium" style={{ color: tokens.text.primary }}>RDV pour : {leadName}</span>
          </div>
          {onPickContact && (
            <button
              type="button"
              onClick={onPickContact}
              className="text-[11px] font-medium px-2 py-1 rounded-md transition-all hover:scale-105"
              style={{ color: tokens.accent.text, background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}` }}
            >
              Changer
            </button>
          )}
        </div>
      ) : onPickContact ? (
        <button
          type="button"
          onClick={onPickContact}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.01]"
          style={{ background: tokens.surface.secondary, border: `1px dashed ${tokens.accent.border}`, color: tokens.accent.text }}
        >
          <UserPlus className="w-4 h-4 flex-shrink-0" />
          Ajouter un contact
        </button>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.label.hint }}>Motif</label>
          <input type="text" value={form.motif} onChange={e => onChange('motif', e.target.value)} className={inputCls} style={inputStyle} placeholder="Ex: Consultation, Suivi, Devis..." />
        </div>
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.label.hint }}>Date *</label>
          <input type="date" value={form.proposed_date} onChange={e => onChange('proposed_date', e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.label.hint }}>Heure</label>
          <input type="time" value={form.proposed_time} onChange={e => onChange('proposed_time', e.target.value)} className={inputCls} style={inputStyle} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}>
        <Globe className="w-3 h-3" style={{ color: tokens.accent.text }} />
        <span className="text-[10px]" style={{ color: tokens.text.tertiary }}>Fuseau : {getTzLabel(timezone)}</span>
      </div>
      <div>
        <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.label.hint }}>Description</label>
        <textarea value={form.description} onChange={e => onChange('description', e.target.value)} rows={2} className={inputCls + ' resize-none'} style={inputStyle} placeholder="Details du rendez-vous..." />
      </div>
      <div>
        <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.label.hint }}>Notes</label>
        <textarea value={form.notes} onChange={e => onChange('notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} style={inputStyle} placeholder="Informations complementaires..." />
      </div>
      <div className="flex items-center gap-3 pt-2 pb-2 scroll-mt-20">
        <button
          onClick={onSubmit}
          disabled={saving || !form.proposed_date}
          className="flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 hover:scale-105"
          style={{ background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)', boxShadow: `0 0 16px ${tokens.accent.text}33`, color: tokens.text.primary }}
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Enregistrement...' : 'Définir'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-all"
          style={{ background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.tertiary }}
          onMouseEnter={e => e.currentTarget.style.color = tokens.text.primary}
          onMouseLeave={e => e.currentTarget.style.color = tokens.text.tertiary}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
