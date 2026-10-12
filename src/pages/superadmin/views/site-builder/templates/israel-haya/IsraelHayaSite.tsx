import { useEffect, useMemo, useRef, useState } from 'react';
import { CHAPITRES, chapitreActif, hauteurTotale, progressionDe } from './chapitres';
import FilmScrub from './FilmScrub';
import { libererFilms, prechargerFilm } from './cacheFilms';
import SceneTempsReel from './SceneTempsReel';
import BandesTexte from './BandesTexte';
import SaisieNombres from './SaisieNombres';
import SectionsBas from './SectionsBas';
import RailChapitres from './RailChapitres';
import { usePolicesHebraiques, useClavierVoyage, useProgressionVoyage, useReglagesIsraelHaya } from './useVoyage';

/**
 * ISRAEL HAYA — le voyage, d'un seul tenant.
 *
 * La page est HAUTE : sa hauteur est la somme des chapitres. Par-dessus, une scene collante
 * occupe l'ecran et ne bouge plus. Le defilement ne fait donc pas defiler une page, il
 * DEPLACE une tete de lecture dans une histoire — et c'est tout le principe.
 *
 * Un seul chapitre est monte a la fois : six contextes video et une scene 3D qui coexisteraient
 * videraient une batterie en deux minutes. Les films des chapitres VOISINS sont en revanche
 * demandes d'avance et gardes dans le cache de FilmScrub, pour que franchir une frontiere ne
 * coute pas un telechargement.
 *
 * Tout ce qui s'anime est une fonction de la progression. Rien n'accumule. Remonter la page
 * rejoue le voyage a l'envers, exactement, sans qu'aucun etat n'ait a etre defait.
 */

/** Visible d'un lecteur d'ecran, invisible a l'oeil. */
const POUR_LECTEUR: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

export default function IsraelHayaSite({ onReserver }: { onReserver?: () => void }) {
  usePolicesHebraiques();
  const reglages = useReglagesIsraelHaya();
  // Le template porte SA zone de defilement : voir useProgressionVoyage pour la mesure
  // qui a impose ce choix (html, body et #root sont a hauteur fixe dans Talvex).
  const zone = useRef<HTMLDivElement>(null);
  const piste = useRef<HTMLDivElement>(null);
  const progression = useProgressionVoyage(zone, piste);
  useClavierVoyage(zone);
  const [nombre, setNombre] = useState<number | null>(null);

  const total = useMemo(() => hauteurTotale(), []);
  const index = chapitreActif(progression);
  const chapitre = CHAPITRES[index];
  const p = progressionDe(progression, index);

  // Le panneau de saisie entre a 0,34 ; la legende commence a lui ceder la place a 0,30,
  // pour qu'elle soit deja en haut quand il arrive.
  const montee = chapitre.numero === 3 ? Math.min(1, Math.max(0, (p - 0.3) / 0.08)) : 0;

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

  // Les films gardes en memoire sont rendus quand le voyage entier quitte l'ecran.
  useEffect(() => () => { libererFilms(); }, []);

  // Le chapitre d'avant et celui d'apres sont demandes sans etre montes.
  useEffect(() => {
    for (const voisin of [CHAPITRES[index - 1], CHAPITRES[index + 1]]) {
      if (voisin?.technique === 'film' && voisin.film) prechargerFilm(voisin.film);
    }
  }, [index]);

  if (!reglages.webgl && !reglages.video) {
    // Le repli porte le MEME conteneur que le voyage : sans lui, son contenu depasse la
    // hauteur fixe de html / body / #root et devient inatteignable.
    return (
      <div
        tabIndex={0}
        style={{ height: '100%', minHeight: '100svh', overflowY: 'auto', background: '#070a16' }}
      >
        <SectionsBas onReserver={onReserver} seul />
      </div>
    );
  }

  return (
    <div
      ref={zone}
      data-testid="ih-zone"
      data-ih-zone
      tabIndex={0}
      role="region"
      aria-label="מסע הנשמה"
      style={{
        background: '#070a16',
        height: '100%',
        minHeight: '100svh',
        overflowY: 'auto',
        overflowX: 'hidden',
        // Sans cela, le navigateur tente de garder a l'ecran l'element qu'il juge ancre, et
        // reprend la main sur une piste qui mesure 3200vh.
        overflowAnchor: 'none',
      }}
    >
      {/* Le recit, pour qui ne voit pas l'ecran : un seul chapitre vit dans le DOM a la fois,
          il faut donc nommer le voyage une fois et annoncer chaque chapitre a son entree. */}
      <h1 style={POUR_LECTEUR}>ישראל חיה — מסע הנשמה</h1>
      <p style={POUR_LECTEUR} aria-live="polite">{chapitre.bandes[0]?.titre ?? ''}</p>

      <div ref={piste} style={{ position: 'relative', height: `${total}vh` }}>
        <div
          data-testid="ih-scene"
          data-ih-chapitre={chapitre.cle}
          style={{ position: 'sticky', top: 0, height: '100svh', minHeight: 520, overflow: 'hidden' }}
        >
          {chapitre.technique === 'film' && chapitre.film && chapitre.poster ? (
            <FilmScrub
              key={chapitre.cle}
              src={chapitre.film}
              poster={chapitre.poster}
              progression={p}
              mouvementReduit={reglages.mouvementReduit || !reglages.video}
            />
          ) : (
            /* Une cle STABLE entre les chapitres 3 et 4 : avec une cle par chapitre, React
               demontait le Canvas a chaque franchissement et creait un contexte WebGL neuf —
               40 contextes mesures sur dix allers-retours, pour une scene qui pouvait rester. */
            <SceneTempsReel
              key="temps-reel"
              chapitre={chapitre.numero === 3 ? 3 : 4}
              progression={p}
              nombre={nombre}
              mouvementReduit={reglages.mouvementReduit}
              dpr={reglages.dpr}
            />
          )}

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

          <BandesTexte
            bandes={chapitre.bandes}
            progression={p}
            mouvementReduit={reglages.mouvementReduit}
            montee={montee}
          />

          {/*
            Le panneau de saisie reste MONTE pendant tout le chapitre des anneaux, et n'apparait
            que dans sa seconde moitie : d'abord on regarde le mecanisme, ensuite on lui parle.
            Le demonter en remontant effacait le prenom, la date et le resultat, alors que le
            nombre, lui, vit dans ce composant-ci : la sphere d'or restait allumee au centre des
            anneaux sans que plus rien n'affiche son chiffre. Deux etats qui doivent s'accorder
            ne peuvent pas avoir deux durees de vie.
          */}
          {chapitre.numero === 3 && (
            <div
              style={{
                position: 'absolute',
                insetInlineEnd: 'clamp(16px, 5vw, 64px)',
                bottom: 'clamp(24px, 6vh, 72px)',
                display: 'grid',
                justifyItems: 'end',
                opacity: montee,
                visibility: montee <= 0.01 ? 'hidden' : 'visible',
                // Le panneau grandit quand il affiche son resultat puis le detail du calcul :
                // on le borne pour qu'il ne puisse jamais rejoindre la legende partie en haut.
                maxHeight: 'calc(100svh - clamp(24px, 6vh, 72px) - clamp(130px, 28vh, 210px))',
                overflowY: 'auto',
              }}
            >
              <SaisieNombres onResultat={setNombre} />
            </div>
          )}

          <RailChapitres index={index} total={CHAPITRES.length} />

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
        [data-ih-zone]:focus-visible { outline: 2px solid #e8cd93; outline-offset: -4px; }
        [data-ih-champ]:focus-visible { outline: 2px solid #e8cd93; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { [style*="ihTourne"] { animation: none !important; } }
      `}</style>
    </div>
  );
}
