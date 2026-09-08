import { useState, useCallback, useEffect, useRef } from 'react';
import { reconcileHidden } from '../lib/actionOrder';
import { prefCacheKey, readPrefCache, writePrefCache, loadPrefRemote, savePrefRemote } from './actionPrefsStorage';

/**
 * Actions MASQUEES pour un proprietaire.
 *
 * Concept distinct de l'ordre : ici on ne decide pas d'une preference de
 * confort mais de ce qui est disponible. Le reglage est pris par Talvex en
 * Visu ; le Groupe, lui, ne fait que le SUBIR — il lit la meme cle mais
 * l'interface de modification ne lui est jamais rendue.
 *
 * Cle distincte de celle de l'ordre : masquer ou reafficher ne touche donc
 * jamais a l'ordre choisi par le Groupe, et inversement.
 *
 * `canEdit` ne debloque que le brouillon et l'ecriture. La lecture, elle, est
 * toujours active : c'est ainsi que le Groupe voit la consequence du reglage.
 */
export function useActionVisibility(
  ownerUserId: string | null,
  storageKey: string,
  presentIds: string[],
  canEdit: boolean,
) {
  const owner = ownerUserId ?? '';
  const lsKey = owner ? prefCacheKey(storageKey, owner) : '';

  const [saved, setSaved] = useState<string[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

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
  const hidden = reconcileHidden(saved, presentIds);
  // Hors edition, c'est l'etat enregistre qui s'applique — y compris pour le
  // Groupe connecte normalement, qui n'entre jamais en edition.
  const shown = editing ? draft : hidden;

  const startEdit = useCallback(() => {
    if (!canEdit) return;
    setDraft(reconcileHidden(saved, presentKey.split('|')));
    setEditing(true);
  }, [canEdit, saved, presentKey]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft([]);
  }, []);

  const confirmEdit = useCallback(() => {
    if (!canEdit) { setEditing(false); setDraft([]); return; }
    const next = draft;
    setSaved(next);
    setEditing(false);
    setDraft([]);
    if (!owner) return;
    writePrefCache(prefCacheKey(storageKey, owner), next);
    savePrefRemote(owner, storageKey, next).catch(() => { /* le cache local tient */ });
  }, [canEdit, draft, owner, storageKey]);

  /** Masque / reaffiche UN id dans le brouillon. Sans droit : sans effet. */
  const toggle = useCallback((id: string) => {
    if (!canEdit) return;
    setDraft(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, [canEdit]);

  return {
    /** Ids masques a appliquer maintenant. */
    hidden: shown,
    /** Etat enregistre, quel que soit le brouillon. */
    savedHidden: hidden,
    editing,
    canEdit,
    startEdit,
    cancelEdit,
    confirmEdit,
    toggle,
  };
}
