import { useState } from 'react';
import { CalendarDays, CalendarClock, AlertCircle } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { VendorClientNotifEntry, ConfirmedProposalEntry } from '../../VendorTopBar';
import { formatRelativeTime } from '../../../../lib/formatRelativeTime';

export function AdminNotifRow({
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
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          boxShadow: '0 0 8px rgba(14,165,233,0.3)',
        }}
      >
        A
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium" style={{ color: tokens.itemTextHover }}>
          L'admin vous a r&#233;pondu
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {latestAt ? formatRelativeTime(latestAt) : ''}
          {count > 1 && <span className="ml-1.5 font-medium" style={{ color: '#22d3ee' }}>({count} messages)</span>}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: '#0ea5e9', boxShadow: '0 0 6px rgba(14,165,233,0.5)' }}
      />
    </button>
  );
}

export function ClientNotifRow({
  entry,
  tokens,
  onClick,
}: {
  entry: VendorClientNotifEntry;
  tokens: ThemeTokens['dropdown'];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const displayName = [entry.prenom, entry.nom].filter(Boolean).join(' ') || entry.email || 'Client';
  const initial = (entry.prenom || entry.email || 'C').charAt(0).toUpperCase();

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
        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
          boxShadow: '0 0 8px rgba(6,182,212,0.3)',
        }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium whitespace-normal break-words" style={{ color: tokens.itemTextHover }}>
          {displayName} <span style={{ color: tokens.itemText, fontWeight: 400 }}>vous a envoy&#233; un message</span>
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {formatRelativeTime(entry.latestAt)}
          {entry.count > 1 && <span className="ml-1.5 font-medium" style={{ color: '#22d3ee' }}>({entry.count} messages)</span>}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: '#06b6d4', boxShadow: '0 0 6px rgba(6,182,212,0.5)' }}
      />
    </button>
  );
}

export function VendorAgendaNotifItem({
  entry,
  tokens,
  onClick,
}: {
  entry: AgendaNotifEntry;
  tokens: ThemeTokens['dropdown'];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isUntreated = entry.type === 'untreated';

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
          background: isUntreated
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
          boxShadow: isUntreated
            ? '0 0 8px rgba(239,68,68,0.3)'
            : '0 0 8px rgba(34,211,238,0.3)',
        }}
      >
        {isUntreated ? <AlertCircle className="w-3.5 h-3.5 text-white" /> : <CalendarDays className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium whitespace-normal break-words" style={{ color: tokens.itemTextHover }}>
          {isUntreated ? (
            <>Le rendez-vous avec <span style={{ color: '#ef4444' }}>{entry.leadName || 'un client'}</span> n'a pas ete traite</>
          ) : (
            <>Votre RDV avec <span style={{ color: '#22d3ee' }}>{entry.leadName || 'un client'}</span> commence maintenant</>
          )}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {formatRelativeTime(entry.appointmentUtc)}
        </p>
      </div>
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 ${isUntreated ? '' : 'animate-pulse'}`}
        style={{ background: isUntreated ? '#ef4444' : '#22d3ee', boxShadow: isUntreated ? '0 0 6px rgba(239,68,68,0.5)' : '0 0 6px rgba(34,211,238,0.6)' }}
      />
    </button>
  );
}

export function VendorProposalItem({
  entry,
  dropTokens,
  onClick,
}: {
  entry: ConfirmedProposalEntry;
  dropTokens: ThemeTokens['dropdown'];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isCounterProposal = !!entry.parent_proposal_id;
  const message = isCounterProposal ? 'propose un autre horaire' : 'demande un rendez-vous';

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 text-left"
      style={{ background: hovered ? dropTokens.itemBgHover : 'transparent' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          boxShadow: '0 0 8px rgba(245,158,11,0.3)',
        }}
      >
        <CalendarClock className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium whitespace-normal break-words" style={{ color: dropTokens.itemTextHover }}>
          <span style={{ color: '#f59e0b' }}>{entry.lead_name}</span> {message}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: dropTokens.itemText }}>
          {formatRelativeTime(entry.created_at)}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.5)' }}
      />
    </button>
  );
}

export function VendorConfirmedItem({
  entry,
  dropTokens,
  onClick,
}: {
  entry: ConfirmedProposalEntry;
  dropTokens: ThemeTokens['dropdown'];
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
      style={{ background: hovered ? dropTokens.itemBgHover : 'transparent' }}
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
        <p className="text-[12px] font-medium whitespace-normal break-words" style={{ color: dropTokens.itemTextHover }}>
          RDV confirme avec <span style={{ color: '#34d399' }}>{entry.lead_name}</span>
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: dropTokens.itemText }}>
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
