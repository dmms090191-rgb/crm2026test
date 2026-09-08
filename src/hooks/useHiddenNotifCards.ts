import { usePanelHiddenTabs } from './usePanelHiddenTabs';

export function useHiddenNotifCards(
  companyId?: string | null,
  targetUserId?: string | null,
) {
  return usePanelHiddenTabs('admin_notifications', companyId, targetUserId);
}

/**
 * Categories de notification masquees du panel Commercial.
 *
 * Meme table que le panel Societe (`panel_hidden_tabs`), autre `panel_role` :
 * les deux configurations ne se croisent jamais.
 *
 * Le verrou n'est pas seulement dans l'interface. La RLS de `panel_hidden_tabs`
 * ouvre la lecture a tous mais reserve INSERT / UPDATE / DELETE au role
 * super_admin. Un Commercial, une Societe ou un Groupe peut donc lire ce que
 * Talvex a masque, mais aucun ne peut le reafficher, meme en contournant
 * l'interface. C'est ce qui rendra le pilotage par forfaits fiable.
 */
export function useHiddenVendorNotifCards(
  companyId?: string | null,
  targetUserId?: string | null,
) {
  return usePanelHiddenTabs('vendor_notifications', companyId, targetUserId);
}
