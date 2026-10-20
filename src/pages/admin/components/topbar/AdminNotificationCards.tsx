import { type ReactNode } from 'react';
import { MessageSquareText, CalendarDays, CalendarClock, CalendarCheck, Shield, RefreshCw, Building2 } from 'lucide-react';
import NotifHubCards from '../../../../components/notifications/hub/NotifHubCards';
import type { HubCardDef } from '../../../../components/notifications/hub/notifHubTypes';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

export type NotifCategory =
  | 'client' | 'vendeur' | 'super-admin'
  | 'agenda' | 'equipe'
  | 'propositions' | 'rdv'
  | 'decalages' | 'demandes-decalage'
  /*
   * CRM Immo, dixieme categorie. Elle n est EMISE que pour les Societes qui possedent
   * reellement le module (voir AdminNotificationsHub) : jamais masquee, jamais desactivee,
   * simplement absente. Meme principe que l onglet de la barre laterale.
   */
  | 'crm-immo';

export interface CardDef {
  key: NotifCategory;
  icon: ReactNode;
  label: string;
  desc: string;
  accent: string;
  accentBg: string;
}

/**
 * Les DIX categories du panel Societe, dans leur ordre par defaut.
 *
 * La dixieme, CRM Immo, n'est pas emise pour tout le monde : AdminNotificationsHub la
 * retire pour les Societes qui ne possedent pas le module. Elle figure ici parce que
 * c'est ici que vit la definition d'une carte, pas le droit de la voir.
 */
export const CARDS: CardDef[] = [
  { key: 'client', icon: <MessageSquareText className="w-4 h-4" />, label: 'Chat Client', desc: 'Messages de vos clients', accent: '#0ea5e9', accentBg: 'rgba(14,165,233,0.12)' },
  { key: 'vendeur', icon: <MessageSquareText className="w-4 h-4" />, label: 'Chat Commercial', desc: 'Messages des commerciaux', accent: '#8b5cf6', accentBg: 'rgba(139,92,246,0.12)' },
  { key: 'agenda', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda perso', desc: 'Rendez-vous a venir', accent: '#06b6d4', accentBg: 'rgba(6,182,212,0.12)' },
  { key: 'propositions', icon: <CalendarClock className="w-4 h-4" />, label: 'Propositions', desc: 'Nouvelles propositions RDV', accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.12)' },
  { key: 'rdv', icon: <CalendarCheck className="w-4 h-4" />, label: 'RDV Confirmes', desc: 'Confirmations recentes', accent: '#22c55e', accentBg: 'rgba(34,197,94,0.12)' },
  { key: 'super-admin', icon: <Shield className="w-4 h-4" />, label: 'Chat Direction', desc: 'Messages de votre Direction', accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.10)' },
  { key: 'equipe', icon: <CalendarDays className="w-4 h-4" />, label: 'Agenda equipe', desc: 'RDV equipe imminents', accent: '#06b6d4', accentBg: 'rgba(6,182,212,0.10)' },
  { key: 'decalages', icon: <RefreshCw className="w-4 h-4" />, label: 'Decalages', desc: 'Reponses aux decalages', accent: '#64748b', accentBg: 'rgba(100,116,139,0.10)' },
  { key: 'demandes-decalage', icon: <RefreshCw className="w-4 h-4" />, label: 'Demandes', desc: 'Demandes de decalage', accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.08)' },
  { key: 'crm-immo', icon: <Building2 className="w-4 h-4" />, label: 'CRM Immo', desc: 'Fins de contrat et loyers', accent: '#14b8a6', accentBg: 'rgba(20,184,166,0.12)' },
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
  hideEditMode?: boolean;
  hiddenCards?: Set<string>;
  onToggleCard?: (key: string) => void;
  cardOrder?: string[];
  cardLabels?: Record<string, string>;
  reorderMode?: boolean;
  onMoveDraft?: (from: number, to: number) => void;
  onRenameDraft?: (key: string, newLabel: string) => void;
}

function getCount(key: NotifCategory, p: Props): number {
  switch (key) {
    case 'client': return p.unreadClientCount;
    case 'vendeur': return p.unreadVendorCount;
    case 'super-admin': return p.unreadSuperAdminCount;   // badge = nombre de CONVERSATIONS
    case 'agenda': return p.agendaPersoCount;
    case 'equipe': return p.agendaEquipeCount;
    case 'propositions': return p.proposalsCount;
    case 'rdv': return p.confirmedCount;
    case 'decalages': return p.rescheduleCount;
    case 'demandes-decalage': return p.rescheduleRequestCount;
    /*
     * CRM Immo rend 0 ICI, et c est volontaire : le composant par defaut de ce fichier
     * n est MONTE NULLE PART. Verifie : seuls `CARDS` et le type `NotifCategory` en sont
     * importes ; le rendu des cartes a migre dans NotifHubCards, et le compteur reel vit
     * dans AdminNotificationsHub.countOf.
     *
     * On ajoute donc le cas pour que le typecheck passe — l absence de `default:` le fait
     * crier, et c est une bonne chose — sans etendre du code mort. Le nettoyage de ce
     * composant est un chantier a part.
     */
    case 'crm-immo': return 0;
  }
}

/**
 * Grille des categories de la Societe.
 *
 * Le rendu (cartes, badges, mode masquage, reorganisation par glisser-deposer)
 * vit desormais dans src/components/notifications/hub/NotifHubCards, partage
 * avec le panel Commercial. Ce composant ne fait plus que convertir les
 * compteurs de la Societe en cartes.
 */
export default function AdminNotificationCards(props: Props) {
  const cards: HubCardDef[] = CARDS.map(c => ({ ...c, count: getCount(c.key, props) }));

  return (
    <NotifHubCards
      cards={cards}
      tokens={props.tokens}
      onSelect={key => props.onSelect(key as NotifCategory)}
      hideEditMode={props.hideEditMode}
      hiddenCards={props.hiddenCards}
      onToggleCard={props.onToggleCard}
      cardOrder={props.cardOrder}
      cardLabels={props.cardLabels}
      reorderMode={props.reorderMode}
      onMoveDraft={props.onMoveDraft}
      onRenameDraft={props.onRenameDraft}
    />
  );
}
