import { useState } from 'react';
import { Check, X, AlertCircle, Globe } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { RdvProposal, statusConfig } from './rdvPropositionsConstants';
import { useTimezone } from '../../../hooks/useTimezone';
import { localToUTC, utcToLocal, getTzLabel } from '../../../lib/timezoneUtils';

interface EditModalProps {
  rdv: RdvProposal;
  onClose: () => void;
  onSaved: () => void;
}

function getInitialDateTime(rdv: RdvProposal, timezone: string) {
  if (rdv.appointment_utc) {
    return utcToLocal(rdv.appointment_utc, timezone);
  }
  return { date: rdv.proposed_date, time: rdv.proposed_time };
}

export default function RdvEditModal({ rdv, onClose, onSaved }: EditModalProps) {
  const tokens = useThemeTokens();
  const { timezone } = useTimezone();
  const localDt = getInitialDateTime(rdv, timezone);
  const [form, setForm] = useState({
    proposed_date: localDt.date,
    proposed_time: localDt.time,
    motif: rdv.motif,
    description: rdv.description,
    notes: rdv.notes,
    status: rdv.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.proposed_date) {
      setError('La date est obligatoire.');
      return;
    }
    const appointmentUtc = localToUTC(form.proposed_date, form.proposed_time, timezone);
    if (new Date(appointmentUtc).getTime() <= Date.now()) {
      setError('Impossible de proposer un rendez-vous dans le passe. Veuillez choisir une date et une heure futures.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('rdv_proposals').update({
      proposed_date: form.proposed_date,
      proposed_time: form.proposed_time,
      motif: form.motif.trim(),
      description: form.description.trim(),
      notes: form.notes.trim(),
      status: form.status,
      appointment_utc: appointmentUtc,
      source_timezone: timezone,
    }).eq('id', rdv.id);
    setSaving(false);
    if (err) { setError('Erreur lors de l\'enregistrement.'); return; }
    onSaved();
    onClose();
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all';
  const inputStyle = { background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: tokens.modal.bg,
          border: `1px solid ${tokens.modal.border}`,
          boxShadow: tokens.modal.shadow,
        }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${tokens.card.border}` }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: tokens.modal.title }}>Modifier le rendez-vous</p>
            <p className="text-xs" style={{ color: tokens.modal.subtitle }}>{rdv.lead_name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
            onMouseEnter={e => { e.currentTarget.style.background = tokens.modal.closeBtnHoverBg; e.currentTarget.style.color = tokens.modal.closeBtnHoverText; }}
            onMouseLeave={e => { e.currentTarget.style.background = tokens.modal.closeBtnBg; e.currentTarget.style.color = tokens.modal.closeBtnText; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: tokens.danger.bg, border: `1px solid ${tokens.danger.border}`, color: tokens.danger.text }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Date *</label>
              <input type="date" value={form.proposed_date} onChange={e => set('proposed_date', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Heure</label>
              <input type="time" value={form.proposed_time} onChange={e => set('proposed_time', e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}>
            <Globe className="w-3 h-3" style={{ color: tokens.accent.text }} />
            <span className="text-[10px]" style={{ color: tokens.text.tertiary }}>Fuseau : {getTzLabel(timezone)}</span>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Motif</label>
            <input type="text" value={form.motif} onChange={e => set('motif', e.target.value)} className={inputCls} style={inputStyle} placeholder="Ex: Consultation, Suivi..." />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inputCls + ' resize-none'} style={inputStyle} placeholder="Details du rendez-vous..." />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Statut</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className={inputCls + ' cursor-pointer'}
              style={{ ...inputStyle, appearance: 'none' }}
            >
              {Object.entries(statusConfig).map(([k, v]) => (
                <option key={k} value={k} style={{ background: tokens.selectBg }}>{v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className={inputCls + ' resize-none'}
              style={inputStyle}
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 hover:scale-105"
              style={{ background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)', boxShadow: `0 0 16px ${tokens.accent.text}33`, color: tokens.text.primary }}
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.tertiary }}
              onMouseEnter={e => e.currentTarget.style.color = tokens.text.primary}
              onMouseLeave={e => e.currentTarget.style.color = tokens.text.tertiary}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
