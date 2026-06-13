import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function CalquerLogoStrokeColorPicker({ color, onChange, onClose }: Props) {
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(color));
  const [hexInput, setHexInput] = useState(color);
  const areaRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'area' | 'hue' | null>(null);

  useEffect(() => {
    const newHsv = hexToHsv(color);
    setHsv(newHsv);
    setHexInput(color);
  }, [color]);

  const emitColor = useCallback((h: number, s: number, v: number) => {
    const hex = hsvToHex(h, s, v);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  const handleAreaMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    setHsv(prev => { emitColor(prev[0], s, v); return [prev[0], s, v]; });
  }, [emitColor]);

  const handleHueMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
    setHsv(prev => { emitColor(h, prev[1], prev[2]); return [h, prev[1], prev[2]]; });
  }, [emitColor]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current === 'area') handleAreaMove(e);
      else if (dragging.current === 'hue') handleHueMove(e);
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [handleAreaMove, handleHueMove]);

  const handleHexSubmit = () => {
    const cleaned = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      onChange(cleaned);
      setHsv(hexToHsv(cleaned));
    } else {
      setHexInput(color);
    }
  };

  const hueColor = hsvToHex(hsv[0], 1, 1);

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
          Couleur du trait
        </span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10">
          <X className="w-3.5 h-3.5" style={{ color: 'rgba(148,163,184,0.7)' }} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div ref={areaRef} className="relative w-full h-36 rounded-md cursor-crosshair select-none"
          style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
          onMouseDown={e => { dragging.current = 'area'; handleAreaMove(e); }}>
          <div className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${hsv[1] * 100}%`, top: `${(1 - hsv[2]) * 100}%`, background: hsvToHex(hsv[0], hsv[1], hsv[2]) }} />
        </div>

        <div ref={hueRef} className="relative w-full h-3 rounded-full cursor-pointer select-none"
          style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
          onMouseDown={e => { dragging.current = 'hue'; handleHueMove(e); }}>
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none"
            style={{ left: `${(hsv[0] / 360) * 100}%`, background: hueColor }} />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md border" style={{ background: color, borderColor: 'rgba(255,255,255,0.1)' }} />
          <div className="flex-1 flex items-center gap-1">
            <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.5)' }}>HEX</span>
            <input value={hexInput} onChange={e => setHexInput(e.target.value)}
              onBlur={handleHexSubmit} onKeyDown={e => { if (e.key === 'Enter') handleHexSubmit(); }}
              className="flex-1 text-[11px] font-mono px-2 py-1 rounded bg-transparent border outline-none"
              style={{ color: 'rgba(226,232,240,0.9)', borderColor: 'rgba(255,255,255,0.1)' }}
              maxLength={7} />
          </div>
        </div>
      </div>
    </div>
  );
}
