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
  return (
    <button
      className="relative group flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-all duration-200"
      style={{ background: hovered && hoverBg ? hoverBg : undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div className="relative">
        <span className="transition-colors duration-200" style={{ color: hovered ? iconHoverColor : iconColor }}>
          {icon}
        </span>
        {count !== undefined && count > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 rounded-full text-[8px] font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 0 6px rgba(239,68,68,0.4), 0 1px 3px rgba(0,0,0,0.3)',
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
        className="text-[10px] font-medium transition-colors duration-200 hidden lg:block"
        style={{ color: hovered ? labelHoverColor : labelColor }}
      >
        {label}
      </span>
    </button>
  );
}
