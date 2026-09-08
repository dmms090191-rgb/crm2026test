import { type ReactNode } from 'react';
import NotificationButton from './NotificationButton';
import { DropdownPanel, DropdownHeader, DropdownEmpty } from './DropdownShell';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import { BubbleRow } from '../../../../components/notifications/MessageBubblePopover';

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

export function SuperAdminNotifItem({ count, name, subtitle, preview, at, tokens, onClick }: {
  count: number; name: string; subtitle?: string; preview: string; at: string;
  tokens: DropdownTokens; onClick: () => void;
}) {
  return (
    <BubbleRow
      name={name || 'Talvex Administrateur'}
      subtitle={subtitle}
      preview={preview}
      at={at}
      unread={count}
      d={tokens}
      onClick={onClick}
    />
  );
}
