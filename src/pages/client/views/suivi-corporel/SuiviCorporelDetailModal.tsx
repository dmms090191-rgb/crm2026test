import { X, Scale, Droplets, Ruler, FileText, CalendarDays, Clock } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { BodyAssessment } from './types';

interface Props {
  assessment: BodyAssessment;
  onClose: () => void;
}

const SECTION_CONFIG: {
  title: string;
  icon: typeof Scale;
  color: string;
  bg: string;
  fields: { key: keyof BodyAssessment; label: string; unit?: string }[];
}[] = [
  {
    title: 'Mesures principales',
    icon: Scale,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.10)',
    fields: [
      { key: 'weight', label: 'Poids', unit: 'kg' },
      { key: 'bmi', label: 'IMC' },
      { key: 'body_age', label: 'Age corporel', unit: 'ans' },
      { key: 'global_body_score', label: 'Score global' },
    ],
  },
  {
    title: 'Composition corporelle',
    icon: Droplets,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.10)',
    fields: [
      { key: 'body_fat_percent', label: 'Masse grasse', unit: '%' },
      { key: 'water_percent', label: 'Hydratation', unit: '%' },
      { key: 'muscle', label: 'Masse musculaire', unit: 'kg' },
      { key: 'bone_mass', label: 'Masse osseuse', unit: 'kg' },
      { key: 'visceral_fat', label: 'Graisse viscerale' },
      { key: 'protein_mass', label: 'Masse proteique', unit: 'kg' },
      { key: 'morphology', label: 'Morphologie' },
    ],
  },
  {
    title: 'Mensurations',
    icon: Ruler,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    fields: [
      { key: 'chest_measure', label: 'Tour de poitrine', unit: 'cm' },
      { key: 'waist_measure', label: 'Tour de taille', unit: 'cm' },
      { key: 'belly_measure', label: 'Tour de ventre', unit: 'cm' },
      { key: 'hips_measure', label: 'Tour de hanches', unit: 'cm' },
      { key: 'thigh_measure', label: 'Tour de cuisse', unit: 'cm' },
      { key: 'arm_measure', label: 'Tour de bras', unit: 'cm' },
    ],
  },
];

export default function SuiviCorporelDetailModal({ assessment, onClose }: Props) {
  const tokens = useThemeTokens();

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const fmtVal = (v: unknown, unit?: string) => {
    if (v == null || v === '') return '-';
    return `${v}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: tokens.modal?.overlayBg ?? 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: tokens.card.bg,
          borderColor: tokens.card.border,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: tokens.card.border }}
        >
          <div>
            <h3 className="text-base font-bold" style={{ color: tokens.text.primary }}>
              Detail du bilan
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="inline-flex items-center gap-1 text-xs" style={{ color: tokens.text.tertiary }}>
                <CalendarDays className="w-3 h-3" />
                {fmtDate(assessment.created_at)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs" style={{ color: tokens.text.tertiary }}>
                <Clock className="w-3 h-3" />
                {fmtTime(assessment.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
            style={{ color: tokens.text.tertiary }}
            onMouseEnter={(e) => (e.currentTarget.style.background = tokens.hover?.bg ?? 'rgba(0,0,0,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {SECTION_CONFIG.map((section) => {
            const Icon = section.icon;
            const hasValues = section.fields.some((f) => assessment[f.key] != null);
            if (!hasValues) return null;

            return (
              <div key={section.title}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: section.bg }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: section.color }} />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.text.quaternary }}>
                    {section.title}
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {section.fields.map((f) => (
                    <div
                      key={f.key}
                      className="rounded-xl px-3 py-2.5"
                      style={{
                        background: tokens.hover?.bg ?? 'rgba(0,0,0,0.02)',
                        border: `1px solid ${tokens.card.border}`,
                      }}
                    >
                      <p className="text-[10px] font-medium mb-0.5" style={{ color: tokens.text.quaternary }}>
                        {f.label}
                      </p>
                      <p className="text-sm font-bold" style={{ color: tokens.text.primary }}>
                        {fmtVal(assessment[f.key], f.unit)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Notes */}
          {assessment.notes && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.10)' }}
                >
                  <FileText className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.text.quaternary }}>
                  Notes
                </h4>
              </div>
              <div
                className="rounded-xl px-4 py-3 text-sm leading-relaxed"
                style={{
                  background: tokens.hover?.bg ?? 'rgba(0,0,0,0.02)',
                  border: `1px solid ${tokens.card.border}`,
                  color: tokens.text.secondary,
                }}
              >
                {assessment.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end px-5 py-3 border-t flex-shrink-0"
          style={{ borderColor: tokens.card.border }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 hover:scale-[1.02]"
            style={{
              background: tokens.hover?.bg ?? 'rgba(0,0,0,0.05)',
              color: tokens.text.secondary,
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
