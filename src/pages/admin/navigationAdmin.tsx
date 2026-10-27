import {
  LayoutDashboard, Info, UserPlus, Upload, Users, Database, UserCheck, List,
  MessageCircle, MessageSquare, Shield, Calendar, CalendarRange, CalendarCheck,
  Settings, Globe, Brain, Image as ImageIcon, GraduationCap, Smartphone, Sparkles, CopySlash, Store,
  Briefcase, Building2, History, Download,
} from 'lucide-react';
import type { LayoutDefaultSection } from '../../lib/sidebarLayout';

/*
 * LA NAVIGATION DU PANEL SOCIETE — hors du composant qui la rend.
 *
 * Elle vivait dans Sidebar.tsx. Elle en sort le 27/10/2026 parce que la coquille telephone
 * en a besoin : depuis qu elle derive ses onglets de layout.visible, le bureau et le
 * telephone lisent la MEME definition, et une definition partagee n a pas sa place dans un
 * fichier de composant. Le greffon de rafraichissement le disait mot pour mot —
 * « Use a new file to share constants or functions between components ».
 *
 * Ce fichier n exporte aucun composant, et Sidebar.tsx l importe.
 *
 * A NOTER : l entree CRM Immo n est PAS declaree ici. Elle est injectee par
 * sectionsAvecCrmImmo selon le droit reel, parce qu un droit ne doit pas vivre dans un
 * reglage d organisation visuelle. Son ICONE, elle, est bien presente ci-dessous : sans
 * entree dans cette carte, l onglet se rendrait avec une pastille vide.
 */

/**
 * Layout PAR DEFAUT du panel Societe.
 *
 * Les `id` sont les identifiants techniques de navigation (ActiveView) : ils ne
 * changent jamais. Seuls le libelle affiche, l'ordre et le compartiment sont
 * definis ici.
 *
 * `hidden: true` = onglet present dans le layout par defaut mais masque au
 * demarrage. Il reste connu du moteur — donc jamais retire d'une configuration
 * deja enregistree — et se demasque depuis « Reorganiser ».
 */
export const LAYOUT_SECTIONS: LayoutDefaultSection[] = [
  { title: 'Principal', items: [
    { id: 'vue-ensemble', label: 'Dashboard' },
    { id: 'info-admin', label: 'Accès & sécurité' },
    { id: 'boutique', label: 'Boutique' },
    { id: 'cabinet', label: 'Cabinet' },
    // Site : module normal, visible par defaut. Talvex Administrateur peut toujours le masquer ;
    // une configuration deja enregistree garde son propre etat (reconcileLayout).
    { id: 'site', label: 'Site' },
    { id: 'logo', label: 'Logo', hidden: true },
    { id: 'calquer-logo', label: 'Calquer logo', hidden: true },
    { id: 'application', label: 'Application', hidden: true },
    /* Centre de telechargement. VISIBLE par defaut, pour tous les panneaux Admin : le
       logiciel de bureau s'adresse a tout le monde. Talvex Administrateur peut toujours
       le masquer societe par societe, par le mecanisme habituel. Il ne remplace pas
       « Application », qui configure la PWA d'une societe et fait autre chose. */
    { id: 'telecharger', label: 'Télécharger' },
  ] },
  { title: 'Gestion des leads', items: [
    { id: 'inscription', label: 'Inscriptions leads' },
    { id: 'import-leads', label: 'Import CSV de leads' },
    { id: 'ajouter-leads', label: 'Nouveau lead' },
    { id: 'crm', label: 'CRM Leads' },
    { id: 'statuts', label: 'Statuts' },
  ] },
  { title: 'Équipe commerciale', items: [
    { id: 'ajouter-vendeur', label: 'Ajouter un commercial' },
    { id: 'liste-vendeurs', label: 'Liste des commerciaux' },
  ] },
  { title: 'Communication', items: [
    { id: 'chat-client', label: 'Chat Client' },
    { id: 'chat-vendeur', label: 'Chat Commercial' },
    { id: 'chat-super-admin', label: 'Chat Direction' },
    /*
     * Declare JUSTE APRES Chat Direction, dans Communication — la place choisie par
     * David. Un onglet ajoute au code doit arriver a cette place meme pour les Societes
     * qui ont deja reorganise leur barre : c est le role de reconcileLayout, corrige le
     * 20 octobre pour inserer a la position declaree au lieu de pousser en fin.
     */
    { id: 'historique-notifications', label: 'Historique Notifications' },
  ] },
  { title: 'Agenda', items: [
    { id: 'agenda', label: 'Mon agenda' },
    { id: 'agenda-equipe', label: 'Agenda de l’équipe' },
    { id: 'propositions-rdv', label: 'Propositions de RDV' },
    { id: 'cerveau-ia', label: 'Cerveau IA AD', hidden: true },
    { id: 'editeur-ia', label: 'Editeur IA', hidden: true },
    { id: 'tuto', label: 'Tuto', hidden: true },
  ] },
];

export const ICONS: Record<string, React.ReactNode> = {
  'vue-ensemble': <LayoutDashboard className="w-4 h-4" />,
  'boutique': <Store className="w-4 h-4" />,
  'cabinet': <Briefcase className="w-4 h-4" />,
  'crm-immo': <Building2 className="w-4 h-4" />,
  'site': <Globe className="w-4 h-4" />,
  'logo': <ImageIcon className="w-4 h-4" />,
  'calquer-logo': <CopySlash className="w-4 h-4" />,
  'application': <Smartphone className="w-4 h-4" />,
  'telecharger': <Download className="w-4 h-4" />,
  'info-admin': <Info className="w-4 h-4" />,
  'inscription': <UserPlus className="w-4 h-4" />,
  'import-leads': <Upload className="w-4 h-4" />,
  'ajouter-leads': <Users className="w-4 h-4" />,
  'crm': <Database className="w-4 h-4" />,
  'ajouter-vendeur': <UserCheck className="w-4 h-4" />,
  'liste-vendeurs': <List className="w-4 h-4" />,
  'chat-client': <MessageCircle className="w-4 h-4" />,
  'chat-vendeur': <MessageSquare className="w-4 h-4" />,
  'chat-super-admin': <Shield className="w-4 h-4" />,
  /* Sans entree ici, l onglet se rend avec un <span> vide : le libelle s affiche mais
     la pastille d icone reste blanche, et rien dans le build ne le signale. */
  'historique-notifications': <History className="w-4 h-4" />,
  'agenda': <Calendar className="w-4 h-4" />,
  'agenda-equipe': <CalendarRange className="w-4 h-4" />,
  'propositions-rdv': <CalendarCheck className="w-4 h-4" />,
  'statuts': <Settings className="w-4 h-4" />,
  'cerveau-ia': <Brain className="w-4 h-4" />,
  'editeur-ia': <Sparkles className="w-4 h-4" />,
  'tuto': <GraduationCap className="w-4 h-4" />,
};
