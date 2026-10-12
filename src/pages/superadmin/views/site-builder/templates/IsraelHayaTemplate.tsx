import { lazy, Suspense } from 'react';
import type { TemplateProps } from './templateRegistry';

/**
 * TEMPLATE « ישראל חיה » — l'hote, et RIEN d'autre.
 *
 * Meme role, meme raison que pour le template de numerologie : `templateRegistry.tsx` importe
 * ses templates en STATIQUE et `App.tsx` l'importe. Tout ce qu'un template importe directement
 * entre dans le paquet d'entree, servi a CHAQUE visiteur de Talvex. Ce voyage-ci emmene avec
 * lui three.js, React Three Fiber et un lecteur de film : plusieurs mega-octets, pour un site
 * que la quasi-totalite des visiteurs n'ouvrira jamais.
 *
 * Cet hote ne porte donc aucune dependance lourde. Le voyage n'est telecharge que lorsque
 * quelqu'un l'ouvre vraiment. Ne jamais remplacer ce `lazy()` par un import direct.
 */
const Voyage = lazy(() => import('./israel-haya/IsraelHayaSite'));

/** Attente aux couleurs de la nuit du site : aucun saut de fond quand le voyage arrive. */
function Attente() {
  return (
    <div
      data-testid="ih-attente"
      style={{
        display: 'grid',
        placeItems: 'center',
        width: '100%',
        height: '100svh',
        minHeight: 520,
        background: '#070a16',
      }}
    >
      <span
        aria-label="טוען"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: '2px solid rgba(232,205,147,0.22)',
          borderTopColor: 'rgba(232,205,147,0.9)',
          animation: 'ihAttente 900ms linear infinite',
        }}
      />
      <style>{`
        @keyframes ihAttente { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { [aria-label="טוען"] { animation: none; } }
      `}</style>
    </div>
  );
}

export default function IsraelHayaTemplate({ onDomainLogin }: TemplateProps = {}) {
  return (
    <Suspense fallback={<Attente />}>
      {/*
        « Prendre rendez-vous » mene a la connexion quand le site est servi sur un domaine, et
        ne fait rien sinon. Le jour ou la praticienne aura un systeme de reservation, c'est ce
        seul point qu'on rebranchera.
      */}
      <Voyage onReserver={onDomainLogin} />
    </Suspense>
  );
}
