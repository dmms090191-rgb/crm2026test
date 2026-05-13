import type { ActiveView } from './AdminDashboard';

export const BREADCRUMB_LABELS: Record<ActiveView, string> = {
  'vue-ensemble': "Vue d'ensemble",
  'info-admin': 'Info admin',
  'inscription': 'Inscription',
  'import-leads': 'Import de leads',
  'ajouter-leads': 'Ajouter leads',
  'crm': 'Crm',
  'ajouter-vendeur': 'Ajouter vendeur',
  'liste-vendeurs': 'Liste vendeurs',
  'chat-client': 'Chat Client',
  'chat-vendeur': 'Chat Vendeur',
  'agenda': 'Agenda perso',
  'agenda-equipe': 'Agenda équipe',
  'propositions-rdv': 'Propositions RDV',
  'statuts': 'Statuts',
  'documentation-crm': 'Documentation CRM',
  'system': 'System',
  'sauvegarde': 'Sauvegarde & restauration',
};
