import { useEffect, useState } from 'react';

const REQUETE = '(min-width: 768px)';

const mesurer = () => (typeof window === 'undefined' || typeof window.matchMedia !== 'function'
  ? true
  : window.matchMedia(REQUETE).matches);

/**
 * VRAI AU-DELA DE 768 PX — le meme seuil que le prefixe `md:` de Tailwind.
 *
 * Le CRM ne monte plus qu'UNE presentation (tableau OU cartes) : l'autre, montee pour rien et
 * cachee par CSS, doublait le travail de rendu avec des milliers de leads. Si ce booleen
 * restait faux apres un redimensionnement, la presentation montee serait aussi celle que
 * le CSS cache : l'ecran serait VIDE. Il ne repose donc pas sur un seul evenement :
 * `change` de matchMedia ET `resize` de la fenetre (une rotation de tablette, ou une
 * emulation d'appareil, a laisse passer le premier au harnais le 19/11).
 */
export function useEstBureau(): boolean {
  const [bureau, setBureau] = useState(mesurer);
  useEffect(() => {
    const relire = () => setBureau(mesurer());
    relire();
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(REQUETE) : null;
    mq?.addEventListener('change', relire);
    window.addEventListener('resize', relire);
    window.addEventListener('orientationchange', relire);
    return () => {
      mq?.removeEventListener('change', relire);
      window.removeEventListener('resize', relire);
      window.removeEventListener('orientationchange', relire);
    };
  }, []);
  return bureau;
}
