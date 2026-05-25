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
        className="relative flex items-center gap-1 px-1.5 py-1 rounded-md transition-all duration-200"
        style={{ color: t.topbar.notifIcon }}
        onMouseEnter={e => { e.currentTarget.style.background = t.surface.hover; e.currentTarget.style.color = t.topbar.notifIconHover; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.topbar.notifIcon; }}
      >
        <MoreHorizontal className="w-4 h-4" />
        <span className="text-[10px] font-medium hidden xl:block"
          style={{ color: t.topbar.notifLabel }}>Plus</span>
        {totalHidden > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 rounded-full text-[8px] font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 0 6px rgba(239,68,68,0.4), 0 1px 3px rgba(0,0,0,0.3)',
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
              <button
                key={item.key}
                onClick={() => { setOpen(false); item.onClick(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors duration-150"
                style={{ color: t.dropdown.itemText }}
                onMouseEnter={e => { e.currentTarget.style.background = t.dropdown.itemBgHover; e.currentTarget.style.color = t.dropdown.itemTextHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.dropdown.itemText; }}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
