import { useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { useSuperAdminsData } from '../pages/superadmin/views/super-admins/useSuperAdminsData';
import { usePrefersReducedMotion } from './useTalixy';

/*
 * TALIXY — carte compteur « Groupes » du dashboard.
 *
 * Source de verite : la MEME que la vue « Liste des groupes » — useSuperAdminsData()
 * -> edge function list-company-super-admins -> list.length. Aucune valeur en dur.
 * Rechargee a chaque affichage du dashboard (montage) et au retour de focus de la fenetre.
 * Le chiffre s'anime doucement quand la valeur change (jamais en mouvement reduit).
 * L'icone Groupe est celle de l'onglet « Liste des groupes » (Shield), pour rester coherent.
 */

/** Interpolation douce du compteur (~450 ms, freinage cubique). */
function useCountTween(target: number, animate: boolean): number {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    if (!animate || fromRef.current === target) { fromRef.current = target; setShown(target); return; }
    const from = fromRef.current;
    fromRef.current = target;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 450);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(from + (target - from) * e));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, animate]);
  return animate ? shown : target;
}

export default function TalixyGroupesCard() {
  const { list, loading, refresh } = useSuperAdminsData();
  const reduced = usePrefersReducedMotion();

  // Retour de focus sur la fenetre : la vraie valeur est relue.
  useEffect(() => {
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const count = list.length;
  const shown = useCountTween(count, !reduced);
  const empty = loading && count === 0;

  return (
    <div className="tx-count-card tx-anim tx-rise" data-testid="talixy-groupes" style={{ animationDelay: '300ms' }}>
      <span className="tx-count-icon" aria-hidden><Shield size={20} strokeWidth={1.6} /></span>
      <span className="tx-count-value" aria-label={`${count} groupes`}>{empty ? '—' : shown}</span>
      <span className="tx-count-caption">
        {count === 1 ? 'Groupe actif dans Talvex' : 'Groupes actifs dans Talvex'}
      </span>
    </div>
  );
}
