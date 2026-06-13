import { useState, useRef, useCallback, useEffect } from 'react';
import { Palette, Pipette, X } from 'lucide-react';

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
  const toH = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toH(r)}${toH(g)}${toH(b)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export default function CalquerLogoBgPicker({ value, onChange, inline }: { value: string; onChange: (v: string) => void; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(value === 'checker' ? '#0f172a' : value));
  const [hexInput, setHexInput] = useState(() => value === 'checker' ? '#0f172a' : value);
  const satRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragSat = useRef(false);
  const dragHue = useRef(false);

  const applyColor = useCallback((next: { h: number; s: number; v: number }) => {
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  const updateSat = useCallback((cx: number, cy: number) => {
    const el = satRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (cx - r.left) / r.width));
    const v = Math.max(0, Math.min(1, 1 - (cy - r.top) / r.height));
    applyColor({ ...hsv, s, v });
  }, [hsv, applyColor]);

  const updateHue = useCallback((cx: number) => {
    const el = hueRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const h = Math.max(0, Math.min(359.99, ((cx - r.left) / r.width) * 360));
    applyColor({ ...hsv, h });
  }, [hsv, applyColor]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragSat.current) updateSat(e.clientX, e.clientY);
      if (dragHue.current) updateHue(e.clientX);
    };
    const onUp = () => { dragSat.current = false; dragHue.current = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [updateSat, updateHue]);

  const handleHexCommit = useCallback(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(hexInput)) {
      setHsv(hexToHsv(hexInput));
      onChange(hexInput);
    }
  }, [hexInput, onChange]);

  const handleEyeDropper = useCallback(async () => {
    if (!('EyeDropper' in window)) return;
    try {
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      const hex = result.sRGBHex as string;
      setHsv(hexToHsv(hex));
      setHexInput(hex);
      onChange(hex);
    } catch { /* user cancelled */ }
  }, [onChange]);

  const hueColor = hsvToHex(hsv.h, 1, 1);
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  const pickerContent = (
    <>
      <div className={inline ? '' : 'px-2.5 pt-2.5'}>
        <div ref={satRef}
          className="relative w-full rounded-lg cursor-crosshair select-none"
          style={{
            height: inline ? 90 : 120,
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onPointerDown={e => {
            dragSat.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateSat(e.clientX, e.clientY);
          }}>
          <div className="absolute w-3.5 h-3.5 rounded-full pointer-events-none"
            style={{
              left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`,
              transform: 'translate(-50%, -50%)',
              border: '2px solid #fff',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.3)',
              background: currentHex,
            }} />
        </div>
      </div>
      <div className={inline ? 'pt-2' : 'px-2.5 pt-2'}>
        <div ref={hueRef}
          className="relative w-full h-3 rounded-full cursor-pointer select-none"
          style={{
            background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onPointerDown={e => {
            dragHue.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateHue(e.clientX);
          }}>
          <div className="absolute top-1/2 w-3.5 h-3.5 rounded-full pointer-events-none"
            style={{
              left: `${(hsv.h / 360) * 100}%`, transform: 'translate(-50%, -50%)',
              border: '2px solid #fff',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.25)',
              background: hueColor,
            }} />
        </div>
      </div>
      <div className={`flex items-center gap-2 ${inline ? 'pt-2' : 'px-2.5 pt-2 pb-2.5'}`}>
        <div className="w-7 h-7 rounded-md flex-shrink-0" style={{ background: currentHex, border: '1px solid rgba(255,255,255,0.15)' }} />
        <input value={hexInput}
          onChange={e => setHexInput(e.target.value)}
          onBlur={handleHexCommit}
          onKeyDown={e => e.key === 'Enter' && handleHexCommit()}
          className="flex-1 min-w-0 px-2 py-1.5 rounded-md text-[11px] font-mono"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226,232,240,0.9)', outline: 'none' }}
          maxLength={7} />
        {'EyeDropper' in window && (
          <button onClick={handleEyeDropper} title="Pipette"
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Pipette className="w-3.5 h-3.5" style={{ color: 'rgba(226,232,240,0.7)' }} />
          </button>
        )}
      </div>
    </>
  );

  if (inline) {
    return <div className="space-y-0">{pickerContent}</div>;
  }

  return (
    <div className="space-y-1.5">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150"
        style={{
          background: open ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
          color: open ? '#60a5fa' : 'rgba(226,232,240,0.8)',
        }}>
        <Palette className="w-3.5 h-3.5" />
        Changer arriere-plan
      </button>
      {open && (
        <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between px-2.5 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-[10px] font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>Couleur de fond</span>
            <div className="flex items-center gap-1">
              <button onClick={() => { onChange('checker'); setOpen(false); }}
                className="px-2 py-1 rounded text-[9px] font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.6)' }}>
                Damier
              </button>
              <button onClick={() => setOpen(false)}
                className="w-6 h-6 rounded flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X className="w-3 h-3" style={{ color: 'rgba(226,232,240,0.5)' }} />
              </button>
            </div>
          </div>
          {pickerContent}
        </div>
      )}
    </div>
  );
}
