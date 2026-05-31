import { Lock } from 'lucide-react';
import type { ThemeTokens } from '../../../../../../lib/themeTokensTypes';

const PRESETS = [
  { id: 'none', label: 'Aucun', available: true },
  { id: 'elegant', label: 'Elegant', available: true },
  { id: 'premium', label: 'Premium', available: false },
  { id: 'waouh', label: 'Waouh', available: false },
];

interface Props {
  t: ThemeTokens;
}

export default function SettingsAdvancedTab({ t }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-semibold mb-2 block" style={{ color: t.text.tertiary }}>
          Preset d'animation
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              disabled={!preset.available}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-semibold transition-all"
              style={{
                background: preset.id === 'none'
                  ? 'rgba(14,165,233,0.08)' : t.surface.secondary,
                border: preset.id === 'none'
                  ? '1px solid rgba(14,165,233,0.25)' : `1px solid ${t.surface.border}`,
                color: !preset.available
                  ? t.text.quaternary
                  : preset.id === 'none' ? '#0ea5e9' : t.text.tertiary,
                opacity: preset.available ? 1 : 0.45,
                cursor: preset.available ? 'pointer' : 'not-allowed',
              }}
            >
              {preset.label}
              {!preset.available && <Lock className="w-2.5 h-2.5" />}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[9px]" style={{ color: t.text.quaternary }}>
        Les animations Premium et Waouh seront disponibles dans une prochaine mise a jour.
      </p>
    </div>
  );
}
