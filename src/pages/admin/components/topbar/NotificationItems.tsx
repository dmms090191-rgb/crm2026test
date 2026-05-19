import { useState, type ReactNode } from 'react';
import { CalendarClock, Users, AlertCircle } from 'lucide-react';
import NotificationButton from './NotificationButton';
import { DropdownPanel, DropdownHeader, DropdownEmpty } from './DropdownShell';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { ConfirmedProposalEntry } from '../../TopBar';
import type { AgendaEquipeNotifEntry } from '../../../../hooks/useAgendaEquipeNotifications';

type DropdownTokens = ThemeTokens['dropdown'];

export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export function ConfirmedProposalItem({
  entry,
  tokens,
  onClick,
}: {
  entry: ConfirmedProposalEntry;
  tokens: DropdownTokens;
  onClick: () => void;
}) {
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
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
          boxShadow: '0 0 8px rgba(52,211,153,0.3)',
        }}
      >
        <CalendarClock className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium whitespace-normal break-words" style={{ color: tokens.itemTextHover }}>
          RDV confirme avec <span style={{ color: '#34d399' }}>{entry.lead_name}</span>
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {formatRelativeTime(entry.created_at)}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.5)' }}
      />
    </button>
  );
}

export function AgendaEquipeNotifItem({
  entry,
  tokens,
  onClick,
}: {
  entry: AgendaEquipeNotifEntry;
  tokens: DropdownTokens;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isUntreated = entry.type === 'untreated';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 text-left"
      style={{ background: hovered ? tokens.itemBgHover : 'transparent' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: isUntreated
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
          boxShadow: isUntreated
            ? '0 0 8px rgba(239,68,68,0.3)'
            : '0 0 8px rgba(6,182,212,0.3)',
        }}
      >
        {isUntreated ? <AlertCircle className="w-3.5 h-3.5 text-white" /> : <Users className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium" style={{ color: tokens.itemTextHover }}>
          {isUntreated ? (
            <>Le rendez-vous avec <span style={{ color: '#ef4444' }}>{entry.leadName || 'un client'}</span> ({entry.vendorName}) n'a pas ete traite</>
          ) : (
            <>Le rendez-vous de <span style={{ color: '#22d3ee' }}>{entry.leadName || 'un client'}</span> avec <span style={{ color: '#22d3ee' }}>{entry.vendorName}</span> commence maintenant</>
          )}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {formatRelativeTime(entry.appointmentUtc)}
        </p>
      </div>
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 ${isUntreated ? '' : 'animate-pulse'}`}
        style={{ background: isUntreated ? '#ef4444' : '#06b6d4', boxShadow: isUntreated ? '0 0 6px rgba(239,68,68,0.5)' : '0 0 6px rgba(6,182,212,0.6)' }}
      />
    </button>
  );
}

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
