import { Type, Hexagon } from 'lucide-react';
import { V3_STYLES, type LogoType, type RecraftStyle } from './logoAiConstants';

interface Props {
  brandName: string;
  setBrandName: (v: string) => void;
  logoType: LogoType;
  setLogoType: (v: LogoType) => void;
  recraftStyle: RecraftStyle;
  setRecraftStyle: (v: RecraftStyle) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  btnStyle: (active: boolean) => React.CSSProperties;
  surfaceSecondary: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  textQuaternary: string;
}

export default function LogoAiV3Controls({
  brandName, setBrandName, logoType, setLogoType,
  recraftStyle, setRecraftStyle, prompt, setPrompt,
  btnStyle, surfaceSecondary, surfaceBorder,
  textPrimary, textSecondary, textQuaternary,
}: Props) {
  const logoTypes: { id: LogoType; label: string; icon: React.ReactNode }[] = [
    { id: 'symbol_and_text', label: 'Logo avec texte', icon: <Type className="w-3.5 h-3.5" /> },
    { id: 'symbol_only', label: 'Symbole seul', icon: <Hexagon className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {/* Brand name */}
      <div>
        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textSecondary }}>Nom de marque</label>
        <input
          type="text"
          value={brandName}
          onChange={e => setBrandName(e.target.value)}
          placeholder="Ex : Talvex"
          maxLength={60}
          disabled={logoType === 'symbol_only'}
          className="w-full rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-all disabled:opacity-40"
          style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textPrimary }}
          onFocus={e => { e.currentTarget.style.borderColor = '#0ea5e9'; }}
          onBlur={e => { e.currentTarget.style.borderColor = surfaceBorder; }}
        />
      </div>

      {/* Logo type */}
      <div>
        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textSecondary }}>Type de logo</label>
        <div className="flex gap-2">
          {logoTypes.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLogoType(opt.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
              style={btnStyle(logoType === opt.id)}
            >
              {opt.icon}{opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recraft style */}
      <div>
        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textSecondary }}>Style Recraft</label>
        <div className="grid grid-cols-3 gap-2">
          {V3_STYLES.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRecraftStyle(opt.id)}
              className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[10px] font-semibold transition-all"
              style={btnStyle(recraftStyle === opt.id)}
            >
              {opt.icon}{opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div>
        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textSecondary }}>Description du logo</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Ex : logo minimaliste, couleurs bleu marine et cyan, symbole geometrique."
          rows={3}
          maxLength={800}
          className="w-full rounded-xl px-4 py-3 text-xs resize-none focus:outline-none transition-all"
          style={{ background: surfaceSecondary, border: `1px solid ${surfaceBorder}`, color: textPrimary }}
          onFocus={e => { e.currentTarget.style.borderColor = '#0ea5e9'; }}
          onBlur={e => { e.currentTarget.style.borderColor = surfaceBorder; }}
        />
        <span className="text-[10px] mt-0.5 block" style={{ color: textQuaternary }}>{prompt.length}/800</span>
      </div>
    </>
  );
}
