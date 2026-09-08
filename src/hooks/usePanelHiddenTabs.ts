import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { cacheKey, readCache, writeCache } from '../lib/hiddenTabsCache';

export function usePanelHiddenTabs(
  panelRole: string,
  companyId?: string | null,
  targetUserId?: string | null,
) {
  const lsKey = cacheKey(panelRole, companyId ?? null, targetUserId ?? null);
  const [state, setState] = useState(() => {
    const c = readCache(lsKey);
    return { key: lsKey, tabs: new Set<string>(c ?? []), loaded: c !== null };
  });

  // companyId / targetUserId arrivent de facon asynchrone : la cle change apres
  // le premier render, or l'initialiseur de useState ne rejoue jamais. On relit
  // donc le cache pendant le render — React re-rend avant de peindre, sans flash.
  if (state.key !== lsKey) {
    const c = readCache(lsKey);
    setState({ key: lsKey, tabs: new Set<string>(c ?? []), loaded: c !== null });
  }

  const hiddenTabs = state.tabs;
  const loaded = state.loaded;

  useEffect(() => {
    if (!panelRole) return;
    let cancelled = false;

    (async () => {
      let resolved: string[] | null = null;

      if (targetUserId) {
        let q = supabase
          .from('panel_hidden_tabs')
          .select('hidden_tabs')
          .eq('panel_role', panelRole)
          .eq('target_user_id', targetUserId);
        if (companyId) q = q.eq('company_id', companyId);
        else q = q.is('company_id', null);
        const { data } = await q.maybeSingle();
        if (data?.hidden_tabs && Array.isArray(data.hidden_tabs)) {
          resolved = data.hidden_tabs as string[];
        }
      }

      if (!resolved) {
        let q = supabase
          .from('panel_hidden_tabs')
          .select('hidden_tabs')
          .eq('panel_role', panelRole)
          .is('target_user_id', null);
        if (companyId) q = q.eq('company_id', companyId);
        else q = q.is('company_id', null);
        const { data } = await q.maybeSingle();
        if (data?.hidden_tabs && Array.isArray(data.hidden_tabs)) {
          resolved = data.hidden_tabs as string[];
        }
      }

      if (cancelled) return;
      const final = resolved ?? [];
      const key = cacheKey(panelRole, companyId ?? null, targetUserId ?? null);
      writeCache(key, final);
      setState({ key, tabs: new Set(final), loaded: true });
    })();

    return () => { cancelled = true; };
  }, [panelRole, companyId, targetUserId]);

  const toggle = useCallback((tabId: string) => {
    setState(prev => {
      const next = new Set(prev.tabs);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      const arr = Array.from(next);
      writeCache(cacheKey(panelRole, companyId ?? null, targetUserId ?? null), arr);
      persistHiddenTabs(panelRole, companyId ?? null, targetUserId ?? null, next);
      return { ...prev, tabs: next };
    });
  }, [panelRole, companyId, targetUserId]);

  return { hiddenTabs, loaded, toggle };
}

async function persistHiddenTabs(
  panelRole: string,
  companyId: string | null,
  targetUserId: string | null,
  tabs: Set<string>,
) {
  const arr = Array.from(tabs);
  const now = new Date().toISOString();

  let query = supabase
    .from('panel_hidden_tabs')
    .select('id')
    .eq('panel_role', panelRole);

  if (companyId) query = query.eq('company_id', companyId);
  else query = query.is('company_id', null);

  if (targetUserId) query = query.eq('target_user_id', targetUserId);
  else query = query.is('target_user_id', null);

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    await supabase
      .from('panel_hidden_tabs')
      .update({ hidden_tabs: arr, updated_at: now })
      .eq('id', existing.id);
  } else {
    await supabase.from('panel_hidden_tabs').insert({
      panel_role: panelRole,
      company_id: companyId,
      target_user_id: targetUserId,
      hidden_tabs: arr,
      updated_at: now,
    });
  }
}
