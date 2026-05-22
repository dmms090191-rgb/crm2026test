import { useState } from 'react';
import { CalendarCheck, CalendarClock, RefreshCw } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { PropositionNotifEntry } from '../../ClientTopBar';
import { formatRelativeTime } from '../../../../lib/formatRelativeTime';

export function ThemeOption({
  icon,
  label,
  active,
  onClick,
  tokens,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  tokens: ThemeTokens['dropdown'];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors duration-150"
      style={{
        color: active ? tokens.activeCheck : (hovered ? tokens.itemTextHover : tokens.itemText),
        background: hovered ? tokens.itemBgHover : 'transparent',
      }}
    >
      {icon}
      <span className="font-medium flex-1 text-left">{label}</span>
      {active && (
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: tokens.activeCheck, boxShadow: `0 0 6px ${tokens.activeCheck}` }} />
      )}
    </button>
  );
}

export function NotifRow({
  count,
  latestAt,
  tokens,
  onClick,
}: {
  count: number;
  latestAt?: string | null;
  tokens: ThemeTokens['dropdown'];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 text-left cursor-pointer"
      style={{ background: hovered ? tokens.itemBgHover : 'transparent' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
          boxShadow: '0 0 8px rgba(6,182,212,0.3)',
        }}
      >
        S
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium" style={{ color: tokens.itemTextHover }}>
          Le support vous a r&#233;pondu
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {latestAt ? formatRelativeTime(latestAt) : ''}
          {count > 1 && <span className="ml-1.5 font-medium" style={{ color: '#34d399' }}>({count} messages)</span>}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.5)' }}
      />
    </button>
  );
}

export function ClientAgendaNotifItem({
  entry,
  tokens,
  onClick,
}: {
  entry: AgendaNotifEntry;
  tokens: ThemeTokens['dropdown'];
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
          background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
          boxShadow: '0 0 8px rgba(52,211,153,0.3)',
        }}
      >
        <CalendarCheck className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium whitespace-normal break-words" style={{ color: tokens.itemTextHover }}>
          Votre RDV avec <span style={{ color: '#34d399' }}>{entry.leadName || 'le support'}</span> commence maintenant
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {formatRelativeTime(entry.appointmentUtc)}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
        style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.6)' }}
      />
    </button>
  );
}

export function PropositionNotifItem({
  entry,
  tokens,
  onClick,
}: {
  entry: PropositionNotifEntry;
  tokens: ThemeTokens['dropdown'];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isFromAdminOrVendor = entry.created_by_role !== 'client';
  const isFromClient = entry.created_by_role === 'client';

  let message: string;
  if (entry.reschedule_status === 'accepted') {
    message = 'Votre demande de decalage a ete acceptee';
  } else if (entry.reschedule_status === 'refused') {
    message = 'Votre demande de decalage a ete refusee';
  } else if (entry.reschedule_status === 'pending') {
    message = 'Votre conseiller souhaite decaler le rendez-vous';
  } else if (isFromClient && entry.status === 'confirmed') {
    message = 'Votre conseiller a accepte le rendez-vous';
  } else if (isFromClient && entry.status === 'cancelled') {
    message = 'Votre conseiller a refuse le rendez-vous';
  } else if (isFromAdminOrVendor && !!entry.parent_proposal_id) {
    message = 'Votre conseiller vous propose une nouvelle date ou un nouvel horaire de rendez-vous';
  } else if (isFromAdminOrVendor) {
    message = 'Votre conseiller vous propose un rendez-vous';
  } else {
    message = 'Votre proposition de rendez-vous a recu une reponse';
  }

  const isRescheduleResponse = entry.reschedule_status === 'accepted' || entry.reschedule_status === 'refused';
  const isAccepted = entry.reschedule_status === 'accepted';
  const iconGradient = isRescheduleResponse
    ? (isAccepted ? 'linear-gradient(135deg, #34d399 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)')
    : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';
  const dotColor = isRescheduleResponse
    ? (isAccepted ? '#34d399' : '#f59e0b')
    : '#06b6d4';

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
        style={{ background: iconGradient, boxShadow: `0 0 8px ${dotColor}4d` }}
      >
        {isRescheduleResponse ? <RefreshCw className="w-3.5 h-3.5 text-white" /> : <CalendarClock className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium whitespace-normal break-words" style={{ color: tokens.itemTextHover }}>
          {message}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {formatRelativeTime(entry.created_at)}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}80` }}
      />
    </button>
  );
}
