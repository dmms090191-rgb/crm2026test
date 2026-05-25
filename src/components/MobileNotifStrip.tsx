import type { LucideIcon } from 'lucide-react';

export interface MobileNotifItem {
  key: string;
  icon: LucideIcon;
  label: string;
  count: number;
  onClick: () => void;
}

interface Props {
  items: MobileNotifItem[];
  bg: string;
  border: string;
  iconColor: string;
  textColor: string;
}

function formatBadge(n: number): string {
  if (n > 9) return '9+';
  return String(n);
}

export default function MobileNotifStrip({ items, bg, border, iconColor, textColor }: Props) {
  const hasAny = items.some(i => i.count > 0);
  if (!hasAny) return null;

  return (
    <div
      className="md:hidden flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto flex-shrink-0"
      style={{
        background: bg,
        borderBottom: `1px solid ${border}`,
      }}
    >
      {items.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={item.onClick}
            className="relative flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0 transition-all active:scale-95"
            style={{
              background: item.count > 0 ? 'rgba(239,68,68,0.08)' : 'transparent',
              border: item.count > 0 ? '1px solid rgba(239,68,68,0.15)' : '1px solid transparent',
            }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: item.count > 0 ? '#ef4444' : iconColor }} />
            <span
              className="text-[10px] font-medium whitespace-nowrap"
              style={{ color: item.count > 0 ? '#ef4444' : textColor }}
            >
              {item.label}
            </span>
            {item.count > 0 && (
              <span
                className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 0 6px rgba(239,68,68,0.4)',
                }}
              >
                {formatBadge(item.count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
