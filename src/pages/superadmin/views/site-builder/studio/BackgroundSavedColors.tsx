import { Check, Plus } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import { isLightColor } from './backgroundPanelHelpers';

interface Props {
  customColors: (string | null)[];
  currentColor: string;
  onApplyColor: (color: string) => void;
  onSaveCustomColor: () => void;
  onRemoveCustomColor: (idx: number) => void;
  saveMessage: string | null;
  t: ThemeTokens;
}

export default function BackgroundSavedColors({
  customColors, currentColor, onApplyColor, onSaveCustomColor, onRemoveCustomColor, saveMessage, t,
}: Props) {
  return (
    <div>
      <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: t.text.tertiary }}>
        Mes couleurs
      </label>
      <div className="grid grid-cols-4 gap-1.5">
        {customColors.map((c, i) => {
          if (!c) {
            return (
              <div key={i} className="flex flex-col items-center gap-1 p-1.5 rounded-lg" style={{ border: `1px solid ${t.surface.border}` }}>
                <button
                  className="w-full aspect-square rounded-md flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: t.surface.secondary,
                    border: `1.5px dashed ${t.surface.border}`,
                  }}
                  onClick={onSaveCustomColor}
                  title="Enregistrer la couleur actuelle"
                >
                  <Plus className="w-4 h-4" style={{ color: t.text.quaternary, opacity: 0.5 }} />
                </button>
                <span className="text-[7px] font-medium truncate w-full text-center leading-tight" style={{ color: t.text.quaternary }}>
                  Vide
                </span>
              </div>
            );
          }
          const selected = currentColor.toLowerCase() === c.toLowerCase();
          const cLight = isLightColor(c);
          return (
            <div key={i} className="flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all"
              style={{
                background: selected ? 'rgba(14,165,233,0.08)' : 'transparent',
                border: selected ? '1px solid rgba(14,165,233,0.3)' : `1px solid ${t.surface.border}`,
              }}
            >
              <button
                onClick={() => onApplyColor(c)}
                className="w-full aspect-square rounded-md relative transition-all hover:scale-105 active:scale-95"
                style={{
                  background: c,
                  border: cLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: selected ? '0 0 8px rgba(14,165,233,0.3)' : 'none',
                }}
                title={c.toUpperCase()}
              >
                {selected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: cLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }}
                    >
                      <Check className="w-2.5 h-2.5" style={{ color: cLight ? '#0ea5e9' : '#ffffff' }} />
                    </div>
                  </div>
                )}
              </button>
              <span className="text-[7px] font-medium truncate w-full text-center leading-tight" style={{ color: selected ? '#0ea5e9' : t.text.quaternary }}>
                {c.toUpperCase().slice(1)}
              </span>
              <button
                onClick={() => onRemoveCustomColor(i)}
                className="w-full mt-0.5 px-1 py-1 rounded-md text-[7px] font-semibold text-center transition-all hover:scale-[1.04] active:scale-[0.96]"
                style={{
                  background: t.surface.secondary,
                  border: `1px solid ${t.surface.border}`,
                  color: t.text.tertiary,
                }}
                title="Vider cette case"
              >
                Reinitialiser
              </button>
            </div>
          );
        })}
      </div>

      {saveMessage && (
        <p
          className="text-[9px] mt-1.5 text-center font-medium"
          style={{ color: saveMessage.includes('!') ? '#16a34a' : '#f59e0b' }}
        >
          {saveMessage}
        </p>
      )}
    </div>
  );
}
