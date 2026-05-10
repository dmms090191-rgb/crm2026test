import { useState } from 'react';
import { CalendarDays, CalendarClock, Users, AlertCircle } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';
import type { ClientNotifEntry, VendorNotifEntry, ConfirmedProposalEntry } from '../../TopBar';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';
import type { AgendaEquipeNotifEntry } from '../../../../hooks/useAgendaEquipeNotifications';

type DropdownTokens = ThemeTokens['dropdown'];

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export function ClientNotifItem({
  entry,
  tokens,
  onClick,
}: {
  entry: ClientNotifEntry;
  tokens: DropdownTokens;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const displayName = [entry.prenom, entry.nom].filter(Boolean).join(' ') || entry.email || 'Client';
  const initial = (entry.prenom || entry.email || 'C').charAt(0).toUpperCase();

  return (
    <button
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
        <p className="text-[12px] font-medium truncate" style={{ color: tokens.itemTextHover }}>
          {displayName} <span style={{ color: tokens.itemText, fontWeight: 400 }}>vous a envoy&eacute; un message</span>
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {formatRelativeTime(entry.latestAt)}
          {entry.count > 1 && <span className="ml-1.5 font-medium" style={{ color: '#22d3ee' }}>({entry.count} messages)</span>}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: '#22d3ee', boxShadow: '0 0 6px rgba(34,211,238,0.5)' }}
      />
    </button>
  );
}

export function VendorNotifItem({
  entry,
  tokens,
  onClick,
}: {
  entry: VendorNotifEntry;
  tokens: DropdownTokens;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const displayName = [entry.firstName, entry.lastName].filter(Boolean).join(' ') || entry.email || 'Vendeur';
  const initial = (entry.firstName || entry.email || 'V').charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 text-left"
      style={{ background: hovered ? tokens.itemBgHover : 'transparent' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          boxShadow: '0 0 8px rgba(14,165,233,0.3)',
        }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium truncate" style={{ color: tokens.itemTextHover }}>
          {displayName} <span style={{ color: tokens.itemText, fontWeight: 400 }}>vous a envoy&#233; un message</span>
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {formatRelativeTime(entry.latestAt)}
          {entry.count > 1 && <span className="ml-1.5 font-medium" style={{ color: '#22d3ee' }}>({entry.count} messages)</span>}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: '#0ea5e9', boxShadow: '0 0 6px rgba(14,165,233,0.5)' }}
      />
    </button>
  );
}

export function AgendaNotifItem({
  entry,
  tokens,
  onClick,
}: {
  entry: AgendaNotifEntry;
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
            : 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
          boxShadow: isUntreated
            ? '0 0 8px rgba(239,68,68,0.3)'
            : '0 0 8px rgba(34,211,238,0.3)',
        }}
      >
        {isUntreated ? <AlertCircle className="w-3.5 h-3.5 text-white" /> : <CalendarDays className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium truncate" style={{ color: tokens.itemTextHover }}>
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
          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
          boxShadow: '0 0 8px rgba(6,182,212,0.3)',
        }}
      >
        <CalendarClock className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium" style={{ color: tokens.itemTextHover }}>
          <span style={{ color: '#22d3ee' }}>{entry.lead_name}</span> a accepte le rendez-vous
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tokens.itemText }}>
          {formatRelativeTime(entry.created_at)}
        </p>
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: '#06b6d4', boxShadow: '0 0 6px rgba(6,182,212,0.5)' }}
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
