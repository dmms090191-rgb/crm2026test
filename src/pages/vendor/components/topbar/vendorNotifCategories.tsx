import { MessageSquare, MessageCircle, CalendarDays, CalendarClock, CalendarCheck } from 'lucide-react';
import type { HubCardDef } from '../../../../components/notifications/hub/notifHubTypes';
import type { VendorClientNotifEntry, ConfirmedProposalEntry } from '../../VendorTopBar';
import type { AgendaNotifEntry } from '../../../../hooks/useAgendaNotifications';

/**
 * Les cinq categories de notification du panel Commercial.
 *
 * Les cles sont celles que la cloche mobile utilisait deja ('admin', 'client',
 * 'agenda', 'propositions', 'rdv') : desktop et mobile partagent donc le meme
 * ordre enregistre et le meme masquage, sans migration de donnees.
 */
export const VENDOR_NOTIF_KEYS = ['admin', 'client', 'agenda', 'propositions', 'rdv'] as const;

export type VendorNotifKey = typeof VENDOR_NOTIF_KEYS[number];

/** Donnees reelles de chaque categorie. Aucune n'est fabriquee. */
export interface VendorNotifData {
  /** Chat Administration : fil unique, donc un compteur de messages. */
  unreadAdminCount: number;
  unreadAdminLatestAt?: string | null;
  unreadAdminPreview?: string;
  adminName: string;
  adminSubtitle?: string;
  onAdminNotifClick?: () => void;

  unreadClientCount: number;
  unreadClientEntries: VendorClientNotifEntry[];
  onClientEntryClick?: (entry: VendorClientNotifEntry) => void;

  agendaCount: number;
  agendaEntries: AgendaNotifEntry[];
  onAgendaEntryClick?: (rdvId: string, type?: 'starting' | 'untreated') => void;

  proposalsCount: number;
  proposalsEntries: ConfirmedProposalEntry[];
  onProposalEntryClick?: (proposalId: string) => void;

  confirmedCount: number;
  confirmedEntries: ConfirmedProposalEntry[];
  onConfirmedEntryClick?: (proposalId: string) => void;
}

/**
 * Cartes du hub, dans leur ordre par defaut.
 *
 * Les compteurs sont homogenes avec le panel Societe : un badge compte des
 * CONVERSATIONS, pas des messages. Le fil de l'administration est unique, il
 * vaut donc 1 des qu'il porte un message non lu ; le detail de la ligne, lui,
 * affiche le nombre exact de messages.
 */
export function vendorNotifCards(d: VendorNotifData): HubCardDef[] {
  return [
    {
      key: 'admin',
      icon: <MessageSquare className="w-4 h-4" />,
      label: 'Chat Administration',
      desc: 'Messages de votre responsable',
      accent: '#0ea5e9', accentBg: 'rgba(14,165,233,0.12)',
      count: d.unreadAdminCount > 0 ? 1 : 0,
    },
    {
      key: 'client',
      icon: <MessageCircle className="w-4 h-4" />,
      label: 'Chat Client',
      desc: 'Messages de vos clients',
      accent: '#06b6d4', accentBg: 'rgba(6,182,212,0.12)',
      count: d.unreadClientCount,
    },
    {
      key: 'agenda',
      icon: <CalendarDays className="w-4 h-4" />,
      label: 'Agenda',
      desc: 'Rendez-vous a traiter',
      accent: '#22d3ee', accentBg: 'rgba(34,211,238,0.12)',
      count: d.agendaCount,
    },
    {
      key: 'propositions',
      icon: <CalendarClock className="w-4 h-4" />,
      label: 'Propositions RDV',
      desc: 'Nouvelles demandes de RDV',
      accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.12)',
      count: d.proposalsCount,
    },
    {
      key: 'rdv',
      icon: <CalendarCheck className="w-4 h-4" />,
      label: 'RDV Confirmés',
      desc: 'Confirmations recentes',
      accent: '#34d399', accentBg: 'rgba(52,211,153,0.12)',
      count: d.confirmedCount,
    },
  ];
}
