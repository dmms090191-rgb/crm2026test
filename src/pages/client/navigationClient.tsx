import {
  LayoutDashboard,
  MessageCircle,
  CalendarDays,
  CalendarClock,
  GraduationCap,
  Activity,
} from 'lucide-react';
import type { ClientActiveView } from './ClientDashboard';

/*
 * LA NAVIGATION DU PANEL CLIENT — hors du composant qui la rend.
 *
 * Elle vivait dans ClientSidebar.tsx. Elle en sort le 27/10/2026 parce que la coquille
 * telephone en a besoin, et qu'une definition partagee n'a pas sa place dans un fichier de
 * composant — le greffon de rafraichissement le disait mot pour mot.
 *
 * ATTENTION, LE CLIENT EST LE SEUL A NE PAS ETRE SUR LE MOTEUR V2. Le type LayoutPanel vaut
 * 'company_super_admin' | 'admin' | 'super_admin' | 'vendor' : il n'y a PAS de panel
 * 'client'. Ces sections ne sont donc pas un layout.visible — elles n'ont ni ordre
 * enregistre, ni renommage, et leur masquage passe par usePanelHiddenTabs, l'ancien moteur.
 * La coquille telephone lit la MEME cle que ce composant (panel 'client', companyId null)
 * pour que le masquage s'applique des deux cotes. Le portage en V2 est un chantier a part.
 *
 * Les icones vivent DANS les items ici, contrairement aux trois autres panels qui les
 * resolvent par id. C'est la forme d'origine, conservee telle quelle : la coquille en derive
 * sa propre carte par id (navigationMobileSources.ts).
 */

interface NavItem {
  id: ClientActiveView;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const BASE_SECTIONS: NavSection[] = [
  {
    title: 'G\u00e9n\u00e9ral',
    items: [
      { id: 'vue-ensemble', label: "Vue d'ensemble", icon: <LayoutDashboard className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Communication',
    items: [
      { id: 'messagerie', label: 'Support', icon: <MessageCircle className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Rendez-vous',
    items: [
      { id: 'agenda', label: 'Agenda', icon: <CalendarDays className="w-4 h-4" /> },
      { id: 'propositions-rdv', label: 'Propositions RDV', icon: <CalendarClock className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Ressources',
    items: [
      { id: 'tuto', label: 'Tuto', icon: <GraduationCap className="w-4 h-4" /> },
    ],
  },
];

export const WELLNESS_SECTION: NavSection = {
  title: 'Bien-\u00eatre',
  items: [
    { id: 'suivi-corporel', label: 'Suivi corporel', icon: <Activity className="w-4 h-4" /> },
  ],
};
