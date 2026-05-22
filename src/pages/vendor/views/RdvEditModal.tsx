import { useState } from 'react';
import { Check, X, AlertCircle, Globe } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useCompanyId } from '../../../hooks/useCompanyId';
import { RdvProposal, statusConfig } from './rdvPropositionsConstants';
import { useTimezone } from '../../../hooks/useTimezone';
import { localToUTC, utcToLocal, getTzLabel } from '../../../lib/timezoneUtils';
import TimePickerInline from '../../../components/TimePickerInline';

interface EditModalProps {
  rdv: RdvProposal;
  onClose: () => void;
  onSaved: () => void;
  callerRole?: 'admin' | 'vendor';
}

function getInitialDateTime(rdv: RdvProposal, timezone: string) {
  if (rdv.appointment_utc) {
    return utcToLocal(rdv.appointment_utc, timezone);
  }
  return { date: rdv.proposed_date, time: rdv.proposed_time };
}

export default function RdvEditModal({ rdv, onClose, onSaved, callerRole }: EditModalProps) {
  const tokens = useThemeTokens();
  const { timezone, userName } = useTimezone();
  const companyId = useCompanyId();
  const localDt = getInitialDateTime(rdv, timezone);
  const [form, setForm] = useState({
    proposed_date: localDt.date,
    proposed_time: localDt.time,
    motif: rdv.motif,
    description: rdv.description,
    status: rdv.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isClientProposal = rdv.created_by_role === 'client';
  const role = callerRole || 'admin';

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

    if (rdv.status === 'confirmed') {
      const { error: err } = await supabase.from('rdv_proposals').update({
        reschedule_status: 'pending',
        reschedule_date: form.proposed_date,
        reschedule_time: form.proposed_time,
        reschedule_utc: appointmentUtc,
        reschedule_reason: form.description.trim() || null,
        reschedule_requested_at: new Date().toISOString(),
        reschedule_requested_by: role,
        seen_by_client: false,
      }).eq('id', rdv.id);
      if (err) { setSaving(false); setError('Erreur lors de l\'enregistrement.'); return; }
    } else if (isClientProposal && rdv.status === 'pending') {
      const now = new Date().toISOString();
      await supabase.from('rdv_proposals').update({
        status: 'counter_proposed',
        responded_at: now,
        responded_by: role,
      }).eq('id', rdv.id);

      if (rdv.parent_proposal_id) {
        await supabase.from('rdv_proposals').update({
          status: 'counter_proposed',
          responded_at: now,
          responded_by: role,
        }).eq('id', rdv.parent_proposal_id).in('status', ['pending', 'counter_proposed']);

        await supabase.from('rdv_proposals').update({
          status: 'counter_proposed',
          responded_at: now,
          responded_by: role,
        }).eq('parent_proposal_id', rdv.parent_proposal_id).neq('id', rdv.id).in('status', ['pending']);
      }

      await supabase.from('rdv_proposals').insert({
        lead_name: rdv.lead_name,
        lead_phone: rdv.lead_phone,
        lead_email: rdv.lead_email,
        lead_id: rdv.lead_id || null,
        vendor_id: rdv.vendor_id || null,
        proposed_date: form.proposed_date,
        proposed_time: form.proposed_time,
        motif: form.motif.trim(),
        description: form.description.trim(),
        notes: '',
        status: 'pending',
        created_by_role: role,
        created_by_name: userName,
        target_role: 'client',
        appointment_utc: appointmentUtc,
        source_timezone: timezone,
        parent_proposal_id: rdv.id,
        seen_by_client: false,
        seen_by_admin: role === 'admin',
        seen_by_vendor: role === 'vendor',
        ...(companyId ? { company_id: companyId } : {}),
      });
    } else {
      const { error: err } = await supabase.from('rdv_proposals').update({
        proposed_date: form.proposed_date,
        proposed_time: form.proposed_time,
        motif: form.motif.trim(),
        description: form.description.trim(),
        status: form.status,
        appointment_utc: appointmentUtc,
        source_timezone: timezone,
        seen_by_client: false,
      }).eq('id', rdv.id);
      if (err) { setSaving(false); setError('Erreur lors de l\'enregistrement.'); return; }
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all';
  const inputStyle = { background: tokens.modal.fieldBg, border: `1px solid ${tokens.modal.fieldBorder}`, color: tokens.modal.fieldValue };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[95vw] sm:max-w-md rounded-2xl sm:rounded-2xl rounded-b-none sm:rounded-b-2xl overflow-hidden flex flex-col"
        style={{
          background: tokens.modal.bg,
          border: `1px solid ${tokens.modal.border}`,
          boxShadow: tokens.modal.shadow,
          maxHeight: 'calc(100dvh - 16px)',
        }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${tokens.card.border}` }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: tokens.modal.title }}>
              {rdv.status === 'confirmed' ? 'Proposer un decalage' : isClientProposal && rdv.status === 'pending' ? 'Reproposer un horaire' : 'Modifier le rendez-vous'}
            </p>
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

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {rdv.status === 'confirmed' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: '#f59e0b' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Le client recevra une demande de modification. Le RDV actuel reste confirme.
            </div>
          )}
          {isClientProposal && rdv.status === 'pending' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', color: '#06b6d4' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Une nouvelle proposition sera envoyee au client. L'ancienne sera remplacee.
            </div>
          )}

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
              <TimePickerInline value={form.proposed_time} onChange={v => set('proposed_time', v)} className={inputCls} style={inputStyle} />
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

          {rdv.status !== 'confirmed' && !(isClientProposal && rdv.status === 'pending') && (
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
          )}

        </div>

        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0" style={{ borderTop: `1px solid ${tokens.card.border}` }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 hover:scale-105"
            style={{ background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)', boxShadow: `0 0 16px ${tokens.accent.text}33`, color: tokens.text.primary }}
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? 'Enregistrement...' : rdv.status === 'confirmed' ? 'Envoyer la demande' : (isClientProposal && rdv.status === 'pending' ? 'Envoyer la proposition' : 'Enregistrer')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.tertiary }}
            onMouseEnter={e => e.currentTarget.style.color = tokens.text.primary}
            onMouseLeave={e => e.currentTarget.style.color = tokens.text.tertiary}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
