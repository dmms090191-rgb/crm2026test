import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';

interface BalanceSliderProps {
  value: number;
  color1: string;
  color2: string;
  onChange: (value: number) => void;
  t: ThemeTokens;
}

export function GradientBalanceSlider({ value, color1, color2, onChange, t }: BalanceSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <label className="text-[10px] font-semibold" style={{ color: t.text.tertiary }}>
          Repartition des couleurs
        </label>
        <span
          className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-md"
          style={{
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.15)',
            color: '#10b981',
          }}
        >
          {Math.round(value)}%
        </span>
      </div>
      <div className="relative group">
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
        >
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${value}%`,
              background: `linear-gradient(90deg, ${color1}, ${color2})`,
            }}
          />
        </div>
        <input
          type="range" min={0} max={100} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ margin: 0 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-md pointer-events-none transition-all duration-75 group-hover:scale-110"
          style={{
            left: `calc(${value}% - 8px)`,
            background: '#10b981',
            border: '2px solid #fff',
            boxShadow: '0 1px 6px rgba(16,185,129,0.4)',
          }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[8px]" style={{ color: t.text.quaternary }}>Couleur 1</span>
        <span className="text-[8px]" style={{ color: t.text.quaternary }}>Equilibre</span>
        <span className="text-[8px]" style={{ color: t.text.quaternary }}>Couleur 2</span>
      </div>
    </div>
  );
}

interface StrengthSliderProps {
  value: number;
  onChange: (value: number) => void;
  t: ThemeTokens;
}

export function GradientStrengthSlider({ value, onChange, t }: StrengthSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <label className="text-[10px] font-semibold" style={{ color: t.text.tertiary }}>
          Nettete
        </label>
        <span
          className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-md"
          style={{
            background: 'rgba(14,165,233,0.06)',
            border: '1px solid rgba(14,165,233,0.15)',
            color: '#0ea5e9',
          }}
        >
          {Math.round(value)}%
        </span>
      </div>
      <div className="relative group">
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
        >
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${value}%`,
              background: 'linear-gradient(90deg, rgba(14,165,233,0.4), #0ea5e9)',
            }}
          />
        </div>
        <input
          type="range" min={0} max={100} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ margin: 0 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-md pointer-events-none transition-all duration-75 group-hover:scale-110"
          style={{
            left: `calc(${value}% - 8px)`,
            background: '#0ea5e9',
            border: '2px solid #fff',
            boxShadow: '0 1px 6px rgba(14,165,233,0.4)',
          }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[8px]" style={{ color: t.text.quaternary }}>Doux</span>
        <span className="text-[8px]" style={{ color: t.text.quaternary }}>Marque</span>
      </div>
    </div>
  );
}
