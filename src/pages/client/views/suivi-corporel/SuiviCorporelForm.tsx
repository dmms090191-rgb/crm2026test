import { useState } from 'react';
import { Scale, Droplets, Ruler, FileText, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import { BodyAssessmentFormData, EMPTY_FORM, FORM_SECTIONS, FormField } from './types';

const SECTION_ICONS = {
  scale: Scale,
  body: Droplets,
  ruler: Ruler,
  notes: FileText,
};

const SECTION_COLORS = [
  { bg: 'rgba(16,185,129,0.10)', color: '#10b981' },
  { bg: 'rgba(59,130,246,0.10)', color: '#3b82f6' },
  { bg: 'rgba(245,158,11,0.10)', color: '#f59e0b' },
  { bg: 'rgba(139,92,246,0.10)', color: '#8b5cf6' },
];

interface Props {
  clientId: string;
  clientEmail: string;
  onSaved: () => void;
}

export default function SuiviCorporelForm({ clientId, clientEmail, onSaved }: Props) {
  const tokens = useThemeTokens();
  const [form, setForm] = useState<BodyAssessmentFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const updateField = (key: keyof BodyAssessmentFormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const hasAnyValue = Object.entries(form).some(
      ([k, v]) => k !== 'notes' && k !== 'morphology' && v !== ''
    );
    if (!hasAnyValue) {
      setError('Veuillez remplir au moins une mesure.');
      return;
    }

    setSaving(true);
    setError('');

    const { data: lead } = await supabase
      .from('leads')
      .select('id, company_id')
      .eq('email', clientEmail)
      .eq('actif', true)
      .limit(1)
      .maybeSingle();

    if (!lead?.company_id) {
      setError('Impossible de determiner votre entreprise. Contactez le support.');
      setSaving(false);
      return;
    }

    const numOrNull = (v: string) => (v === '' ? null : parseFloat(v));
    const intOrNull = (v: string) => (v === '' ? null : parseInt(v, 10));

    const payload = {
      client_id: lead.id || clientId,
      company_id: lead.company_id,
      weight: numOrNull(form.weight),
      bmi: numOrNull(form.bmi),
      body_fat_percent: numOrNull(form.body_fat_percent),
      water_percent: numOrNull(form.water_percent),
      muscle: numOrNull(form.muscle),
      morphology: form.morphology || null,
      bone_mass: numOrNull(form.bone_mass),
      body_age: intOrNull(form.body_age),
      visceral_fat: numOrNull(form.visceral_fat),
      protein_mass: numOrNull(form.protein_mass),
      global_body_score: numOrNull(form.global_body_score),
      chest_measure: numOrNull(form.chest_measure),
      waist_measure: numOrNull(form.waist_measure),
      belly_measure: numOrNull(form.belly_measure),
      hips_measure: numOrNull(form.hips_measure),
      thigh_measure: numOrNull(form.thigh_measure),
      arm_measure: numOrNull(form.arm_measure),
      notes: form.notes || null,
    };

    const { error: insertErr } = await supabase
      .from('client_body_assessments')
      .insert(payload);

    if (insertErr) {
      setError(`Erreur: ${insertErr.message}`);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(true);
    setForm({ ...EMPTY_FORM });
    onSaved();
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 h-full overflow-auto pb-4">
      {FORM_SECTIONS.map((section, si) => {
        const Icon = SECTION_ICONS[section.icon as keyof typeof SECTION_ICONS];
        const palette = SECTION_COLORS[si];
        return (
          <div
            key={section.title}
            className="rounded-2xl border"
            style={{
              background: tokens.card.bg,
              borderColor: tokens.card.border,
              boxShadow: tokens.card.shadow,
            }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3.5 border-b"
              style={{ borderColor: tokens.card.border }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: palette.bg }}
              >
                <Icon className="w-4 h-4" style={{ color: palette.color }} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: tokens.text.primary }}>
                {section.title}
              </h3>
            </div>

            <div className="p-4 md:p-5">
              {section.fields.length === 1 && section.fields[0].type === 'textarea' ? (
                <TextAreaField
                  field={section.fields[0]}
                  value={form[section.fields[0].key]}
                  onChange={(v) => updateField(section.fields[0].key, v)}
                  tokens={tokens}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {section.fields.map((field) => (
                    <InputField
                      key={field.key}
                      field={field}
                      value={form[field.key]}
                      onChange={(v) => updateField(field.key, v)}
                      tokens={tokens}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
          style={{ background: 'rgba(16,185,129,0.10)', color: '#10b981' }}
        >
          <CheckCircle2 className="w-4 h-4" />
          Bilan enregistre avec succes !
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
          }}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Enregistrement...' : 'Enregistrer le bilan'}
        </button>
      </div>
    </form>
  );
}

function InputField({
  field,
  value,
  onChange,
  tokens,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold" style={{ color: tokens.text.secondary }}>
        {field.label}
        {field.unit && (
          <span className="ml-1 font-normal" style={{ color: tokens.text.quaternary }}>
            ({field.unit})
          </span>
        )}
      </label>
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        step={field.type === 'number' ? 'any' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all duration-150 focus:ring-2"
        style={{
          background: tokens.input?.bg ?? tokens.card.bg,
          border: `1px solid ${tokens.input?.border ?? tokens.card.border}`,
          color: tokens.text.primary,
          // @ts-expect-error ring color
          '--tw-ring-color': 'rgba(16,185,129,0.3)',
        }}
      />
    </div>
  );
}

function TextAreaField({
  field,
  value,
  onChange,
  tokens,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold" style={{ color: tokens.text.secondary }}>
        {field.label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all duration-150 resize-none focus:ring-2"
        style={{
          background: tokens.input?.bg ?? tokens.card.bg,
          border: `1px solid ${tokens.input?.border ?? tokens.card.border}`,
          color: tokens.text.primary,
          // @ts-expect-error ring color
          '--tw-ring-color': 'rgba(16,185,129,0.3)',
        }}
      />
    </div>
  );
}
