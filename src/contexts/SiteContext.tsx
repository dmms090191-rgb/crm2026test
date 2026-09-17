import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  LOADING_SITE_CONTEXT, actorFromUser, buildCompanyContext, buildPlatformContext,
  type SiteContextRow, type SiteContextState, type SiteScope,
} from '../lib/siteContextModel';

/*
 * Contexte unique du module Site.
 * - Acteur reel : lu dans la session Supabase (le JWT ne change jamais en Visu).
 * - Cible : l'entreprise NOMMEE par l'ecran appelant (prop targetCompanyId). Aucun repli
 *   silencieux sur l'entreprise de l'acteur : sans cible, le statut est 'no_target'.
 * - Droit de gestion et relation acteur/cible : decides par le serveur (RPC get_site_context).
 */

interface SiteContextValue extends SiteContextState {
  refresh: () => void;
}

const SiteCtx = createContext<SiteContextValue>({ ...LOADING_SITE_CONTEXT, refresh: () => {} });

interface ProviderProps {
  scope: SiteScope;
  targetCompanyId: string | null;
  children: ReactNode;
}

export function SiteContextProvider({ scope, targetCompanyId, children }: ProviderProps) {
  const [state, setState] = useState<SiteContextState>(LOADING_SITE_CONTEXT);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState(LOADING_SITE_CONTEXT);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const actor = session?.user ? actorFromUser(session.user) : null;
      let next: SiteContextState;
      if (scope === 'platform') {
        next = buildPlatformContext(actor);
      } else if (!actor || !targetCompanyId) {
        next = buildCompanyContext(actor, targetCompanyId, null);
      } else {
        const { data, error } = await supabase.rpc('get_site_context', { p_company_id: targetCompanyId });
        if (error) {
          next = { ...buildCompanyContext(actor, targetCompanyId, null), status: 'error' };
        } else {
          const row = Array.isArray(data) && data.length > 0 ? (data[0] as SiteContextRow) : null;
          next = buildCompanyContext(actor, targetCompanyId, row);
        }
      }
      if (!cancelled) setState(next);
    })();
    return () => { cancelled = true; };
  }, [scope, targetCompanyId, tick]);

  const refresh = useCallback(() => setTick(v => v + 1), []);

  return <SiteCtx.Provider value={{ ...state, refresh }}>{children}</SiteCtx.Provider>;
}

export function useSiteContext(): SiteContextValue {
  return useContext(SiteCtx);
}
