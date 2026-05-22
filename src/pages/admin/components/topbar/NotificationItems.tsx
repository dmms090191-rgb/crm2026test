import { useState } from 'react';
import { CalendarClock, Users, AlertCircle, RefreshCw } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { ConfirmedProposalEntry } from '../../TopBar';
import type { AgendaEquipeNotifEntry } from '../../../../hooks/useAgendaEquipeNotifications';
import type { ProposalNotifEntry } from '../../dashboard/useAdminProposalNotifs';

type DropdownTokens = ThemeTokens['dropdown'];

export { NotifDropdownSection, SuperAdminNotifItem } from './NotificationSectionItems';

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

export function RescheduleResponseItem({
  entry,
  tokens,
  onClick,
}: {
  entry: ProposalNotifEntry;
  tokens: DropdownTokens;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const accepted = entry.reschedule_status === 'accepted';

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
          background: accepted
            ? 'linear-gradient(135deg, #34d399 0%, #059669 100%)'
            : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          boxShadow: accepted
            ? '0 0 8px rgba(52,211,153,0.3)'
            : '0 0 8px rgba(245,158,11,0.3)',
        }}
      >
        <RefreshCw className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium whitespace-normal break-words" style={{ color: tokens.itemTextHover }}>
          <span style={{ color: accepted ? '#34d399' : '#f59e0b' }}>{entry.lead_name}</span>
          {accepted ? ' a accepte le decalage du RDV' : ' a refuse le decalage du RDV'}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {formatRelativeTime(entry.created_at)}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: accepted ? '#34d399' : '#f59e0b',
          boxShadow: accepted ? '0 0 6px rgba(52,211,153,0.5)' : '0 0 6px rgba(245,158,11,0.5)',
        }}
      />
    </button>
  );
}

export function RescheduleRequestItem({
  entry,
  tokens,
  onClick,
}: {
  entry: ProposalNotifEntry;
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
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          boxShadow: '0 0 8px rgba(245,158,11,0.3)',
        }}
      >
        <RefreshCw className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium whitespace-normal break-words" style={{ color: tokens.itemTextHover }}>
          <span style={{ color: '#f59e0b' }}>{entry.lead_name}</span> souhaite decaler son rendez-vous
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {formatRelativeTime(entry.created_at)}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
        style={{ background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.5)' }}
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
