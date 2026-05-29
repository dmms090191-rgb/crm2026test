import { Maximize2, RotateCcw } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { CompanyLogo } from './LogoCard';

interface Props {
  logoScale: number;
  onScaleChange: (v: number) => void;
  activeLogo: CompanyLogo | undefined;
}

export default function LogoListScalePanel({ logoScale, onScaleChange, activeLogo }: Props) {
  const t = useThemeTokens();

  return (
    <div className="rounded-xl px-5 py-4" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Maximize2 className="w-4 h-4" style={{ color: '#0284c7' }} />
          <span className="text-xs font-semibold" style={{ color: t.text.secondary }}>Taille du logo</span>
        </div>

        <div className="flex-1 flex items-center gap-3">
          <span className="text-[10px] font-medium flex-shrink-0" style={{ color: t.text.quaternary }}>30%</span>
          <input
            type="range" min={0.3} max={3} step={0.05} value={logoScale}
            onChange={e => onScaleChange(parseFloat(e.target.value))}
            className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((logoScale - 0.3) / 2.7) * 100}%, ${t.surface.border} ${((logoScale - 0.3) / 2.7) * 100}%, ${t.surface.border} 100%)`,
              accentColor: '#0ea5e9',
            }}
          />
          <span className="text-[10px] font-medium flex-shrink-0" style={{ color: t.text.quaternary }}>300%</span>
        </div>

        <span
          className="text-xs font-bold tabular-nums min-w-[42px] text-center px-2 py-1 rounded-lg"
          style={{ background: 'rgba(14,165,233,0.06)', color: '#0284c7' }}
        >
          {Math.round(logoScale * 100)}%
        </span>

        {logoScale !== 1 && (
          <button
            onClick={() => onScaleChange(1)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}
            title="Reinitialiser a 100%"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {activeLogo && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: t.text.quaternary }}>
            Apercu dans la sidebar
          </p>
          <div
            className="flex items-center justify-center rounded-xl py-3 overflow-hidden"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, height: 64 }}
          >
            <img
              src={activeLogo.url}
              alt="Apercu"
              className="object-contain max-h-[44px] max-w-[180px] transition-transform duration-200"
              style={{ transform: `scale(${logoScale})` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
