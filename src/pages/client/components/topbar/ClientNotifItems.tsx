import { useState } from 'react';
import { CalendarCheck, CalendarClock } from 'lucide-react';
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
        <p className="text-[12px] font-medium truncate" style={{ color: tokens.itemTextHover }}>
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
        <p className="text-[12px] font-medium truncate" style={{ color: tokens.itemTextHover }}>
          {entry.lead_name ? (
            <>Proposition de RDV avec <span style={{ color: '#06b6d4' }}>{entry.lead_name}</span></>
          ) : (
            'Vous avez re\u00e7u une proposition de rendez-vous'
          )}
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
