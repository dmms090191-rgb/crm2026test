import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { cacheKey, readCache, writeCache } from '../lib/hiddenTabsCache';

/*
 * ---------- UNE ECRITURE REFUSEE NE DOIT PAS SE FAIRE PASSER POUR UNE REUSSITE ----------
 *
 * La RLS de `panel_hidden_tabs` ouvre la LECTURE a tous et reserve
 * INSERT / UPDATE / DELETE au seul `super_admin`. Mesure faite en base, role par role :
 *
 *   Talvex (super_admin)              INSERT -> ACCEPTE
 *   Groupe (company_super_admin)      INSERT -> 42501
 *   Groupe (company_super_admin)      UPDATE -> 0 ligne touchee, ET AUCUNE ERREUR LEVEE
 *   Societe (admin)                   INSERT -> 42501
 *
 * La troisieme ligne est le piege : supabase-js rend { error: null } pour un UPDATE que la
 * RLS refuse. Il ne refuse pas la requete, il ne trouve simplement aucune ligne a modifier.
 *
 * Ce hook ignorait TOUT resultat d'ecriture. Combine au cache localStorage ecrit avant
 * l'aller-retour, ca donnait le pire enchainement possible : la carte se grisait, l'action
 * semblait prise, puis l'effet de chargement relisait la base — qui n'avait rien recu — et
 * ECRASAIT le cache. Tout revenait, sans un mot, au rechargement suivant.
 *
 * Desormais : on applique de facon optimiste, on ECOUTE le resultat, et on REVIENT EN
 * ARRIERE si l'ecriture n'a pas abouti — etat et cache ensemble. L'utilisateur voit la
 * carte revenir tout de suite, au lieu de le decouvrir une heure plus tard.
 */

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
  const [erreur, setErreur] = useState('');

  // companyId / targetUserId arrivent de facon asynchrone : la cle change apres
  // le premier render, or l'initialiseur de useState ne rejoue jamais. On relit
  // donc le cache pendant le render — React re-rend avant de peindre, sans flash.
  if (state.key !== lsKey) {
    const c = readCache(lsKey);
    setState({ key: lsKey, tabs: new Set<string>(c ?? []), loaded: c !== null });
  }

  const hiddenTabs = state.tabs;
  const loaded = state.loaded;

  /* L'etat courant, lisible depuis `toggle` sans le mettre dans ses dependances :
     sinon la fonction change d'identite a chaque bascule. */
  const tabsRef = useRef(state.tabs);
  useEffect(() => { tabsRef.current = state.tabs; }, [state.tabs]);

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
    const key = cacheKey(panelRole, companyId ?? null, targetUserId ?? null);
    const avant = tabsRef.current;

    const apres = new Set(avant);
    if (apres.has(tabId)) apres.delete(tabId);
    else apres.add(tabId);

    /* Optimiste : l'interface repond tout de suite. */
    setErreur('');
    writeCache(key, Array.from(apres));
    setState(prev => ({ ...prev, tabs: apres }));

    /* Puis on ECOUTE. Le side effect vit ici, et non dans l'updater de setState :
       un updater doit etre pur, et React le rejoue en mode strict. */
    void persistHiddenTabs(panelRole, companyId ?? null, targetUserId ?? null, apres)
      .then(({ error }) => {
        if (!error) return;
        /* Retour en arriere, etat ET cache : sans ca, le cache garderait une verite
           que la base n'a pas, jusqu'au prochain chargement qui l'ecraserait. */
        writeCache(key, Array.from(avant));
        setState(prev => ({ ...prev, tabs: avant }));
        setErreur(error);
      });
  }, [panelRole, companyId, targetUserId]);

  return { hiddenTabs, loaded, toggle, erreur };
}

/**
 * Enregistre la liste masquee, et DIT si ca n'a pas marche.
 *
 * Deux refus a distinguer, parce qu'ils ne se signalent pas de la meme facon :
 *   - un INSERT refuse leve une erreur (42501) ;
 *   - un UPDATE refuse n'en leve AUCUNE : il touche simplement zero ligne.
 * D'ou le `.select('id')` apres l'update, et la comparaison du nombre de lignes rendues.
 */
async function persistHiddenTabs(
  panelRole: string,
  companyId: string | null,
  targetUserId: string | null,
  tabs: Set<string>,
): Promise<{ error: string | null }> {
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

  const { data: existing, error: erreurLecture } = await query.maybeSingle();
  if (erreurLecture) return { error: refus(erreurLecture.message) };

  if (existing) {
    const { data, error } = await supabase
      .from('panel_hidden_tabs')
      .update({ hidden_tabs: arr, updated_at: now })
      .eq('id', existing.id)
      .select('id');
    if (error) return { error: refus(error.message) };
    /* ZERO ligne rendue = la RLS a refuse, en silence. C'est le cas mesure pour un
       Groupe en Visu : supabase-js rend { error: null } et ne touche rien. */
    if (!data || data.length === 0) return { error: refus('aucune ligne modifiee') };
    return { error: null };
  }

  const { error } = await supabase.from('panel_hidden_tabs').insert({
    panel_role: panelRole,
    company_id: companyId,
    target_user_id: targetUserId,
    hidden_tabs: arr,
    updated_at: now,
  });
  if (error) return { error: refus(error.message) };
  return { error: null };
}

/** Un message lisible : le brut de Postgres ne veut rien dire pour un utilisateur. */
function refus(brut: string): string {
  if (/row-level security|aucune ligne modifiee|42501/i.test(brut)) {
    return "Seul Talvex peut masquer ou afficher ces elements.";
  }
  return `L'enregistrement a echoue : ${brut}`;
}
