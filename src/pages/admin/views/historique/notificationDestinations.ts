import type { CategorieHistorique, EntreeHistorique } from '../../../../lib/notificationHistory';
import type { ActiveView } from '../../adminDashboardTypes';

/**
 * OU MENE UNE NOTIFICATION DE L'HISTORIQUE.
 *
 * La regle tranchee par David : l'historique ne s'interpose PAS entre la notification et
 * sa destination. Cliquer « Voir » ouvre la donnee metier — le dossier, le rendez-vous,
 * la conversation — exactement comme un clic dans la cloche. L'historique n'est pas une
 * etape, c'est une archive.
 *
 * Ce fichier ne navigue pas : il dit seulement OU aller. La navigation reste dans
 * AdminDashboard, le seul endroit qui tient les setters de chaque vue. Separer les deux
 * permet de prouver les destinations sans monter React.
 */

/** Ou il faut aller, et ce qu'il faut emporter. */
export type Destination =
  | { vue: ActiveView; quoi: 'rien' }
  | { vue: 'crm-immo'; quoi: 'dossier'; dossierId: string }
  /*
   * Pour les deux chats clients/commerciaux, le source_id est l'INTERLOCUTEUR
   * (client_auth_id, vendor_id). Or ouvrir la conversation reclame l'objet complet :
   * le lead pour un client, le commercial pour un vendeur — et client_auth_id n'est pas
   * le leadId. Il y a donc une resolution a faire au moment du clic.
   *
   * On ne l'evite pas en recopiant le lead dans l'historique : une archive de
   * notifications n'est pas une copie du metier, et une copie se perime.
   */
  | { vue: 'chat-client'; quoi: 'client'; clientAuthId: string }
  | { vue: 'chat-vendeur'; quoi: 'vendeur'; vendorId: string };

const VUES: Record<CategorieHistorique, ActiveView> = {
  client: 'chat-client',
  vendeur: 'chat-vendeur',
  'super-admin': 'chat-super-admin',
  agenda: 'agenda',
  equipe: 'agenda-equipe',
  /* Les quatre categories de rendez-vous vivent dans la MEME vue : c'est deja ce que
     font les quatre gestionnaires de la cloche, qui tous appellent 'propositions-rdv'. */
  propositions: 'propositions-rdv',
  rdv: 'propositions-rdv',
  decalages: 'propositions-rdv',
  'demandes-decalage': 'propositions-rdv',
  'crm-immo': 'crm-immo',
};

/** La vue d'une categorie, sans son chargement : sert aux libelles du bouton Voir. */
export function vueDeCategorie(c: CategorieHistorique): ActiveView {
  return VUES[c];
}

/**
 * La destination d'une entree.
 *
 * Rend `null` quand il n'y a rien a ouvrir : une entree supprimee n'a plus de contenu,
 * et son bouton Voir doit etre absent plutot que de mener a une page vide.
 */
export function destinationDe(e: EntreeHistorique): Destination | null {
  if (e.deleted_at !== null) return null;

  switch (e.category) {
    case 'crm-immo':
      return { vue: 'crm-immo', quoi: 'dossier', dossierId: e.source_id };
    case 'client':
      return { vue: 'chat-client', quoi: 'client', clientAuthId: e.source_id };
    case 'vendeur':
      return { vue: 'chat-vendeur', quoi: 'vendeur', vendorId: e.source_id };
    default:
      return { vue: VUES[e.category], quoi: 'rien' };
  }
}
