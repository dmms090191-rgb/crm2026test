import { useState, type ReactNode } from 'react';
import { MessageSquareText, CalendarDays, CalendarClock, CalendarCheck, Shield, RefreshCw } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

export type NotifCategory =
  | 'client' | 'vendeur' | 'super-admin'
  | 'agenda' | 'equipe'
  | 'propositions' | 'rdv'
  | 'decalages' | 'demandes-decalage';

interface CardDef {
  key: NotifCategory;
  icon: ReactNode;
  label: string;
  desc: string;
  accent: string;
  accentBg: string;
}

const CARDS: CardDef[] = [
  { key: 'client', icon: <MessageSquareText className="w-4 h-4" />, label: 'Client', desc: 'Messages clients', accent: '#0ea5e9', accentBg: 'rgba(14,165,233,0.12)' },
  { key: 'vendeur', icon: <MessageSquareText className="w-4 h-4" />, label: 'Vendeur', desc: 'Messages vendeurs', accent: '#8b5cf6', accentBg: 'rgba(139,92,246,0.12)' },
  { key: 'agenda', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda perso', desc: 'Rendez-vous a venir', accent: '#06b6d4', accentBg: 'rgba(6,182,212,0.12)' },
  { key: 'propositions', icon: <CalendarClock className="w-4 h-4" />, label: 'Propositions', desc: 'Nouvelles propositions RDV', accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.12)' },
  { key: 'rdv', icon: <CalendarCheck className="w-4 h-4" />, label: 'RDV Confirmes', desc: 'Confirmations recentes', accent: '#22c55e', accentBg: 'rgba(34,197,94,0.12)' },
  { key: 'super-admin', icon: <Shield className="w-4 h-4" />, label: 'Super Admin', desc: 'Messages du Super Admin', accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.10)' },
  { key: 'equipe', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda equipe', desc: 'RDV equipe imminents', accent: '#06b6d4', accentBg: 'rgba(6,182,212,0.10)' },
  { key: 'decalages', icon: <RefreshCw className="w-4 h-4" />, label: 'Decalages', desc: 'Reponses aux decalages', accent: '#64748b', accentBg: 'rgba(100,116,139,0.10)' },
  { key: 'demandes-decalage', icon: <RefreshCw className="w-4 h-4" />, label: 'Demandes', desc: 'Demandes de decalage', accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.08)' },
];

interface Props {
  unreadClientCount: number;
  unreadVendorCount: number;
  agendaPersoCount: number;
  agendaEquipeCount: number;
  proposalsCount: number;
  confirmedCount: number;
  rescheduleCount: number;
  rescheduleRequestCount: number;
  unreadSuperAdminCount: number;
  onSelect: (cat: NotifCategory) => void;
  tokens: ThemeTokens;
}

function getCount(key: NotifCategory, p: Props): number {
  switch (key) {
    case 'client': return p.unreadClientCount;
    case 'vendeur': return p.unreadVendorCount;
    case 'super-admin': return p.unreadSuperAdminCount;
    case 'agenda': return p.agendaPersoCount;
    case 'equipe': return p.agendaEquipeCount;
    case 'propositions': return p.proposalsCount;
    case 'rdv': return p.confirmedCount;
    case 'decalages': return p.rescheduleCount;
    case 'demandes-decalage': return p.rescheduleRequestCount;
  }
}

export default function AdminNotificationCards(props: Props) {
  const { onSelect, tokens: t } = props;

  return (
    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {CARDS.map(card => (
        <NotifCard
          key={card.key}
          card={card}
          count={getCount(card.key, props)}
          tokens={t}
          onClick={() => onSelect(card.key)}
        />
      ))}
    </div>
  );
}

function NotifCard({ card, count, tokens: t, onClick }: {
  card: CardDef;
  count: number;
  tokens: ThemeTokens;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasNotif = count > 0;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all duration-200"
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${card.accentBg}, transparent)`
          : 'rgba(148,163,184,0.03)',
        border: `1px solid ${hovered ? card.accent + '30' : 'rgba(148,163,184,0.08)'}`,
        boxShadow: hovered ? `0 4px 12px ${card.accent}12` : 'none',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
        style={{
          background: hovered ? card.accentBg : 'rgba(148,163,184,0.06)',
          border: `1px solid ${hovered ? card.accent + '25' : 'rgba(148,163,184,0.08)'}`,
          color: hovered ? card.accent : t.dropdown.itemText,
        }}
      >
        {card.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[11.5px] font-semibold leading-tight truncate transition-colors duration-200"
          style={{ color: hovered ? card.accent : t.dropdown.itemTextHover }}
        >
          {card.label}
        </p>
        <p
          className="text-[10px] mt-0.5 truncate"
          style={{ color: t.dropdown.itemText }}
        >
          {card.desc}
        </p>
      </div>

      {/* Badge */}
      {hasNotif && (
        <span
          className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            boxShadow: '0 0 8px rgba(239,68,68,0.4)',
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
