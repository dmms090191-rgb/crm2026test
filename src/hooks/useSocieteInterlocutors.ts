import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Interlocutor {
  id: string;                    // super_admin_id : L'IDENTITE DE CONVERSATION
  kind: 'talvex' | 'groupe';
  display_name: string;
  company: string;
}

/**
 * Cache de promesses, par compte cible.
 *
 * Le chat et la bulle de notifications ont besoin de la meme liste. Sans ce
 * cache, chacun declencherait son propre appel : meme verite, mais deux
 * requetes et deux instants de resolution differents. Ici, le second
 * consommateur rejoint la promesse deja en vol.
 */
const inFlight = new Map<string, Promise<Interlocutor[]>>();

async function fetchInterlocutors(adminAuthId: string): Promise<Interlocutor[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data: { user } } = await supabase.auth.getUser();

  // En Visu le JWT reste super_admin : la fonction ne peut pas deduire la cible
  // de l'appelant, on la lui nomme.
  const impersonating = Boolean(user && user.id !== adminAuthId);

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-parent-super-admin`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(impersonating ? { target_user_id: adminAuthId } : {}),
    },
  );

  // Un echec ne se rattrape pas en devinant : liste vide, l'appelant decide.
  const body = await res.json().catch(() => ({}));
  return Array.isArray(body?.interlocutors) ? (body.interlocutors as Interlocutor[]) : [];
}

/**
 * Les interlocuteurs d'une Societe : son Groupe parent (toujours), et Talvex
 * uniquement si une conversation existe deja. Cote Societe, chacun est un fil
 * distinct identifie par son `super_admin_id`.
 */
export function useSocieteInterlocutors(adminAuthId: string | null, enabled = true) {
  const [interlocutors, setInterlocutors] = useState<Interlocutor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!adminAuthId || !enabled) { setInterlocutors([]); return; }
    let cancelled = false;
    setLoading(true);

    let p = inFlight.get(adminAuthId);
    if (!p) {
      p = fetchInterlocutors(adminAuthId).catch(() => [] as Interlocutor[]);
      inFlight.set(adminAuthId, p);
      // Le cache ne sert qu'a fusionner les appels concomitants d'un meme
      // rendu : on le relache pour que le prochain montage soit a jour.
      p.finally(() => { inFlight.delete(adminAuthId); });
    }

    p.then(list => {
      if (cancelled) return;
      setInterlocutors(list);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [adminAuthId, enabled]);

  return { interlocutors, loading };
}
