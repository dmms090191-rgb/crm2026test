import { useEffect, useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

export function VCSlider({ label, value, min, max, step = 1, unit = '', onChange }: SliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{label}</label>
        <span className="text-[10px] tabular-nums font-bold" style={{ color: '#e2e8f0' }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-400"
      />
    </div>
  );
}

interface ColorProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function VCColor({ label, value, onChange }: ColorProps) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.length === 7 ? value : '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-9 rounded-lg cursor-pointer"
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={() => onChange(text)}
          className="flex-1 px-2 py-1.5 rounded-lg text-[11px] outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
        />
      </div>
    </div>
  );
}

interface TabsProps<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function VCTabs<T extends string>({ options, value, onChange }: TabsProps<T>) {
  return (
    <div className="flex p-1 rounded-xl gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {options.map(o => {
        const active = o.id === value;
        const style: CSSProperties = active
          ? { background: 'linear-gradient(135deg, #06b6d4, #2563eb)', color: '#fff', boxShadow: '0 4px 14px rgba(34,211,238,0.35)' }
          : { color: '#94a3b8' };
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all duration-200"
            style={style}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
