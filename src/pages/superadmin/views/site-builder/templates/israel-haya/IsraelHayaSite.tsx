import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHAPITRES, chapitreActif, hauteurTotale, progressionDe } from './chapitres';
import FilmScrub from './FilmScrub';
import { prechargerFilm } from './cacheFilms';
import SceneTempsReel from './SceneTempsReel';
import BandesTexte from './BandesTexte';
import SaisieNombres from './SaisieNombres';
import SectionsBas from './SectionsBas';
import RailChapitres from './RailChapitres';
import { usePolicesHebraiques, useClavierVoyage, useProgressionVoyage, useReglagesIsraelHaya } from './useVoyage';
import { dit, type Langue } from './langue';
import { textesDe } from './textes';

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

interface Props {
  onReserver?: () => void;
  langue: Langue;
}

export default function IsraelHayaSite({ onReserver, langue }: Props) {
  const T = textesDe(langue);
  usePolicesHebraiques();
  const reglages = useReglagesIsraelHaya();
  // Le template porte SA zone de defilement : voir useProgressionVoyage pour la mesure
  // qui a impose ce choix (html, body et #root sont a hauteur fixe dans Talvex).
  const zone = useRef<HTMLDivElement>(null);
  const piste = useRef<HTMLDivElement>(null);
  const progression = useProgressionVoyage(zone, piste);
  useClavierVoyage(zone);
  const [nombre, setNombre] = useState<number | null>(null);

  /*
   * LA MESURE DU PANNEAU DE SAISIE, pour que la camera sache ce qui lui reste de libre.
   *
   * Au chapitre des anneaux, le panneau se pose en bas. Sur un ecran large il tient dans un
   * coin et les anneaux respirent a cote ; sur un telephone il prend 92 % de la largeur et les
   * 44 % du bas, et les anneaux se retrouveraient derriere lui. La scene a donc besoin de
   * savoir ou il commence — pas de le deviner d un @media, qui ne connait ni la hauteur reelle
   * du panneau ni celle qu il prend quand il affiche le detail du calcul.
   *
   * On arrondit a huit pixels : le panneau grandit en deux temps quand il revele le nombre,
   * et la camera n a aucune raison de bouger pour trois pixels.
   */
  const refScene = useRef<HTMLDivElement>(null);
  const refPanneau = useRef<HTMLDivElement | null>(null);
  const [panneau, setPanneau] = useState<{ haut: number; largeur: number } | null>(null);

  const releverPanneau = useCallback(() => {
    const s = refScene.current;
    const p = refPanneau.current;
    if (!s || !p) { setPanneau(null); return; }
    const bs = s.getBoundingClientRect();
    const bp = p.getBoundingClientRect();
    if (bs.height <= 0 || bp.height <= 0) { setPanneau(null); return; }
    const haut = Math.round((bp.top - bs.top) / 8) * 8;
    const largeur = Math.round(bp.width / 8) * 8;
    setPanneau(ancien => (ancien && ancien.haut === haut && ancien.largeur === largeur ? ancien : { haut, largeur }));
  }, []);

  const poserPanneau = useCallback((element: HTMLDivElement | null) => {
    refPanneau.current = element;
    releverPanneau();
  }, [releverPanneau]);

  const total = useMemo(() => hauteurTotale(), []);
  const index = chapitreActif(progression);
  const chapitre = CHAPITRES[index];
  const p = progressionDe(progression, index);

  // Le panneau de saisie entre a 0,34 ; la legende commence a lui ceder la place a 0,30,
  // pour qu'elle soit deja en haut quand il arrive.
  const montee = chapitre.numero === 3 ? Math.min(1, Math.max(0, (p - 0.3) / 0.08)) : 0;

  /*
   * La DIRECTION du document et la LIBERATION des films ont quitte ce composant pour la
   * coquille (CoquilleIsraelHaya). Les deux debordent du voyage : « A propos » et « Contact »
   * ont besoin de la meme direction, et les films doivent survivre a un aller-retour vers une
   * autre page — les liberer ici les faisait retelecharger a chaque passage par le menu.
   */

  // Le panneau et la scene changent de taille sans que React ne le sache : rotation de
  // l appareil, clavier qui s ouvre, resultat qui s affiche. On les observe tous les deux.
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const observateur = new ResizeObserver(() => releverPanneau());
    if (refScene.current) observateur.observe(refScene.current);
    if (refPanneau.current) observateur.observe(refPanneau.current);
    releverPanneau();
    return () => observateur.disconnect();
  }, [releverPanneau, index]);

  /*
   * Le chapitre d'avant et celui d'apres sont demandes sans etre montes — MAIS seulement si
   * le visiteur verra reellement des films.
   *
   * Sans cette garde, un visiteur en MOUVEMENT REDUIT telechargeait les cinq films en entier
   * — 16,1 Mo mesures sur disque — alors que FilmScrub, lui, sait ne rien demander dans ce
   * cas et n'affiche que les posters. Seize megaoctets de donnees mobiles pour zero pixel,
   * retenus jusqu'au depart du site. Meme chose pour un navigateur qui ne lit pas le mp4.
   *
   * La garde est ICI et pas dans cacheFilms : ce module n'a aucune dependance, c'est ce qui le
   * rend verifiable sans navigateur, et il n'a aucun moyen de connaitre les reglages du
   * visiteur. C'est a l'appelant de savoir s'il aura besoin de ce qu'il demande.
   */
  const filmsUtiles = reglages.video && !reglages.mouvementReduit;
  useEffect(() => {
    if (!filmsUtiles) return;
    for (const voisin of [CHAPITRES[index - 1], CHAPITRES[index + 1]]) {
      if (voisin?.technique === 'film' && voisin.film) prechargerFilm(voisin.film);
    }
  }, [index, filmsUtiles]);

  if (!reglages.webgl && !reglages.video) {
    // Le repli porte le MEME conteneur que le voyage : sans lui, son contenu depasse la
    // hauteur fixe de html / body / #root et devient inatteignable.
    return (
      <div
        tabIndex={0}
        style={{ height: 'var(--ih-vue, 100svh)', overflowY: 'auto', background: '#070a16' }}
      >
        <SectionsBas onReserver={onReserver} seul langue={langue} />
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
      aria-label={T.voyage.region}
      style={{
        background: '#070a16',
        /*
          Hauteur MESUREE, publiee par la coquille. Un `height: 100%` ne vaut que si TOUS les
          parents ont une hauteur definie ; sur la page publique ce n etait pas le cas, la
          zone prenait la hauteur de son contenu et ne defilait plus du tout. Voir
          useHauteurVue.
        */
        height: 'var(--ih-vue, 100svh)',
        overflowY: 'auto',
        overflowX: 'hidden',
        // Sans cela, le navigateur tente de garder a l'ecran l'element qu'il juge ancre, et
        // reprend la main sur une piste qui mesure 3200vh.
        overflowAnchor: 'none',
      }}
    >
      {/* Le recit, pour qui ne voit pas l'ecran : un seul chapitre vit dans le DOM a la fois,
          il faut donc nommer le voyage une fois et annoncer chaque chapitre a son entree. */}
      <h1 style={POUR_LECTEUR}>{T.voyage.titreLu}</h1>
      <p style={POUR_LECTEUR} aria-live="polite">
        {chapitre.bandes[0] ? dit(chapitre.bandes[0].titre, langue) : ''}
      </p>

      {/*
        La piste vaut exactement N fois la scene. Elle etait exprimee en `vh`, qui vise la
        FENETRE et non la scene : sur telephone, `vh` vaut la hauteur barre d'adresse CACHEE,
        donc la piste et la scene ne parlaient pas de la meme hauteur. En multiple de
        `--ih-vue`, chaque chapitre recoit sa part au pixel pres, dans les deux orientations.
      */}
      <div ref={piste} style={{ position: 'relative', height: `calc(var(--ih-vue, 100svh) * ${total / 100})` }}>
        <div
          ref={refScene}
          data-testid="ih-scene"
          data-ih-chapitre={chapitre.cle}
          style={{
            position: 'sticky',
            top: 0,
            /*
              Exactement la hauteur visible, mesuree. Ni `100%` (qui dependait des parents et
              cassait sur la page publique), ni `100svh` fige (qui laisse une bande vide des
              que la barre d'adresse se retire), ni plancher en pixels (qui depassait l ecran
              d'un telephone couche et mettait le bouton de calcul hors d'atteinte).
            */
            height: 'var(--ih-vue, 100svh)',
            overflow: 'hidden',
          }}
        >
          {chapitre.technique === 'film' && chapitre.film && chapitre.poster ? (
            <FilmScrub
              key={chapitre.cle}
              src={chapitre.film}
              poster={chapitre.poster}
              cadrage={chapitre.cadrage}
              progression={p}
              mouvementReduit={reglages.mouvementReduit || !reglages.video}
            />
          ) : !reglages.webgl ? (
            /*
              SANS WEBGL, ON NE MONTE PAS LA SCENE — ON NE LA REMPLACE PAS PAR UN PLANTAGE.

              Le repli general exige que la video ET WebGL soient absents. Un navigateur dont le
              GPU est sur liste noire a pourtant la video : il jouait donc cinq chapitres sur
              six, puis, en entrant au chapitre des anneaux, three levait << Error creating
              WebGL context >>, React Three Fiber la relancait telle quelle, et comme aucune
              barriere n'existe dans ce template, c'est TOUTE l'application Talvex qui tombait
              sur le repli de la racine — connexion comprise.

              Ce chapitre garde donc sa nuit et ses legendes, qui sont rendues par-dessus.
              Perdre une scene vaut toujours mieux que perdre le site.
            */
            <div aria-hidden style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 90% 70% at 50% 46%, #141c33 0%, #070a16 72%)',
            }} />
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
              hautPanneau={panneau ? panneau.haut : null}
              largeurPanneau={panneau ? panneau.largeur : 0}
              monteePanneau={montee}
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
            langue={langue}
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
              ref={poserPanneau}
              data-testid="ih-panneau"
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
              <SaisieNombres onResultat={setNombre} langue={langue} />
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
              <span>{T.voyage.defiler}</span>
              <span style={{ width: 1, height: 26, background: 'linear-gradient(to bottom, rgba(232,205,147,0.6), transparent)' }} />
            </div>
          )}
        </div>
      </div>

      <SectionsBas onReserver={onReserver} langue={langue} />

      <style>{`
        @keyframes ihTourne { to { transform: rotate(360deg); } }
        [data-ih-zone]:focus-visible { outline: 2px solid #e8cd93; outline-offset: -4px; }
        [data-ih-champ]:focus-visible { outline: 2px solid #e8cd93; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { [style*="ihTourne"] { animation: none !important; } }
      `}</style>
    </div>
  );
}
