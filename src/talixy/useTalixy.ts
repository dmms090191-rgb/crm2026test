import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/*
 * TALIXY — etat commun a tous les composants Talixy.
 *   active        : le theme Talixy est le theme applique ;
 *   reducedMotion : l'utilisateur a demande moins de mouvement (reglage du systeme) ;
 *   motion        : animations et roue 3D autorisees (Talixy actif ET mouvement non reduit).
 *
 * « Mouvement reduit » vient uniquement du reglage `prefers-reduced-motion` du navigateur ou du systeme :
 * rien ne le force pour les vrais utilisateurs (les tests automatiques le demandent de leur cote).
 */

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function readReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}

/** Suit `prefers-reduced-motion` en direct : un changement de reglage systeme s'applique sans rechargement. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readReducedMotion);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export interface TalixyState {
  active: boolean;
  reducedMotion: boolean;
  motion: boolean;
}

export function useTalixy(): TalixyState {
  const { theme } = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  const active = theme === 'talixy';
  return { active, reducedMotion, motion: active && !reducedMotion };
}
