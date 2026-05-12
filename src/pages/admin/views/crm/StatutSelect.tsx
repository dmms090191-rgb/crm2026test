import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { StatutDef } from './types';
import { getStatutCfg, FALLBACK_COLOR } from './utils';

interface StatutSelectProps {
  value: string;
  statutDefs: StatutDef[];
  onChange: (statut: string) => void;
  size?: 'sm' | 'md';
  tokens: { selectBg: string };
}

export default function StatutSelect({ value, statutDefs, onChange, size = 'md', tokens }: StatutSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const statut = value || 'Nouveau';
  const isNeutral = statut === 'Nouveau';
  const statutDef = statutDefs.find(s => s.nom === statut);
  const cfg = getStatutCfg(statutDef?.couleur ?? FALLBACK_COLOR, isNeutral);

  const options = [
    { value: 'Nouveau', label: 'Sans statut' },
    ...statutDefs.filter(s => s.nom !== 'Nouveau').map(s => ({ value: s.nom, label: s.nom })),
  ];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !menuRef.current || !containerRef.current) return;
    const menu = menuRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = menu.offsetHeight;
    if (spaceBelow < menuHeight + 8 && rect.top > menuHeight + 8) {
      menu.style.bottom = '100%';
      menu.style.top = 'auto';
      menu.style.marginBottom = '4px';
      menu.style.marginTop = '0';
    } else {
      menu.style.top = '100%';
      menu.style.bottom = 'auto';
      menu.style.marginTop = '4px';
      menu.style.marginBottom = '0';
    }
  }, [open]);

  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const py = size === 'sm' ? 'py-1' : 'py-1';

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <span
        className="pointer-events-none absolute left-2 w-1.5 h-1.5 rounded-full flex-shrink-0 z-10"
        style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }}
      />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`rounded-lg ${textSize} font-semibold pl-5 pr-6 ${py} focus:outline-none cursor-pointer text-left`}
        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
      >
        {options.find(o => o.value === statut)?.label ?? statut}
      </button>
      <ChevronDown
        className={`pointer-events-none absolute right-1.5 ${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'}`}
        style={{ color: cfg.color }}
      />

      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 z-50 min-w-[140px] rounded-xl py-1 shadow-xl"
          style={{ background: tokens.selectBg, border: `1px solid rgba(148,163,184,0.15)` }}
        >
          {options.map(opt => {
            const optIsNeutral = opt.value === 'Nouveau';
            const optDef = statutDefs.find(s => s.nom === opt.value);
            const optCfg = getStatutCfg(optDef?.couleur ?? FALLBACK_COLOR, optIsNeutral);
            const isActive = statut === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 ${textSize} font-medium flex items-center gap-2 transition-colors`}
                style={{ color: optCfg.color, background: isActive ? optCfg.bg : 'transparent' }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: optCfg.dot }} />
                <span className="flex-1">{opt.label}</span>
                {isActive && <Check className="w-3 h-3 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
