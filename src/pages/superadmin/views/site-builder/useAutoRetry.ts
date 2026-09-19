import { useCallback, useEffect, useRef } from 'react';

/*
 * Reprise automatique apres un refus TEMPORAIRE du serveur (trop d'operations en peu de temps).
 * Le serveur annonce le delai ; on relance une seule fois a l'echeance, au plus 3 fois d'affilee, puis on
 * rend la main au client. Toute nouvelle action, ou le demontage de l'ecran, annule la relance prevue.
 */
const MAX_AUTO_RETRIES = 3;

export function useAutoRetry() {
  const timer = useRef<number | null>(null);
  const attempts = useRef(0);

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  /* Programme la relance. Renvoie false si le plafond est atteint : l'ecran doit alors proposer « Réessayer ». */
  const schedule = useCallback((seconds: number, run: () => void): boolean => {
    cancel();
    if (attempts.current >= MAX_AUTO_RETRIES) return false;
    attempts.current += 1;
    timer.current = window.setTimeout(() => { timer.current = null; run(); }, seconds * 1000);
    return true;
  }, [cancel]);

  /* Action volontaire du client : on repart d'un compteur vierge. */
  const reset = useCallback(() => {
    cancel();
    attempts.current = 0;
  }, [cancel]);

  return { schedule, cancel, reset };
}
