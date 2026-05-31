import { useState } from 'react';
import { Lock, Image, RotateCcw } from 'lucide-react';
import type { ThemeTokens } from '../../../../../../lib/themeTokensTypes';
import type { SectionConfig } from '../templateSectionsConfig';

interface Props {
  section: SectionConfig;
  t: ThemeTokens;
  values?: Record<string, string>;
  onChange?: (fieldKey: string, value: string) => void;
  onFieldFocus?: (fieldKey: string) => void;
  onResetSection?: () => void;
}

export default function SettingsContentTab({ section, t, values, onChange, onFieldFocus, onResetSection }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);

  if (section.editableFields.length === 0) {
    return (
      <div className="flex flex-col items-center py-8">
        <Lock className="w-5 h-5 mb-2" style={{ color: t.text.quaternary }} />
        <p className="text-[10px] text-center" style={{ color: t.text.quaternary }}>
          Les champs editables seront disponibles prochainement pour ce template.
        </p>
      </div>
    );
  }

  const editable = !!onChange;

  const hasAnyModifiedField = editable && section.editableFields.some(field => {
    const current = values?.[field.key] ?? '';
    const defaultVal = section.defaultContent[field.key] ?? '';
    return current !== defaultVal;
  });

  return (
    <div className="space-y-2.5">
      {section.editableFields.map(field => {
        const val = values?.[field.key] ?? section.defaultContent[field.key] ?? '';
        const defaultVal = section.defaultContent[field.key] ?? '';
        const isModified = editable && val !== defaultVal;

        return (
          <div key={field.key}>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-[10px] font-semibold flex-1" style={{ color: t.text.tertiary }}>
                {field.label}
                {isModified && (
                  <span className="ml-1 text-[8px] font-bold" style={{ color: '#f59e0b' }}>*</span>
                )}
              </label>
              {isModified && (
                <button
                  onClick={() => onChange?.(field.key, defaultVal)}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all hover:scale-105"
                  style={{
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    color: '#ef4444',
                  }}
                  title="Reinitialiser a la valeur par defaut"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            {field.type === 'textarea' ? (
              <textarea
                readOnly={!editable}
                value={val}
                onChange={e => onChange?.(field.key, e.target.value)}
                onFocus={() => onFieldFocus?.(field.key)}
                placeholder={field.placeholder}
                rows={3}
                className={`w-full px-2.5 py-2 rounded-lg text-[11px] outline-none resize-none ${editable ? 'cursor-text' : 'cursor-default'}`}
                style={{
                  background: t.surface.secondary,
                  border: `1px solid ${isModified ? 'rgba(14,165,233,0.25)' : t.surface.border}`,
                  color: t.text.secondary,
                }}
              />
            ) : field.type === 'image' ? (
              <button
                disabled
                className="w-full flex items-center gap-2 px-2.5 py-3 rounded-lg cursor-not-allowed"
                style={{
                  background: t.surface.secondary,
                  border: `1px dashed ${t.surface.border}`,
                  color: t.text.quaternary,
                }}
              >
                <Image className="w-4 h-4" />
                <span className="text-[10px] font-medium">Changer l'image</span>
                <Lock className="w-2.5 h-2.5 ml-auto" />
              </button>
            ) : (
              <input
                readOnly={!editable}
                value={val}
                onChange={e => onChange?.(field.key, e.target.value)}
                onFocus={() => onFieldFocus?.(field.key)}
                placeholder={field.placeholder}
                className={`w-full px-2.5 py-2 rounded-lg text-[11px] outline-none ${editable ? 'cursor-text' : 'cursor-default'}`}
                style={{
                  background: t.surface.secondary,
                  border: `1px solid ${isModified ? 'rgba(14,165,233,0.25)' : t.surface.border}`,
                  color: t.text.secondary,
                }}
              />
            )}
          </div>
        );
      })}

      {/* Reset section button */}
      {hasAnyModifiedField && onResetSection && (
        <div className="pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: 'rgba(239,68,68,0.04)',
                border: '1px solid rgba(239,68,68,0.12)',
                color: '#ef4444',
              }}
            >
              <RotateCcw className="w-3 h-3" />
              Reinitialiser la section
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-medium flex-1" style={{ color: '#ef4444' }}>
                Etes-vous sur ?
              </span>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold"
                style={{ background: t.surface.secondary, color: t.text.tertiary }}
              >
                Non
              </button>
              <button
                onClick={() => { onResetSection(); setConfirmReset(false); }}
                className="px-2.5 py-1.5 rounded-md text-[10px] font-bold"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444',
                }}
              >
                Oui, reinitialiser
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
