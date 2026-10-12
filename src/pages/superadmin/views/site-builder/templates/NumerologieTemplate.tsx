import { lazy, Suspense } from 'react';
import type { TemplateProps } from './templateRegistry';

/**
 * TEMPLATE « NUMEROLOGIE » — l'hote, et RIEN d'autre.
 *
 * Ce fichier existe uniquement pour tenir la FRONTIERE DE CHARGEMENT, et c'est la chose la plus
 * importante de tout le module.
 *
 * `templateRegistry.tsx` importe ses neuf templates en STATIQUE, et il est lui-meme importe par
 * `App.tsx`. Tout ce qu'un template importe directement entre donc dans le paquet d'entree,
 * servi a CHAQUE visiteur de Talvex — y compris ceux qui ne verront jamais ce site. Un import
 * direct de la scene y ferait entrer three.js, @react-three/fiber, drei et le post-traitement,
 * soit plus d'un mega-octet, sans qu'aucune erreur ne le signale : cela ne se verrait qu'a la
 * taille du paquet. C'est exactement l'avertissement ecrit dans BoutiqueVue3D.tsx.
 *
 * D'ou cet hote : il ne contient aucune dependance 3D. La scene n'est telechargee que lorsque
 * quelqu'un ouvre reellement ce site.
 *
 * NE JAMAIS remplacer ce `lazy()` par un import direct, meme « juste pour tester ».
 */
const Scene = lazy(() => import('./numerologie/NumerologieSite'));

/** Attente sobre, aux couleurs de la scene : aucun saut de fond au moment ou elle arrive. */
function Attente() {
  return (
    <div
      data-testid="numerologie-attente"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100svh',
        minHeight: 540,
        background: 'linear-gradient(to bottom, #040a1b 0%, #0a1527 60%, #16233c 100%)',
      }}
    >
      <span
        aria-label="Chargement de la scène"
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: '2px solid rgba(255, 213, 138, 0.26)',
          borderTopColor: 'rgba(255, 213, 138, 0.9)',
          animation: 'numerologieTourne 900ms linear infinite',
        }}
      />
      <style>{`
        @keyframes numerologieTourne { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="Chargement de la scène"] { animation: none; }
        }
      `}</style>
    </div>
  );
}

export default function NumerologieTemplate({ onDomainLogin }: TemplateProps = {}) {
  return (
    <Suspense fallback={<Attente />}>
      {/*
        `onDecouvrir` mene pour l'instant a la connexion quand le site est servi sur un domaine,
        et ne fait rien sinon. Le module de numerologie prendra sa place a l'etape suivante :
        c'est le seul point a changer, et il est ici.
      */}
      <Scene onDecouvrir={onDomainLogin} />
    </Suspense>
  );
}
