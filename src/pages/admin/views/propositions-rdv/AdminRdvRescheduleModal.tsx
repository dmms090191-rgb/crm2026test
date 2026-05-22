import { useState } from 'react';
import { Globe, Check, X, AlertCircle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getTzLabel, localToUTC, utcToLocal } from '../../../../lib/timezoneUtils';
import type { RdvProposal } from '../../../vendor/views/rdvPropositionsConstants';
import TimePickerInline from '../../../../components/TimePickerInline';

interface Props {
  rdv: RdvProposal;
  timezone: string;
  onSubmit: (id: string, date: string, time: string) => Promise<void>;
  onClose: () => void;
}

export default function AdminRdvRescheduleModal({ rdv, timezone, onSubmit, onClose }: Props) {
  const tokens = useThemeTokens();
  const local = rdv.reschedule_utc
    ? utcToLocal(rdv.reschedule_utc, timezone)
    : { date: rdv.reschedule_date || '', time: rdv.reschedule_time || '' };
  const [form, setForm] = useState({ date: local.date, time: local.time });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!form.date) return;
    const utc = localToUTC(form.date, form.time, timezone);
    if (new Date(utc).getTime() <= Date.now()) {
      setError('Veuillez choisir une date et une heure futures.');
      return;
    }
    setSaving(true);
    await onSubmit(rdv.id, form.date, form.time);
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[95vw] sm:max-w-md rounded-2xl sm:rounded-2xl rounded-b-none sm:rounded-b-2xl overflow-hidden flex flex-col"
        style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`, boxShadow: tokens.modal.shadow, maxHeight: 'calc(100dvh - 16px)' }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${tokens.card.border}` }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: tokens.modal.title }}>Modifier l'horaire</p>
            <p className="text-xs" style={{ color: tokens.modal.subtitle }}>{rdv.lead_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3 overflow-y-auto flex-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', color: '#06b6d4' }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Vous proposez un nouvel horaire. Le rendez-vous sera mis a jour directement.
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: tokens.danger.bg, border: `1px solid ${tokens.danger.border}`, color: tokens.danger.text }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all"
                style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.modal.fieldLabel }}>Heure</label>
              <TimePickerInline
                value={form.time}
                onChange={v => setForm(f => ({ ...f, time: v }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all"
                style={{ background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}>
            <Globe className="w-3 h-3" style={{ color: tokens.accent.text }} />
            <span className="text-[10px]" style={{ color: tokens.text.tertiary }}>Fuseau : {getTzLabel(timezone)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0" style={{ borderTop: `1px solid ${tokens.card.border}` }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 hover:scale-105"
            style={{ background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)', boxShadow: `0 0 16px ${tokens.accent.text}33`, color: tokens.text.primary }}
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Enregistrement...' : 'Appliquer'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.tertiary }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
