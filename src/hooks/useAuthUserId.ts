import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Id Auth du compte REELLEMENT connecte.
 *
 * A n'utiliser que pour une preference qui appartient a ce compte-la. Pour un
 * reglage qui appartient a une entite VISUALISEE, c'est l'id de cette entite
 * qu'il faut passer, pas celui-ci.
 */
export function useAuthUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled && user) setUserId(user.id);
    });
    return () => { cancelled = true; };
  }, []);
  return userId;
}
