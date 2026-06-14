import { useState } from 'react';
import { PaintBucket, Grid3x3, Check, ChevronDown } from 'lucide-react';

const PRESETS = [
  { label: 'Blanc', value: '#ffffff' },
  { label: 'Noir', value: '#000000' },
  { label: 'Rose clair', value: '#fce4ec' },
  { label: 'Transparent', value: null },
] as const;

interface Props {
  bgColor: string | null;
  onBgColorChange: (color: string | null) => void;
}

export default function CalquerLogoSvgTools({ bgColor, onBgColorChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customColor, setCustomColor] = useState('#3b82f6');
  const confirmed = bgColor !== null;
  const color = '#8b5cf6';

  const handlePreset = (value: string | null) => {
    onBgColorChange(value);
    if (value !== null) setShowCustom(false);
  };

  const handleCustomChange = (hex: string) => {
    setCustomColor(hex);
    onBgColorChange(hex);
  };

  const handleValidate = () => {
    setExpanded(false);
    setShowCustom(false);
  };

  const handleToggle = () => {
    if (!expanded) {
      setExpanded(true);
    } else {
      handleValidate();
    }
  };

  const isActive = (value: string | null) => bgColor === value;
  const isCustomActive = bgColor !== null && !PRESETS.some(p => p.value === bgColor);

  return (
    <div className="flex flex-col gap-2">
      <button onClick={handleToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: confirmed ? `${color}12` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${confirmed ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
        }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          {confirmed && !expanded
            ? <Check className="w-4 h-4" style={{ color }} />
            : <PaintBucket className="w-4 h-4" style={{ color }} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate"
            style={{ color: confirmed ? color : 'rgba(226,232,240,0.9)' }}>
            Arriere-plan couleur unie
          </p>
          <p className="text-[9px] truncate" style={{ color: 'rgba(148,163,184,0.5)' }}>
            Choisir un fond visuel derriere le SVG
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
          style={{ color: 'rgba(148,163,184,0.4)', transform: expanded ? 'rotate(180deg)' : 'none' }} />
      </button>

      {expanded && (
        <div className="flex flex-col gap-1.5 pl-2 pr-1"
>
          <div className="grid grid-cols-2 gap-1">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => handlePreset(p.value)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-150 hover:scale-[1.02]"
                style={{
                  background: isActive(p.value) ? `${color}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive(p.value) ? `${color}50` : 'rgba(255,255,255,0.06)'}`,
                  color: isActive(p.value) ? color : 'rgba(203,213,225,0.7)',
                }}>
                {p.value === null ? (
                  <Grid3x3 className="w-3 h-3 shrink-0" style={{ opacity: 0.5 }} />
                ) : (
                  <span className="w-3 h-3 rounded-sm shrink-0 border"
                    style={{
                      background: p.value,
                      borderColor: p.value === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    }} />
                )}
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setShowCustom(v => !v); if (!showCustom) onBgColorChange(customColor); }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-150"
            style={{
              background: isCustomActive || showCustom ? `${color}15` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isCustomActive || showCustom ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
              color: isCustomActive || showCustom ? color : 'rgba(203,213,225,0.7)',
            }}>
            <span className="w-3 h-3 rounded-sm shrink-0 border"
              style={{ background: customColor, borderColor: 'rgba(255,255,255,0.15)' }} />
            Couleur personnalisee
          </button>

          {showCustom && (
            <div className="flex items-center gap-2 px-2">
              <input type="color" value={customColor}
                onChange={e => handleCustomChange(e.target.value)}
                className="w-7 h-7 rounded border-0 cursor-pointer"
                style={{ background: 'transparent' }} />
              <span className="text-[9px] font-mono" style={{ color: 'rgba(148,163,184,0.5)' }}>
                {customColor}
              </span>
            </div>
          )}

          <button onClick={handleValidate}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-[1.02] mt-1"
            style={{
              background: `linear-gradient(135deg, ${color} 0%, #7c3aed 100%)`,
              color: '#fff',
              boxShadow: `0 2px 6px ${color}40`,
            }}>
            <Check className="w-3.5 h-3.5" />
            Valider
          </button>
        </div>
      )}
    </div>
  );
}
