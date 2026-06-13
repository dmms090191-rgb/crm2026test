import { CalendarCheck, Database } from 'lucide-react';
import type { AiCompanyBrain, AppointmentRules, CrmRules } from './brainTypes';

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
  embedded?: boolean;
}

export default function BrainRulesSection({ brain, onChange, tokens: t, embedded }: Props) {
  const apt = brain.appointment_rules as AppointmentRules;
  const crm = brain.crm_rules as CrmRules;

  function updateApt(field: keyof AppointmentRules, value: number) {
    onChange({ appointment_rules: { ...apt, [field]: value } });
  }
  function updateCrm(field: keyof CrmRules, value: string | boolean) {
    onChange({ crm_rules: { ...crm, [field]: value } });
  }

  const rdvContent = (
    <div className="space-y-3">
      {([
        { label: 'Duree (min)', field: 'duration_minutes' as const, val: apt.duration_minutes },
        { label: 'Tampon entre RDV (min)', field: 'buffer_minutes' as const, val: apt.buffer_minutes },
        { label: 'Reservation max (jours)', field: 'max_advance_days' as const, val: apt.max_advance_days },
        { label: 'Delai min (heures)', field: 'min_advance_hours' as const, val: apt.min_advance_hours },
        { label: 'Max RDV / jour', field: 'max_per_day' as const, val: apt.max_per_day },
      ]).map(({ label, field, val }) => (
        <div key={field} className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium" style={{ color: t.text.secondary }}>{label}</span>
          <input type="number" min={0} value={val} onChange={e => updateApt(field, parseInt(e.target.value) || 0)} className="w-20 px-2 py-1.5 rounded-lg text-xs text-right outline-none" style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
        </div>
      ))}
    </div>
  );

  const crmContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium" style={{ color: t.text.secondary }}>Statut par defaut</span>
        <input value={crm.default_status} onChange={e => updateCrm('default_status', e.target.value)} className="w-32 px-2 py-1.5 rounded-lg text-xs outline-none" style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
      </div>
      {([
        { label: 'Assigner un vendeur auto', field: 'auto_assign_vendor' as const, val: crm.auto_assign_vendor },
        { label: 'Telephone obligatoire', field: 'require_phone' as const, val: crm.require_phone },
        { label: 'Email obligatoire', field: 'require_email' as const, val: crm.require_email },
      ]).map(({ label, field, val }) => (
        <div key={field} className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium" style={{ color: t.text.secondary }}>{label}</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={val} onChange={e => updateCrm(field, e.target.checked)} className="sr-only peer" />
            <div className="w-9 h-5 rounded-full transition-colors peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" style={{ background: val ? t.accent.text : t.surface.border }} />
          </label>
        </div>
      ))}
    </div>
  );

  if (embedded) return <>{rdvContent}<div className="mt-4 pt-4" style={{ borderTop: `1px solid ${t.surface.border}` }}><p className="text-[11px] font-semibold mb-3" style={{ color: t.text.secondary }}>Regles CRM</p>{crmContent}</div></>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}><CalendarCheck className="w-4 h-4" style={{ color: t.accent.text }} /></div>
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Regles de RDV</h3>
        </div>
        {rdvContent}
      </div>
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}><Database className="w-4 h-4" style={{ color: t.accent.text }} /></div>
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Regles CRM</h3>
        </div>
        {crmContent}
      </div>
    </div>
  );
}
