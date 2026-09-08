import type { NotifCategory } from './AdminNotificationCards';

/**
 * La cloche et l'en-tete du hub ont ete deplaces dans
 * src/components/notifications/hub/NotifHubChrome : ils sont partages avec le
 * panel Commercial. Le rendu est strictement identique — aucune valeur de
 * style n'a bouge au passage.
 *
 * Ce fichier reste le point d'entree historique, et garde ce qui est propre a
 * la Societe : les titres de ses neuf categories.
 */
export { BellButton, NotifHeader } from '../../../../components/notifications/hub/NotifHubChrome';

/** Titre affiche en en-tete quand une categorie est ouverte. */
const CATEGORY_LABELS: Record<NotifCategory, string> = {
  client: 'Chat Client',
  vendeur: 'Chat Commercial',
  'super-admin': 'Chat Direction',
  agenda: 'Agenda perso',
  equipe: 'Agenda equipe',
  propositions: 'Propositions RDV',
  rdv: 'RDV Confirmes',
  decalages: 'Reponses decalages',
  'demandes-decalage': 'Demandes de decalage',
};

export { CATEGORY_LABELS };
