import { useState } from 'react';

interface NotificationButtonProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  iconColor: string;
  iconHoverColor: string;
  labelColor: string;
  labelHoverColor: string;
  hoverBg?: string;
  onClick?: () => void;
}

export default function NotificationButton({
  icon,
  label,
  count,
  iconColor,
  iconHoverColor,
  labelColor,
  labelHoverColor,
  hoverBg,
  onClick,
}: NotificationButtonProps) {
  const [hovered, setHovered] = useState(false);
  const hasCount = count !== undefined && count > 0;

  return (
    <button
      className="relative group flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-200"
      style={{
        background: hovered
          ? (hoverBg || 'rgba(148,163,184,0.08)')
          : 'rgba(148,163,184,0.03)',
        border: `1px solid ${hovered ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.06)'}`,
        boxShadow: hovered ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
        transform: hovered ? 'translateY(-0.5px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div className="relative flex-shrink-0">
        <span
          className="flex items-center justify-center w-5 h-5 transition-colors duration-200"
          style={{ color: hovered ? iconHoverColor : iconColor }}
        >
          {icon}
        </span>
        {hasCount && (
          <span
            className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 0 8px rgba(239,68,68,0.4), 0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
        {count === undefined && (
          <span
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
            style={{
              background: '#22c55e',
              boxShadow: '0 0 4px rgba(34,197,94,0.5)',
            }}
          />
        )}
      </div>
      <span
        className="text-[10.5px] font-medium transition-colors duration-200 hidden lg:block whitespace-nowrap"
        style={{ color: hovered ? labelHoverColor : labelColor }}
      >
        {label}
      </span>
    </button>
  );
}
