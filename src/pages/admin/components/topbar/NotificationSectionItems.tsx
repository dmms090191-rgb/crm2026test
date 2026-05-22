import { useState, type ReactNode } from 'react';
import NotificationButton from './NotificationButton';
import { DropdownPanel, DropdownHeader, DropdownEmpty } from './DropdownShell';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

type DropdownTokens = ThemeTokens['dropdown'];

interface NotifDropdownSectionProps {
  dropdownRef: React.RefObject<HTMLDivElement>;
  open: boolean;
  setOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  icon: ReactNode;
  label: string;
  count: number;
  iconColor: string;
  iconHoverColor: string;
  labelColor: string;
  labelHoverColor: string;
  hoverBg: string;
  dropdownWidth?: string;
  dropdownAlign?: 'left' | 'right';
  headerLabel: string;
  emptyText: string;
  tokens: ThemeTokens;
  children: ReactNode;
}

export function NotifDropdownSection({
  dropdownRef, open, setOpen,
  icon, label, count,
  iconColor, iconHoverColor, labelColor, labelHoverColor, hoverBg,
  dropdownWidth = 'w-72', dropdownAlign = 'left',
  headerLabel, emptyText,
  tokens, children,
}: NotifDropdownSectionProps) {
  return (
    <div className="relative" ref={dropdownRef}>
      <NotificationButton
        icon={icon}
        label={label}
        count={count}
        iconColor={iconColor}
        iconHoverColor={iconHoverColor}
        labelColor={labelColor}
        labelHoverColor={labelHoverColor}
        hoverBg={hoverBg}
        onClick={() => setOpen((prev: boolean) => !prev)}
      />
      {open && (
        <DropdownPanel tokens={tokens} width={dropdownWidth} align={dropdownAlign}>
          <DropdownHeader label={headerLabel} tokens={tokens} />
          <div className="max-h-64 overflow-y-auto">
            {count === 0 ? <DropdownEmpty text={emptyText} tokens={tokens} /> : children}
          </div>
        </DropdownPanel>
      )}
    </div>
  );
}

export function SuperAdminNotifItem({ count, tokens, onClick }: { count: number; tokens: DropdownTokens; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 text-left"
      style={{ background: hovered ? tokens.itemBgHover : 'transparent' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 8px rgba(245,158,11,0.3)' }}
      >
        S
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium whitespace-normal break-words" style={{ color: tokens.itemTextHover }}>
          Vous avez reçu un message du Super Admin.
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {count} message{count > 1 ? 's' : ''} non lu{count > 1 ? 's' : ''}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.5)' }}
      />
    </button>
  );
}
