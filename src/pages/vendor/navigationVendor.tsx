import {
  LayoutDashboard, Database, MessageSquare, MessageCircle,
  CalendarDays, CalendarClock, GraduationCap,
} from 'lucide-react';
import type { LayoutDefaultSection } from '../../lib/sidebarLayout';

/*
 * LA NAVIGATION DU PANEL COMMERCIAL — hors du composant qui la rend.
 *
 * Elle vivait dans VendorSidebar.tsx. Elle en sort le 27/10/2026 parce que la coquille
 * telephone en a besoin : depuis qu'elle derive ses onglets de layout.visible, le bureau et
 * le telephone lisent la MEME definition, et une definition partagee n'a pas sa place dans un
 * fichier de composant. Le greffon de rafraichissement le disait d'ailleurs mot pour mot —
 * « Use a new file to share constants or functions between components ».
 *
 * Ce fichier n'exporte donc aucun composant, et VendorSidebar l'importe.
 */

/**
 * Layout PAR DEFAUT du panel Commercial.
 *
 * Les `id` sont les identifiants techniques de navigation (VendorActiveView) :
 * ils ne changent jamais. Seuls le libelle affiche, l'ordre et le compartiment
 * sont definis ici. Les icones sont resolues au rendu, par id.
 */
export const LAYOUT_SECTIONS: LayoutDefaultSection[] = [
  { title: 'Principal', items: [
    { id: 'vue-ensemble', label: "Vue d'ensemble" },
    { id: 'leads', label: 'Leads' },
  ] },
  { title: 'Rendez-vous', items: [
    { id: 'agenda', label: 'Agenda' },
    { id: 'propositions-rdv', label: 'Propositions RDV' },
  ] },
  { title: 'Contact', items: [
    { id: 'chat-admin', label: 'Chat Administration' },
    { id: 'chat-client', label: 'Chat Client' },
  ] },
  { title: 'Ressources', items: [
    { id: 'tuto', label: 'Tuto' },
  ] },
];

export const ICONS: Record<string, React.ReactNode> = {
  'vue-ensemble': <LayoutDashboard className="w-4 h-4" />,
  'leads': <Database className="w-4 h-4" />,
  'agenda': <CalendarDays className="w-4 h-4" />,
  'propositions-rdv': <CalendarClock className="w-4 h-4" />,
  'chat-admin': <MessageSquare className="w-4 h-4" />,
  'chat-client': <MessageCircle className="w-4 h-4" />,
  'tuto': <GraduationCap className="w-4 h-4" />,
};
