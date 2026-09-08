import { useState, useCallback, useEffect, useRef } from 'react';
import { reconcileOrder, moveInOrder } from '../lib/actionOrder';
import { prefCacheKey, readPrefCache, writePrefCache, loadPrefRemote, savePrefRemote } from './actionPrefsStorage';

/**
 * Ordre visuel d'une petite liste d'actions, par PROPRIETAIRE.
 *
 * C'est une PREFERENCE UX du proprietaire — a ne pas confondre avec le
 * masquage, qui est un controle fonctionnel decide par Talvex et vit dans
 * `useActionVisibility`, sous une cle distincte.
 *
 * En Visu, l'appelant passe l'id du Groupe VISUALISE : le reglage suit
 * l'entite regardee, jamais le JWT.
 */
export function useActionOrder(ownerUserId: string | null, storageKey: string, presentIds: string[]) {
  const owner = ownerUserId ?? '';
  const lsKey = owner ? prefCacheKey(storageKey, owner) : '';

  const [saved, setSaved] = useState<string[] | null>(null);
  const [reordering, setReordering] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  // Le cache local peint tout de suite ; la base fait autorite juste apres.
  const cacheRead = useRef<string>('');
  if (lsKey && cacheRead.current !== lsKey) {
    cacheRead.current = lsKey;
    setSaved(readPrefCache(lsKey));
  }

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    loadPrefRemote(owner, storageKey).then(remote => {
      if (cancelled || !remote) return;
      setSaved(remote);
      writePrefCache(prefCacheKey(storageKey, owner), remote);
    });
    return () => { cancelled = true; };
  }, [owner, storageKey]);

  const presentKey = presentIds.join('|');
  const order = reconcileOrder(saved, presentIds);
  const shown = reordering ? draft : order;

  const startReorder = useCallback(() => {
    setDraft(reconcileOrder(saved, presentKey.split('|')));
    setReordering(true);
  }, [saved, presentKey]);

  const cancelReorder = useCallback(() => {
    setReordering(false);
    setDraft([]);
  }, []);

  const confirmReorder = useCallback(() => {
    const next = draft;
    setSaved(next);
    setReordering(false);
    setDraft([]);
    if (!owner) return;
    writePrefCache(prefCacheKey(storageKey, owner), next);
    savePrefRemote(owner, storageKey, next).catch(() => { /* le cache local tient */ });
  }, [draft, owner, storageKey]);

  const move = useCallback((from: number, to: number) => {
    setDraft(prev => moveInOrder(prev, from, to));
  }, []);

  return { order: shown, reordering, startReorder, cancelReorder, confirmReorder, move };
}
