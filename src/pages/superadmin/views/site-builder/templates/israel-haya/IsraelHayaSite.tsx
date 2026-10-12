import { useEffect, useMemo, useRef, useState } from 'react';
import { CHAPITRES, chapitreActif, hauteurTotale, progressionDe } from './chapitres';
import FilmScrub from './FilmScrub';
import SceneTempsReel from './SceneTempsReel';
import BandesTexte from './BandesTexte';
import SaisieNombres from './SaisieNombres';
import SectionsBas from './SectionsBas';
import { usePolicesHebraiques, useProgressionVoyage, useReglagesIsraelHaya } from './useVoyage';

/**
 * ISRAEL HAYA — le voyage, d'un seul tenant.
 *
 * La page est HAUTE : sa hauteur est la somme des chapitres. Par-dessus, une scene collante
 * occupe l'ecran et ne bouge plus. Le defilement ne fait donc pas defiler une page, il
 * DEPLACE une tete de lecture dans une histoire — et c'est tout le principe.
 *
 * Un seul chapitre est monte a la fois. Le precedent et le suivant sont consideres « proches »
 * pour que leur film ait le temps d'arriver, mais rien d'autre ne vit en meme temps : six
 * contextes video et une scene 3D qui coexisteraient videraient une batterie en deux minutes.
 *
 * Tout ce qui s'anime est une fonction de la progression. Rien n'accumule. Remonter la page
 * rejoue le voyage a l'envers, exactement, sans qu'aucun etat n'ait a etre defait.
 */

export default function IsraelHayaSite({ onReserver }: { onReserver?: () => void }) {
  usePolicesHebraiques();
  const reglages = useReglagesIsraelHaya();
  // Le template porte SA zone de defilement : voir useProgressionVoyage pour la mesure
  // qui a impose ce choix (html, body et #root sont a hauteur fixe dans Talvex).
  const zone = useRef<HTMLDivElement>(null);
  const piste = useRef<HTMLDivElement>(null);
  const progression = useProgressionVoyage(zone, piste);
  const [nombre, setNombre] = useState<number | null>(null);

  const total = useMemo(() => hauteurTotale(), []);
  const index = chapitreActif(progression);
  const chapitre = CHAPITRES[index];
  const p = progressionDe(progression, index);

  // Le document entier passe en hebreu pendant la visite, et seulement pendant.
  useEffect(() => {
    const html = document.documentElement;
    const dirAvant = html.getAttribute('dir');
    const langAvant = html.getAttribute('lang');
    html.setAttribute('dir', 'rtl');
    html.setAttribute('lang', 'he');
    return () => {
      if (dirAvant) html.setAttribute('dir', dirAvant); else html.removeAttribute('dir');
      if (langAvant) html.setAttribute('lang', langAvant); else html.removeAttribute('lang');
    };
  }, []);

  if (!reglages.webgl && !reglages.video) {
    return <SectionsBas onReserver={onReserver} seul />;
  }

  return (
    <div
      ref={zone}
      data-testid="ih-zone"
      style={{
        background: '#070a16',
        height: '100%',
        minHeight: '100svh',
        overflowY: 'auto',
        overflowX: 'hidden',
        // Le defilement se cale sur les chapitres plutot que de s arreter n importe ou.
        scrollSnapType: 'none',
      }}
    >
      <div ref={piste} style={{ position: 'relative', height: `${total}vh` }}>
        <div
          data-testid="ih-scene"
          data-ih-chapitre={chapitre.cle}
          style={{ position: 'sticky', top: 0, height: '100svh', minHeight: 520, overflow: 'hidden' }}
        >
          {CHAPITRES.map((c, i) => {
            // Proche = le chapitre courant et ses deux voisins. Au-dela, rien n'est charge.
            const proche = Math.abs(i - index) <= 1;
            if (i !== index) return null;

            if (c.technique === 'film' && c.film && c.poster) {
              return (
                <FilmScrub
                  key={c.cle}
                  src={c.film}
                  poster={c.poster}
                  progression={p}
                  mouvementReduit={reglages.mouvementReduit || !reglages.video}
                  proche={proche}
                />
              );
            }
            return (
              <SceneTempsReel
                key={c.cle}
                chapitre={c.numero === 3 ? 3 : 4}
                progression={p}
                nombre={nombre}
                mouvementReduit={reglages.mouvementReduit}
                dpr={reglages.dpr}
              />
            );
          })}

          {/* Couche 1 de la lisibilite : un voile global, toujours la. */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(ellipse 120% 90% at 50% 45%, rgba(7,10,22,0) 34%, rgba(7,10,22,0.60) 100%)',
            }}
          />

          <BandesTexte bandes={chapitre.bandes} progression={p} mouvementReduit={reglages.mouvementReduit} />

          {/* La saisie n'apparait que dans la seconde moitie du chapitre des anneaux : d'abord
              on regarde le mecanisme, ensuite on lui parle. */}
          {chapitre.numero === 3 && p > 0.34 && (
            <div
              style={{
                position: 'absolute',
                insetInlineEnd: 'clamp(16px, 5vw, 64px)',
                bottom: 'clamp(24px, 6vh, 72px)',
                pointerEvents: 'none',
                display: 'grid',
                justifyItems: 'end',
              }}
            >
              <SaisieNombres onResultat={setNombre} />
            </div>
          )}

          {/* Le repere de chapitre : neuf traits, un par etape, celui du chapitre allume. */}
          <nav
            aria-label="פרקים"
            style={{
              position: 'absolute',
              insetInlineStart: 'clamp(12px, 2.5vw, 28px)',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'grid',
              gap: 10,
            }}
          >
            {CHAPITRES.map((c, i) => (
              <span
                key={c.cle}
                aria-current={i === index ? 'step' : undefined}
                style={{
                  width: i === index ? 18 : 10,
                  height: 2,
                  borderRadius: 2,
                  background: i === index ? 'rgba(232,205,147,0.95)' : 'rgba(232,205,147,0.28)',
                  transition: 'width 320ms ease, background 320ms ease',
                }}
              />
            ))}
          </nav>

          {/* Invitation a descendre, au tout debut seulement. */}
          {progression < 0.012 && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                insetInline: 0,
                bottom: 26,
                display: 'grid',
                justifyItems: 'center',
                gap: 8,
                color: 'rgba(238,231,219,0.5)',
                fontSize: 11,
                letterSpacing: '0.18em',
                fontFamily: '"Heebo", system-ui, sans-serif',
              }}
            >
              <span>גללו</span>
              <span style={{ width: 1, height: 26, background: 'linear-gradient(to bottom, rgba(232,205,147,0.6), transparent)' }} />
            </div>
          )}
        </div>
      </div>

      <SectionsBas onReserver={onReserver} />

      <style>{`
        @keyframes ihTourne { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { [style*="ihTourne"] { animation: none !important; } }
      `}</style>
    </div>
  );
}
