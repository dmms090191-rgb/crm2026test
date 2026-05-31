import type { SiteTab } from './SiteTabs';
import type { SiteTabConfig } from './SiteTabReorderModal';

export type SiteOwnerType = 'super_admin' | 'admin_company' | 'crm_societe';

export const CANONICAL_TAB_ORDER: SiteTab[] = ['domaine', 'templates', 'studio', 'apercu'];
export const DEFAULT_TAB_CONFIG: SiteTabConfig = { order: CANONICAL_TAB_ORDER, hidden: [] };

export function reconcileTabConfig(saved: SiteTabConfig): SiteTabConfig {
  const validTabs = new Set<SiteTab>(CANONICAL_TAB_ORDER);
  const cleanOrder = saved.order.filter(id => validTabs.has(id));
  const present = new Set(cleanOrder);
  for (const id of CANONICAL_TAB_ORDER) {
    if (!present.has(id)) {
      const canonicalIdx = CANONICAL_TAB_ORDER.indexOf(id);
      let insertAt = cleanOrder.length;
      for (let i = 0; i < cleanOrder.length; i++) {
        if (CANONICAL_TAB_ORDER.indexOf(cleanOrder[i]) > canonicalIdx) {
          insertAt = i;
          break;
        }
      }
      cleanOrder.splice(insertAt, 0, id);
    }
  }
  const cleanHidden = (saved.hidden ?? []).filter(id => validTabs.has(id));
  return { order: cleanOrder, hidden: cleanHidden };
}
