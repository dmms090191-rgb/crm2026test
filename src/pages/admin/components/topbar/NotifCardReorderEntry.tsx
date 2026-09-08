/**
 * Ligne de reorganisation d'une carte de notification.
 *
 * Le composant vit desormais dans src/components/notifications/hub/ : il est
 * partage par le panel Societe et le panel Commercial. Ce fichier reste comme
 * point d'entree historique pour ne casser aucun import existant.
 */
export { default } from '../../../../components/notifications/hub/NotifHubReorderRow';
