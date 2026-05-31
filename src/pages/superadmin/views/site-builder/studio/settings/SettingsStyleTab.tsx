import { Palette, RotateCcw, Lock } from 'lucide-react';
import type { ThemeTokens } from '../../../../../../lib/themeTokensTypes';
import type { SectionConfig } from '../templateSectionsConfig';

const STYLE_LABELS: Record<string, string> = {
  background_color: 'Couleur de fond',
  text_color: 'Couleur du texte',
  accent_color: 'Couleur d\'accent',
};

interface Props {
  section: SectionConfig;
  t: ThemeTokens;
  values?: Record<string, string>;
  onChange?: (styleKey: string, value: string) => void;
}

export default function SettingsStyleTab({ section, t, values, onChange }: Props) {
  const effectiveStyles = { ...section.defaultStyles, ...(values ?? {}) };
  const styleEntries = Object.entries(effectiveStyles);

  if (styleEntries.length === 0) {
    return (
      <div className="flex flex-col items-center py-8">
        <Palette className="w-5 h-5 mb-2" style={{ color: t.text.quaternary }} />
        <p className="text-[10px] text-center" style={{ color: t.text.quaternary }}>
          Les styles editables seront disponibles prochainement.
        </p>
      </div>
    );
  }

  const editable = !!onChange;

  return (
    <div className="space-y-2.5">
      {styleEntries.map(([key, value]) => {
        const defaultVal = section.defaultStyles[key] ?? '';
        const isModified = editable && value !== defaultVal;
        return (
          <div key={key} className="flex items-center gap-2.5">
            <label className="relative w-7 h-7 rounded-lg border flex-shrink-0 overflow-hidden" style={{ borderColor: isModified ? 'rgba(14,165,233,0.3)' : t.surface.border }}>
              <div className="w-full h-full" style={{ background: value }} />
              {editable ? (
                <input
                  type="color"
                  value={value}
                  onChange={e => onChange?.(key, e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              ) : null}
            </label>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold" style={{ color: t.text.tertiary }}>
                {STYLE_LABELS[key] ?? key}
                {isModified && <span className="ml-1 text-[8px] font-bold" style={{ color: '#f59e0b' }}>*</span>}
              </p>
              <p className="text-[9px] font-mono" style={{ color: t.text.quaternary }}>{value}</p>
            </div>
            {isModified ? (
              <button
                onClick={() => onChange?.(key, defaultVal)}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
                style={{ color: '#ef4444' }}
                title="Reinitialiser"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            ) : !editable ? (
              <Lock className="w-2.5 h-2.5 flex-shrink-0" style={{ color: t.text.quaternary }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
