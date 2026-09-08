import { useCompanyId } from '../../../contexts/CompanyIdContext';
import { useVendorAdminIdentity } from '../../../hooks/useVendorAdminIdentity';
import { useHiddenVendorNotifCards } from '../../../hooks/useHiddenNotifCards';
import { useNotifCardOrder } from '../../../hooks/useNotifCardOrder';
import { VENDOR_NOTIF_KEYS } from '../components/topbar/vendorNotifCategories';
import type { ImpersonatedVendor } from '../VendorDashboard';

/**
 * Preferences du hub Notifications du Commercial : identite de l'administration,
 * ordre des categories, categories masquees, et qui a le droit de quoi.
 *
 * Les deux personnalisations restent separees jusque dans leur stockage :
 *  - l'ORDRE vit dans user_preferences.sidebar_orders['vendor_notif_cards'] ;
 *  - le MASQUAGE vit dans panel_hidden_tabs (panel_role 'vendor_notifications'),
 *    dont la RLS reserve l'ecriture au role super_admin.
 * Un forfait pourra donc piloter le masquage sans qu'aucun niveau inferieur
 * puisse le defaire, meme en contournant l'interface.
 */
export function useVendorNotifPrefs(
  vendorDbId: string | null,
  connectedAuthId: string | null,
  impersonatedVendor: ImpersonatedVendor | undefined,
  canHideTabs: boolean | undefined,
) {
  const companyId = useCompanyId();
  const adminIdentity = useVendorAdminIdentity(vendorDbId);

  // PROPRIETAIRE des preferences : toujours un id AUTH, jamais vendors.id.
  // user_preferences.user_id et panel_hidden_tabs.target_user_id sont des cles
  // etrangeres vers auth.users. En Visu, si le Commercial visualise n'a pas de
  // compte auth, on ne cible personne — plutot que de viser le compte connecte.
  const ownerId = impersonatedVendor
    ? (impersonatedVendor.auth_user_id ?? null)
    : connectedAuthId;

  const { hiddenTabs: hiddenNotifCards, toggle: toggleNotifCard } =
    useHiddenVendorNotifCards(companyId, ownerId);

  const order = useNotifCardOrder(ownerId, companyId, {
    concept: 'vendor_notif_cards',
    defaultKeys: [...VENDOR_NOTIF_KEYS],
  });

  // REORGANISER : personnalisation d'interface du titulaire du panel. En Visu,
  // seul Talvex peut ecrire les preferences d'un autre compte (RLS de
  // user_preferences : proprietaire OU super_admin). Afficher le bouton aux
  // autres niveaux proposerait une action qui ne persisterait pas.
  const canReorderNotifCards = !impersonatedVendor || canHideTabs === true;

  return {
    adminIdentity,
    hiddenNotifCards,
    toggleNotifCard,
    order,
    canReorderNotifCards,
    // MASQUER : decide de ce qui existe, pilotera les forfaits. Talvex seul.
    canHideNotifCards: canHideTabs === true,
  };
}
