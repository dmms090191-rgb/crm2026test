import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

function cacheKey(panelRole: string, companyId: string | null, targetUserId: string | null) {
  return `pht:${panelRole}:${companyId ?? '_'}:${targetUserId ?? '_'}`;
}

function readCache(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

function writeCache(key: string, tabs: string[]) {
  try { localStorage.setItem(key, JSON.stringify(tabs)); } catch {}
}

export function usePanelHiddenTabs(
  panelRole: string,
  companyId?: string | null,
  targetUserId?: string | null,
) {
  const lsKey = cacheKey(panelRole, companyId ?? null, targetUserId ?? null);
  const cached = readCache(lsKey);

  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(
    () => new Set(cached ?? []),
  );
  const [loaded, setLoaded] = useState(cached !== null);

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
      writeCache(cacheKey(panelRole, companyId ?? null, targetUserId ?? null), final);
      setHiddenTabs(new Set(final));
      setLoaded(true);
    })();

    return () => { cancelled = true; };
  }, [panelRole, companyId, targetUserId]);

  const toggle = useCallback((tabId: string) => {
    setHiddenTabs(prev => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      const arr = Array.from(next);
      writeCache(cacheKey(panelRole, companyId ?? null, targetUserId ?? null), arr);
      persistHiddenTabs(panelRole, companyId ?? null, targetUserId ?? null, next);
      return next;
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
