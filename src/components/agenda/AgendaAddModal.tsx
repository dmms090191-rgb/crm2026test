import { useState } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useTimezone } from '../../hooks/useTimezone';
import { STATUS_CFG } from './agendaTypes';
import { toIso } from './agendaHelpers';
import { localToUTC } from '../../lib/timezoneUtils';

interface AddRdvModalProps {
  defaultDate?: string;
  canSetVendor?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddRdvModal({ defaultDate, onClose, onSaved }: AddRdvModalProps) {
  const tokens = useThemeTokens();
  const { timezone, userRole, userName } = useTimezone();

  const [form, setForm] = useState({
    proposed_date: defaultDate ?? toIso(new Date()),
    proposed_time: '10:00',
    motif: '', description: '', notes: '', status: 'pending',
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
    const { error: err } = await supabase.from('rdv_proposals').insert({
      lead_name: '',
      lead_phone: '',
      lead_email: '',
      proposed_date: form.proposed_date,
      proposed_time: form.proposed_time,
      motif: form.motif.trim(),
      description: form.description.trim(),
      notes: form.notes.trim(),
      status: form.status,
      appointment_utc: appointmentUtc,
      source_timezone: timezone,
      created_by_role: userRole ?? 'admin',
      created_by_name: userName,
    });
    setSaving(false);
    if (err) { setError("Erreur lors de l'enregistrement."); return; }
    onSaved();
    onClose();
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`, boxShadow: tokens.modal.shadow }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: tokens.modal.title }}>Nouveau rendez-vous</p>
            <p className="text-xs" style={{ color: tokens.modal.subtitle }}>Proposer un créneau</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: tokens.danger.bg, border: `1px solid ${tokens.danger.border}`, color: tokens.danger.text }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.label.hint }}>Motif</label>
            <input type="text" value={form.motif} onChange={e => set('motif', e.target.value)} className={inputCls} style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} placeholder="Ex: Consultation, Suivi, Devis..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.label.hint }}>Date *</label>
              <input type="date" value={form.proposed_date} onChange={e => set('proposed_date', e.target.value)} className={inputCls} style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.label.hint }}>Heure</label>
              <input type="time" value={form.proposed_time} onChange={e => set('proposed_time', e.target.value)} className={inputCls} style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.label.hint }}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inputCls + ' resize-none'} style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} placeholder="Details du rendez-vous..." />
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.label.hint }}>Statut</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls + ' cursor-pointer'} style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text, appearance: 'none' as React.CSSProperties['appearance'] }}>
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <option key={k} value={k} style={{ background: tokens.selectBg }}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: tokens.label.hint }}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }} placeholder="Informations complémentaires..." />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 hover:scale-105" style={{ background: tokens.accent.solid, color: tokens.text.primary, boxShadow: '0 0 16px rgba(34,211,238,0.2)' }}>
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold transition-all" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.tertiary }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
