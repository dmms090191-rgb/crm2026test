import { useRef, useState } from 'react';
import { Eraser, Palette } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { PRESET_COLORS, REMOVE_BG_COST, type EditorAction } from './logoEditorHelpers';
import { hexToRgb } from './logoEditorHelpers';

interface Props {
  selectedAction: EditorAction;
  setSelectedAction: (a: EditorAction) => void;
  selectedColorIdx: number;
  setSelectedColorIdx: (i: number) => void;
  customColor: string;
  setCustomColor: (c: string) => void;
  useCustom: boolean;
  setUseCustom: (v: boolean) => void;
  onResetResult: () => void;
}

export default function LogoEditorActionSelector({
  selectedAction, setSelectedAction,
  selectedColorIdx, setSelectedColorIdx,
  customColor, setCustomColor, useCustom, setUseCustom,
  onResetResult,
}: Props) {
  const t = useThemeTokens();
  const colorPickerRef = useRef<HTMLInputElement>(null);

  const actionBtnStyle = (active: boolean) => ({
    background: active ? 'rgba(14,165,233,0.06)' : t.surface.secondary,
    border: `1px solid ${active ? 'rgba(14,165,233,0.3)' : t.surface.border}`,
    color: active ? '#0284c7' : t.text.tertiary,
  });

  return (
    <>
      {/* Action selector */}
      <div>
        <p className="text-[11px] font-semibold mb-2.5" style={{ color: t.text.secondary }}>Action</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => { setSelectedAction('remove-background'); onResetResult(); }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left"
            style={actionBtnStyle(selectedAction === 'remove-background')}
          >
            <Eraser className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold block">Rendre transparent</span>
              <span className="text-[10px] opacity-70 block mt-0.5">Supprime l'arriere-plan</span>
            </div>
            <CostBadge cost={REMOVE_BG_COST} />
          </button>

          <button
            type="button"
            onClick={() => { setSelectedAction('replace-background'); onResetResult(); }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left"
            style={actionBtnStyle(selectedAction === 'replace-background')}
          >
            <Palette className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold block">Changer le fond</span>
              <span className="text-[10px] opacity-70 block mt-0.5">Suppression + couleur unie</span>
            </div>
            <CostBadge cost={REMOVE_BG_COST} />
          </button>
        </div>
      </div>

      {/* Color picker */}
      {selectedAction === 'replace-background' && (
        <div>
          <p className="text-[11px] font-semibold mb-2.5" style={{ color: t.text.secondary }}>
            Couleur d'arriere-plan
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c, idx) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => { setSelectedColorIdx(idx); setUseCustom(false); onResetResult(); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
                style={{
                  background: t.surface.secondary,
                  border: `1px solid ${!useCustom && selectedColorIdx === idx ? '#0ea5e9' : t.surface.border}`,
                  color: !useCustom && selectedColorIdx === idx ? '#0284c7' : t.text.tertiary,
                }}
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{
                    background: c.hex,
                    border: !useCustom && selectedColorIdx === idx
                      ? '2px solid #0ea5e9'
                      : c.hex === '#ffffff' ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(0,0,0,0.05)',
                    boxShadow: !useCustom && selectedColorIdx === idx ? '0 0 0 2px rgba(14,165,233,0.15)' : 'none',
                  }}
                />
                {c.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => { setUseCustom(true); onResetResult(); colorPickerRef.current?.click(); }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
              style={{
                background: t.surface.secondary,
                border: `1px solid ${useCustom ? '#0ea5e9' : t.surface.border}`,
                color: useCustom ? '#0284c7' : t.text.tertiary,
              }}
            >
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{
                  background: useCustom ? customColor : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  border: useCustom ? '2px solid #0ea5e9' : 'none',
                  boxShadow: useCustom ? '0 0 0 2px rgba(14,165,233,0.15)' : 'none',
                }}
              />
              {useCustom ? 'Personnalisee' : 'Autre'}
            </button>
            <input
              ref={colorPickerRef}
              type="color"
              value={customColor}
              onChange={e => { setCustomColor(e.target.value); setUseCustom(true); onResetResult(); }}
              className="w-0 h-0 opacity-0 absolute"
              tabIndex={-1}
            />
          </div>
        </div>
      )}
    </>
  );
}

function CostBadge({ cost }: { cost: number }) {
  return (
    <span
      className="px-2 py-1 rounded-lg text-[9px] font-bold flex-shrink-0"
      style={{ background: 'rgba(22,163,106,0.06)', color: '#16a34a' }}
    >
      {cost} unites
    </span>
  );
}
