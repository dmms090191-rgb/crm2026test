import { useState, useEffect } from 'react';
import { Plus, Save, RotateCcw } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import type { GradientConfig } from './studioSectionTypes';
import { gradientToCss } from './gradientHelpers';

const STORAGE_KEY = 'talvex_studio_saved_gradients';
const MAX_PRESETS = 4;

type SavedPreset = GradientConfig | null;

function loadPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return Array(MAX_PRESETS).fill(null);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Array(MAX_PRESETS).fill(null);
    const result: SavedPreset[] = [];
    for (let i = 0; i < MAX_PRESETS; i++) {
      const p = parsed[i];
      if (p && typeof p === 'object' && p.color1 && p.color2) result.push(p as GradientConfig);
      else result.push(null);
    }
    return result;
  } catch {
    return Array(MAX_PRESETS).fill(null);
  }
}

function savePresetsToStorage(presets: SavedPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

interface Props {
  currentGradient: GradientConfig | null;
  onApplyPreset: (preset: GradientConfig) => void;
  t: ThemeTokens;
}

export default function GradientSavedPresets({ currentGradient, onApplyPreset, t }: Props) {
  const [presets, setPresets] = useState<SavedPreset[]>(loadPresets);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    savePresetsToStorage(presets);
  }, [presets]);

  const handleSave = () => {
    if (!currentGradient) {
      setMessage('Activez un degrade pour l\'enregistrer.');
      setTimeout(() => setMessage(null), 2500);
      return;
    }
    const idx = presets.findIndex(p => p === null);
    if (idx === -1) {
      setMessage('Les 4 degrades sont deja enregistres.');
      setTimeout(() => setMessage(null), 2500);
      return;
    }
    const next = [...presets];
    next[idx] = { ...currentGradient, showGuideLine: false, showBalanceLine: false };
    setPresets(next);
    setMessage('Degrade enregistre !');
    setTimeout(() => setMessage(null), 2000);
  };

  const handleRemove = (idx: number) => {
    const next = [...presets];
    next[idx] = null;
    setPresets(next);
  };

  return (
    <div>
      <label className="text-[10px] font-semibold mb-1.5 block" style={{ color: t.text.tertiary }}>
        Mes degrades
      </label>

      <div className="grid grid-cols-4 gap-1.5">
        {presets.map((preset, i) => {
          if (!preset) {
            return (
              <div key={i} className="flex flex-col items-center gap-1 p-1.5 rounded-lg" style={{ border: `1px solid ${t.surface.border}` }}>
                <button
                  className="w-full aspect-square rounded-md flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: t.surface.secondary,
                    border: `1.5px dashed ${t.surface.border}`,
                  }}
                  onClick={handleSave}
                  title="Enregistrer le degrade actuel"
                >
                  <Plus className="w-4 h-4" style={{ color: t.text.quaternary, opacity: 0.5 }} />
                </button>
                <span className="text-[7px] font-medium truncate w-full text-center leading-tight" style={{ color: t.text.quaternary }}>
                  Vide
                </span>
              </div>
            );
          }

          const preview = gradientToCss(preset);
          return (
            <div key={i} className="flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all"
              style={{ border: `1px solid ${t.surface.border}` }}
            >
              <button
                onClick={() => onApplyPreset(preset)}
                className="w-full aspect-square rounded-md relative transition-all hover:scale-105 active:scale-95"
                style={{
                  background: preview,
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }}
                title={`${preset.color1} → ${preset.color2}`}
              />
              <span className="text-[7px] font-medium truncate w-full text-center leading-tight" style={{ color: t.text.quaternary }}>
                {preset.color1.toUpperCase().slice(1)}
              </span>
              <button
                onClick={() => handleRemove(i)}
                className="w-full mt-0.5 px-1 py-1 rounded-md text-[7px] font-semibold text-center transition-all hover:scale-[1.04] active:scale-[0.96]"
                style={{
                  background: t.surface.secondary,
                  border: `1px solid ${t.surface.border}`,
                  color: t.text.tertiary,
                }}
                title="Vider cette case"
              >
                <span className="flex items-center justify-center gap-0.5">
                  <RotateCcw className="w-2.5 h-2.5" />
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-1.5 mt-2 px-3 py-2.5 rounded-xl text-[10px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(6,182,212,0.03))',
          border: '1.5px solid rgba(14,165,233,0.2)',
          color: '#0ea5e9',
        }}
      >
        <Save className="w-3.5 h-3.5" />
        Enregistrer ce degrade
      </button>

      {message && (
        <p
          className="text-[9px] mt-1.5 text-center font-medium"
          style={{ color: message.includes('!') ? '#16a34a' : '#f59e0b' }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
