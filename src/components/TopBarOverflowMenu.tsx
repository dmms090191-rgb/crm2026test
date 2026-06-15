import { useState, useRef, useEffect, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { ThemeTokens } from '../lib/themeTokensTypes';

export interface OverflowItem {
  key: string;
  icon: ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}

interface Props {
  items: OverflowItem[];
  tokens: ThemeTokens;
}

function formatBadge(n: number): string {
  if (n <= 0) return '';
  if (n > 9) return '9+';
  return String(n);
}

export default function TopBarOverflowMenu({ items, tokens: t }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (items.length === 0) return null;

  const totalHidden = items.reduce((sum, it) => sum + it.count, 0);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-200"
        style={{
          color: hovered ? t.topbar.notifIconHover : t.topbar.notifIcon,
          background: hovered ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.03)',
          border: `1px solid ${hovered ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.06)'}`,
        }}
      >
        <MoreHorizontal className="w-4 h-4" />
        <span
          className="text-[10.5px] font-medium hidden lg:block"
          style={{ color: t.topbar.notifLabel }}
        >
          Plus
        </span>
        {totalHidden > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 0 8px rgba(239,68,68,0.4), 0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            {formatBadge(totalHidden)}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
          style={{
            background: t.dropdown.bg,
            border: `1px solid ${t.dropdown.border}`,
            boxShadow: t.dropdown.shadow,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="px-3 py-2" style={{ borderBottom: `1px solid ${t.dropdown.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.dropdown.itemText }}>
              Autres raccourcis
            </p>
          </div>
          <div className="py-1">
            {items.map(item => (
              <OverflowRow key={item.key} item={item} tokens={t} onClose={() => setOpen(false)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OverflowRow({ item, tokens: t, onClose }: { item: OverflowItem; tokens: ThemeTokens; onClose: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => { onClose(); item.onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all duration-150"
      style={{
        color: hovered ? t.dropdown.itemTextHover : t.dropdown.itemText,
        background: hovered ? t.dropdown.itemBgHover : 'transparent',
      }}
    >
      <span className="relative flex-shrink-0">
        {item.icon}
        {item.count > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 rounded-full text-[8px] font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 0 6px rgba(239,68,68,0.4)',
            }}
          >
            {formatBadge(item.count)}
          </span>
        )}
      </span>
      <span className="font-medium">{item.label}</span>
    </button>
  );
}
