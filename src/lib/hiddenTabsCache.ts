/**
 * Cache local des onglets masques, partage par les deux implementations :
 *   - usePanelHiddenTabs  (Societe, Groupe, Vendeur, Client)  -> table panel_hidden_tabs
 *   - useSAHiddenTabs     (Talvex Administrateur)             -> user_preferences.sa_hidden_tabs
 *
 * Le format de cle est INCHANGE par rapport a l'existant : les preferences
 * deja presentes dans le navigateur restent lisibles telles quelles.
 */
export function cacheKey(panelRole: string, companyId: string | null, targetUserId: string | null): string {
  return `pht:${panelRole}:${companyId ?? '_'}:${targetUserId ?? '_'}`;
}

export function readCache(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

export function writeCache(key: string, tabs: string[]) {
  try { localStorage.setItem(key, JSON.stringify(tabs)); } catch { /* quota / mode prive */ }
}
