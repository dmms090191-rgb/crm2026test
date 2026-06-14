import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { BgMode } from './mesLogosTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  initialMode: BgMode;
  initialColor1: string;
  initialColor2: string;
  logoUrl: string;
  onSave: (mode: BgMode, color1: string, color2: string) => void;
}

const CHECKER_CSS = `repeating-conic-gradient(#d1d5db 0% 25%, #f3f4f6 0% 50%) 0 0 / 20px 20px`;

function buildBg(mode: BgMode, c1: string, c2: string): string {
  if (mode === 'checker') return CHECKER_CSS;
  if (mode === 'gradient') return `linear-gradient(135deg, ${c1}, ${c2})`;
  return c1;
}

const MODE_OPTIONS: { value: BgMode; label: string }[] = [
  { value: 'checker', label: 'Damier' },
  { value: 'solid', label: 'Couleur unique' },
  { value: 'gradient', label: 'Dégradé' },
];

export default function LogoBgModal({ open, onClose, initialMode, initialColor1, initialColor2, logoUrl, onSave }: Props) {
  const t = useThemeTokens();
  const [mode, setMode] = useState<BgMode>(initialMode);
  const [color1, setColor1] = useState(initialColor1);
  const [color2, setColor2] = useState(initialColor2);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: t.card.border }}>
          <h3 className="text-lg font-semibold" style={{ color: t.card.title }}>
            Modifier l'arrière-plan
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity">
            <X className="w-5 h-5" style={{ color: t.card.subtitle }} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div
            className="w-full h-48 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300"
            style={{ background: buildBg(mode, color1, color2) }}
          >
            <img src={logoUrl} alt="Preview" className="max-h-36 max-w-[80%] object-contain drop-shadow-lg" />
          </div>

          <div className="flex gap-2">
            {MODE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className="flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: mode === opt.value ? t.button.primaryBg : t.card.bg,
                  color: mode === opt.value ? t.button.primaryText : t.card.subtitle,
                  border: `1px solid ${mode === opt.value ? 'transparent' : t.card.border}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {mode === 'solid' && (
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: t.card.subtitle }}>Couleur</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color1}
                  onChange={e => setColor1(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={color1}
                  onChange={e => setColor1(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ background: t.input?.bg || t.card.bg, color: t.card.title, border: `1px solid ${t.card.border}` }}
                />
              </div>
            </div>
          )}

          {mode === 'gradient' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: t.card.subtitle }}>Couleur 1</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={color1} onChange={e => setColor1(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
                  <input type="text" value={color1} onChange={e => setColor1(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm"
                    style={{ background: t.input?.bg || t.card.bg, color: t.card.title, border: `1px solid ${t.card.border}` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: t.card.subtitle }}>Couleur 2</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={color2} onChange={e => setColor2(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
                  <input type="text" value={color2} onChange={e => setColor2(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm"
                    style={{ background: t.input?.bg || t.card.bg, color: t.card.title, border: `1px solid ${t.card.border}` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: t.card.border }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: t.card.subtitle, border: `1px solid ${t.card.border}` }}
          >
            Annuler
          </button>
          <button
            onClick={() => { onSave(mode, color1, color2); onClose(); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: t.button.primaryBg, color: t.button.primaryText }}
          >
            <Check className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
