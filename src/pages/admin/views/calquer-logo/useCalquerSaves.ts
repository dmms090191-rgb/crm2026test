import { useState, useEffect, useCallback } from 'react';
import type { SavedSession } from './calquer-logo-save-types';
import { listSessions, deleteSession, renameSession } from './calquer-logo-save-api';

export function useCalquerSaves() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listSessions();
      setSessions(list);
    } catch {
      /* silent */
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteSession(id);
      setSessions(s => s.filter(x => x.id !== id));
    } catch {
      /* silent */
    }
  }, []);

  const handleRename = useCallback(async (id: string, title: string) => {
    try {
      await renameSession(id, title);
      setSessions(s => s.map(x => x.id === id ? { ...x, title } : x));
    } catch {
      /* silent */
    }
  }, []);

  return { sessions, loading, refresh, handleDelete, handleRename };
}
