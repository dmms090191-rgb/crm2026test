import { useCallback, useEffect, useState } from 'react';

/**
 * RENDRE UNE LONGUE LISTE PAR TRANCHES.
 *
 * 5 000 lignes de tableau montees d'un coup figent un telephone plusieurs secondes : chaque
 * ligne porte des boutons, des pastilles, des modales potentielles. On en monte `pas`, puis
 * `pas` de plus chaque fois que la sentinelle (posee sous la derniere) approche de l'ecran.
 * Rien n'est cache a l'utilisateur : le compteur affiche le total, et le bouton « Afficher
 * plus » reste la si l'observateur n'est pas disponible.
 *
 * La sentinelle est une REF DE RAPPEL, pas un `useRef` : elle n'apparait qu'une fois le
 * chargement termine, et un `useRef` ne previent personne quand il se remplit — l'observateur
 * pose avant restait sans cible et le defilement ne chargeait jamais la suite (defaut trouve
 * au harnais le 19/11, sur 5 000 leads).
 *
 * `cle` : quand elle change (autre onglet, autre recherche, autre filtre), on repart d'une
 * tranche — la liste est une autre liste.
 */
export function useRenduProgressif<T>(liste: T[], cle: string, pas = 200) {
  const [etat, setEtat] = useState({ cle, limite: pas });
  const [cible, setCible] = useState<HTMLDivElement | null>(null);
  /* Une autre liste : on repart d'une tranche DANS CE RENDU (etat derive), pas dans un effet
     qui laisserait d'abord monter des milliers de lignes de l'ancienne limite. */
  if (etat.cle !== cle) setEtat({ cle, limite: pas });
  const limite = etat.cle === cle ? etat.limite : pas;
  const setLimite = useCallback((f: (l: number) => number) => setEtat(e => ({ ...e, limite: f(e.limite) })), []);

  useEffect(() => {
    if (!cible || limite >= liste.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entrees => {
      if (entrees.some(e => e.isIntersecting)) setLimite(l => l + pas);
    }, { rootMargin: '800px 0px' });
    io.observe(cible);
    return () => io.disconnect();
  }, [cible, limite, liste.length, pas, setLimite]);

  const afficherPlus = useCallback(() => setLimite(l => l + pas), [pas, setLimite]);
  /** Garantit qu'une position (le lead du mode travail) est montee avant d'y defiler. */
  const inclure = useCallback((index: number) => setLimite(l => (index >= l ? index + pas : l)), [pas, setLimite]);

  return {
    visibles: limite >= liste.length ? liste : liste.slice(0, limite),
    restant: Math.max(0, liste.length - limite),
    sentinelle: setCible,
    afficherPlus,
    inclure,
  };
}
