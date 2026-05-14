import { useState, useRef, useEffect } from 'react';
import { Clock, Check, X } from 'lucide-react';
import { useThemeTokens } from '../hooks/useThemeTokens';

interface TimePickerInlineProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function TimePickerInline({ value, onChange, className, style }: TimePickerInlineProps) {
  const tokens = useThemeTokens();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentHour = value ? parseInt(value.split(':')[0], 10) : 9;
  const currentMinute = value ? parseInt(value.split(':')[1], 10) : 0;

  const [selHour, setSelHour] = useState(currentHour);
  const [selMinute, setSelMinute] = useState(currentMinute);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSelHour(currentHour);
      setSelMinute(currentMinute);
      setTimeout(() => {
        hourRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' });
        minuteRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' });
      }, 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleConfirm() {
    const closest = MINUTES.reduce((prev, curr) =>
      Math.abs(curr - selMinute) < Math.abs(prev - selMinute) ? curr : prev
    );
    onChange(`${pad(selHour)}:${pad(closest)}`);
    setOpen(false);
  }

  const displayValue = value || '--:--';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={className}
        style={style}
      >
        <span className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
          <span>{displayValue}</span>
        </span>
      </button>

      {open && (
        <div
          className="absolute z-[60] mt-1 left-0 right-0 sm:left-auto sm:right-auto sm:w-56 rounded-xl overflow-hidden shadow-xl"
          style={{
            background: tokens.modal.bg,
            border: `1px solid ${tokens.modal.border}`,
            minWidth: '100%',
          }}
        >
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${tokens.card.border}` }}>
            <span className="text-xs font-semibold" style={{ color: tokens.text.primary }}>
              {pad(selHour)}:{pad(MINUTES.reduce((prev, curr) => Math.abs(curr - selMinute) < Math.abs(prev - selMinute) ? curr : prev))}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ color: tokens.text.tertiary }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex" style={{ height: '160px' }}>
            <div
              ref={hourRef}
              className="flex-1 overflow-y-auto overscroll-contain py-1 px-1"
              style={{ borderRight: `1px solid ${tokens.card.border}` }}
            >
              <p className="text-[9px] font-bold uppercase tracking-wider text-center mb-1 sticky top-0 z-10 py-0.5" style={{ color: tokens.text.quaternary, background: tokens.modal.bg }}>H</p>
              {HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  data-selected={h === selHour}
                  onClick={() => setSelHour(h)}
                  className="w-full text-center py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    background: h === selHour ? tokens.accent.bg : 'transparent',
                    color: h === selHour ? tokens.accent.text : tokens.text.secondary,
                    border: h === selHour ? `1px solid ${tokens.accent.border}` : '1px solid transparent',
                  }}
                >
                  {pad(h)}
                </button>
              ))}
            </div>

            <div
              ref={minuteRef}
              className="flex-1 overflow-y-auto overscroll-contain py-1 px-1"
            >
              <p className="text-[9px] font-bold uppercase tracking-wider text-center mb-1 sticky top-0 z-10 py-0.5" style={{ color: tokens.text.quaternary, background: tokens.modal.bg }}>Min</p>
              {MINUTES.map(m => (
                <button
                  key={m}
                  type="button"
                  data-selected={m === selMinute}
                  onClick={() => setSelMinute(m)}
                  className="w-full text-center py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    background: m === selMinute ? tokens.accent.bg : 'transparent',
                    color: m === selMinute ? tokens.accent.text : tokens.text.secondary,
                    border: m === selMinute ? `1px solid ${tokens.accent.border}` : '1px solid transparent',
                  }}
                >
                  {pad(m)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2" style={{ borderTop: `1px solid ${tokens.card.border}` }}>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'linear-gradient(90deg, #0ea5e9, #22d3ee)', color: tokens.text.primary }}
            >
              <Check className="w-3.5 h-3.5" />
              Definir
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.tertiary }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
