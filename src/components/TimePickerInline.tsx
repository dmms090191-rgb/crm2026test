import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { useThemeTokens } from '../hooks/useThemeTokens';

interface TimePickerInlineProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const PRESETS: string[] = [];
for (let h = 0; h < 24; h++) {
  PRESETS.push(`${h.toString().padStart(2, '0')}:00`);
  PRESETS.push(`${h.toString().padStart(2, '0')}:30`);
}

function formatTimeInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, digits.length - 2) + ':' + digits.slice(digits.length - 2);
}

function normalizeTime(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 1) return null;

  let h: number;
  let m: number;

  if (digits.length <= 2) {
    h = parseInt(digits, 10);
    m = 0;
  } else if (digits.length === 3) {
    h = parseInt(digits[0], 10);
    m = parseInt(digits.slice(1), 10);
  } else {
    h = parseInt(digits.slice(0, 2), 10);
    m = parseInt(digits.slice(2, 4), 10);
  }

  if (isNaN(h) || isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export default function TimePickerInline({ value, onChange, className, style }: TimePickerInlineProps) {
  const tokens = useThemeTokens();
  const [draft, setDraft] = useState(value || '');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focused) setDraft(value || '');
  }, [value, focused]);

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

  useEffect(() => {
    if (open && listRef.current && value) {
      const idx = PRESETS.indexOf(value);
      if (idx > -1) {
        const item = listRef.current.children[idx] as HTMLElement;
        if (item) item.scrollIntoView({ block: 'center' });
      }
    }
  }, [open, value]);

  function handleFocus() {
    setDraft(value || '');
    setError('');
    setFocused(true);
  }

  function handleBlur() {
    setFocused(false);
    if (!draft.trim()) {
      setError('');
      return;
    }
    const normalized = normalizeTime(draft);
    if (normalized) {
      onChange(normalized);
      setDraft(normalized);
      setError('');
    } else {
      setError('Format invalide. Exemple : 14:30');
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatTimeInput(e.target.value);
    setDraft(formatted);
    if (error) setError('');
    const normalized = normalizeTime(formatted);
    if (normalized) {
      onChange(normalized);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  }

  function handleSelect(t: string) {
    onChange(t);
    setDraft(t);
    setError('');
    setOpen(false);
  }

  const displayValue = focused ? draft : (value || '');

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative flex items-center">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-60 pointer-events-none" style={{ color: tokens.text.tertiary }} />
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="HH:mm"
          maxLength={5}
          className={className}
          style={{ ...style, paddingLeft: '2rem', paddingRight: '2.2rem' }}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ color: tokens.text.tertiary }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <p className="text-[10px] mt-1 font-medium" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 rounded-lg overflow-y-auto shadow-xl"
          style={{
            maxHeight: '220px',
            background: tokens.card.bg,
            border: `1px solid ${tokens.card.border}`,
          }}
        >
          {PRESETS.map(t => {
            const isActive = t === value;
            return (
              <button
                key={t}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleSelect(t)}
                className="w-full text-left px-3 py-2 text-sm transition-colors"
                style={{
                  color: isActive ? tokens.accent.text : tokens.text.primary,
                  background: isActive ? tokens.accent.bg : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = tokens.surface.hover; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
