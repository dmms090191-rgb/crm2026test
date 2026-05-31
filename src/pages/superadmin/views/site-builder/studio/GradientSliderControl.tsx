import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';

interface Props {
  label: string;
  icon?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  accentColor: string;
  t: ThemeTokens;
}

export default function GradientSliderControl({
  label, icon, value, min, max, onChange, accentColor, t,
}: Props) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-semibold flex items-center gap-1" style={{ color: t.text.tertiary }}>
          {icon}
          {label}
        </label>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
          style={{ background: `${accentColor}14`, color: accentColor, border: `1px solid ${accentColor}33` }}
        >
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${accentColor} ${pct}%, ${t.surface.border} 0%)`,
          accentColor,
        }}
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[7px]" style={{ color: t.text.quaternary }}>{min}%</span>
        <span className="text-[7px]" style={{ color: t.text.quaternary }}>{max}%</span>
      </div>
    </div>
  );
}
