import { useEffect, useRef, useState } from 'react';
import type { Cadrage } from './chapitres';
import { obtenirFilm } from './cacheFilms';

/**
 * LE FILM PILOTE PAR LE DEFILEMENT.
 *
 * Le visiteur ne lance jamais la lecture : il DEPLACE la tete de lecture avec sa molette. Vers
 * le bas la scene avance, vers le haut elle revient, image par image. C'est toute la mecanique
 * du site, et elle tient dans cinq precautions que l'on ne peut pas sauter.
 *
 * 1. LE POSTER D'ABORD. L'image est peinte avant que la video existe, et elle reste dessous
 *    pour toujours. Si le reseau echoue, le chapitre garde son image et ses mots : le site est
 *    complet SANS la video, jamais vide a cause d'elle.
 *
 * 2. LE SEEK EST ECLUSE. Demander une nouvelle position pendant qu'une autre est en cours fait
 *    caler le decodeur, parfois definitivement. On n'en demande donc qu'UNE a la fois, et la
 *    derniere position voulue attend son tour dans `enAttente`. Les positions intermediaires
 *    sont perdues, et c'est exactement ce qu'on veut : seule la derniere compte.
 *
 * 3. LA BOUCLE SE REPOSE. L'amortissement est normalise par le temps ecoule, donc il se
 *    comporte pareil a 60 et a 144 images par seconde. Et quand l'ecart devient negligeable,
 *    on arrete la boucle au lieu de tourner pour rien : une page immobile ne doit rien couter.
 *
 * 4. LA VIDEO ENTIERE EST TELECHARGEE AVANT D'ETRE UTILISEE. Un seek dans un flux partiel
 *    rebondit sur le reseau a chaque image et saccade. On attend le fichier complet, on le
 *    donne au lecteur sous forme de Blob, et seulement alors le defilement le pilote.
 *
 * 5. ET LE FILM NE SE TELECHARGE QU'UNE FOIS. Voir cacheFilms.ts : c'est la correction d'une
 *    fuite mesuree, pas une optimisation de confort.
 */

interface Props {
  /** Chemin du film encode pour le scrub (images cles rapprochees). */
  src: string;
  poster: string;
  /** Cadrage voulu sur un ecran plus etroit que le film. Par defaut : 'couvrir'. */
  cadrage?: Cadrage;
  /** Progression du chapitre, de 0 a 1. */
  progression: number;
  /** Mouvement reduit : on ne scrubbe pas, on montre l'image finale. */
  mouvementReduit: boolean;
}

/** Au-dela, l'ecart est invisible : la boucle s'arrete. */
const REPOS = 0.0004;
/** Force de l'amortissement, par pas de 16,667 ms. */
const K = 0.16;

export default function FilmScrub({ src, poster, cadrage = 'couvrir', progression, mouvementReduit }: Props) {
  const cadre = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [pret, setPret] = useState(false);
  const [echec, setEchec] = useState(false);
  const [charge, setCharge] = useState(0);

  const cible = useRef(progression);
  /*
   * LA TETE DE LECTURE PART D'OU L'ON ENTRE, et non de zero.
   *
   * Partir de zero avait une consequence qu'on ne voit qu'en remontant : entrer dans un chapitre
   * PAR LE HAUT — c'est-a-dire a sa toute fin — faisait rejouer son film vers l'AVANT, du debut
   * jusqu'a l'image voulue, pendant que le visiteur, lui, remontait. Mesure : environ 45 images
   * de rattrapage a K=0,16, et le film qui defile a l'endroit alors que la page defile a
   * l'envers. C'est l'inverse exact de ce que le site promet.
   */
  const montre = useRef(progression);
  const raf = useRef<number | null>(null);
  const dernierTic = useRef(0);
  const seekOccupe = useRef(false);
  const enAttente = useRef<number | null>(null);

  // Le film : pris au cache s'il y est, telecharge une seule fois sinon.
  useEffect(() => {
    if (mouvementReduit || echec || pret) return;
    let vivant = true;

    obtenirFilm(src, part => { if (vivant) setCharge(part); })
      .then(url => {
        if (!vivant) return;
        const el = video.current;
        if (!el) return;
        el.src = url;
        el.load();
        // On cale la tete de lecture sur la position d'arrivee avant d'autoriser la boucle :
        // sans cela, le premier amortissement repartirait de la valeur du montage precedent.
        montre.current = cible.current;
        setPret(true);
      })
      .catch(() => { if (vivant) setEchec(true); });

    return () => { vivant = false; };
  }, [src, mouvementReduit, echec, pret]);

  // Une seule demande de position a la fois ; la plus recente gagne.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const fini = () => {
      seekOccupe.current = false;
      if (enAttente.current !== null) {
        const t = enAttente.current;
        enAttente.current = null;
        seekOccupe.current = true;
        el.currentTime = t;
      }
    };
    const rate = () => { seekOccupe.current = false; enAttente.current = null; setEchec(true); };
    el.addEventListener('seeked', fini);
    el.addEventListener('error', rate);
    return () => { el.removeEventListener('seeked', fini); el.removeEventListener('error', rate); };
  }, []);

  // La boucle : elle rattrape la cible, puis s'arrete.
  useEffect(() => {
    cible.current = progression;
    if (!pret || mouvementReduit || echec) return;
    if (raf.current !== null) return;

    const pas = () => {
      const el = video.current;
      const maintenant = performance.now();
      const dt = Math.min(100, maintenant - (dernierTic.current || maintenant));
      dernierTic.current = maintenant;

      const ecart = cible.current - montre.current;
      if (Math.abs(ecart) < REPOS) {
        montre.current = cible.current;
        raf.current = null;
        dernierTic.current = 0;
      } else {
        montre.current += ecart * (1 - Math.pow(1 - K, dt / 16.667));
        raf.current = requestAnimationFrame(pas);
      }

      if (el && el.duration > 0) {
        const t = Math.min(el.duration - 0.05, Math.max(0, montre.current * el.duration));
        if (seekOccupe.current) enAttente.current = t;
        else if (Math.abs(el.currentTime - t) > 0.01) { seekOccupe.current = true; el.currentTime = t; }
      }
    };
    raf.current = requestAnimationFrame(pas);
  }, [progression, pret, mouvementReduit, echec]);

  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }, []);

  /*
   * ---------- LE CADRAGE, QUAND L'ECRAN EST PLUS ETROIT QUE LE FILM ----------
   *
   * Remplir l'ecran avec un film de rapport 1,79 sur un telephone de rapport 0,46 n'en
   * laisse voir que 26 % de la largeur. Pour la plupart des chapitres c'est un beau
   * recadrage ; pour un sujet large et plat, c'est la perte du sujet. Voir chapitres.ts.
   *
   * Le rapport du film n'est pas ecrit en dur : il est lu sur le POSTER, qui a les memes
   * dimensions et arrive bien avant la video. Un film reencode dans un autre format sera
   * donc cadre correctement sans que personne ait a retoucher ce fichier.
   */
  const [ratioFilm, setRatioFilm] = useState<number | null>(null);
  const [boite, setBoite] = useState<{ l: number; h: number } | null>(null);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const element = cadre.current;
    if (!element) return;
    const relever = () => {
      const b = element.getBoundingClientRect();
      setBoite(ancien => (ancien && Math.abs(ancien.l - b.width) < 1 && Math.abs(ancien.h - b.height) < 1
        ? ancien : { l: b.width, h: b.height }));
    };
    const observateur = new ResizeObserver(relever);
    observateur.observe(element);
    relever();
    return () => observateur.disconnect();
  }, []);

  // En deca de ce seuil, on perd plus du quart de la largeur du film : le sujet n'y survit pas.
  const partVue = ratioFilm && boite && boite.h > 0 ? Math.min(1, boite.l / boite.h / ratioFilm) : 1;
  const entier = cadrage === 'entier' && partVue < 0.72;
  /*
   * Vu en entier, le film s'arrete net en haut et en bas sur le fond floute : deux coutures
   * horizontales, et l'image cesse d'etre une scene pour devenir une video dans un cadre. On
   * fait donc fondre ses deux bords dans le fond, qui montre de toute facon la meme matiere.
   *
   * Le fondu ne peut pas etre pose sur une boite pleine page en objectFit 'contain' : le
   * masque porterait sur la BOITE, dont les bords sont deja transparents, et pas sur l'image,
   * qui occupe une bande en son milieu. On donne donc a la bande sa boite exacte — meme
   * rapport que le film — et le masque tombe alors juste.
   *
   * Sept pour cent de fondu : assez pour effacer la couture, assez peu pour que le sujet,
   * centre dans l'image, n'y perde rien.
   */
  const bande: React.CSSProperties = entier && boite && ratioFilm
    ? {
        position: 'absolute',
        left: 0,
        right: 0,
        top: Math.round((boite.h - boite.l / ratioFilm) / 2),
        height: Math.round(boite.l / ratioFilm),
        objectFit: 'cover',
        maskImage: 'linear-gradient(to bottom, transparent 0%, #000 7%, #000 93%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 7%, #000 93%, transparent 100%)',
      }
    : { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };

  const scrubActif = pret && !echec && !mouvementReduit;

  return (
    <div ref={cadre} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#070a16' }}>
      {/* Le fond : le poster lui-meme, agrandi et floute, pour que le film vu en entier ne
          flotte pas entre deux bandes noires. Il ne coute aucun telechargement de plus —
          c'est la meme image que celle du dessus, deja dans le cache du navigateur. */}
      {entier && (
        <img
          src={poster}
          alt=""
          aria-hidden
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            transform: 'scale(1.2)', filter: 'blur(30px) brightness(0.66) saturate(0.95)',
          }}
        />
      )}
      <img
        src={poster}
        alt=""
        aria-hidden
        onLoad={evenement => {
          const img = evenement.currentTarget;
          if (img.naturalWidth > 0 && img.naturalHeight > 0) setRatioFilm(img.naturalWidth / img.naturalHeight);
        }}
        style={bande}
      />
      <video
        ref={video}
        preload="none"
        muted
        playsInline
        aria-hidden
        tabIndex={-1}
        style={{
          ...bande,
          opacity: scrubActif ? 1 : 0,
          transition: 'opacity 420ms ease',
        }}
      />
      {/* Anneau de chargement : il disparait des que le film prend la main, et ne reste
          jamais bloque — en cas d'echec, le poster porte le chapitre a lui seul. */}
      {!pret && !echec && !mouvementReduit && (
        <div style={{ position: 'absolute', insetInlineEnd: 24, bottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 22, height: 22, borderRadius: '50%',
              border: '2px solid rgba(233,224,206,0.22)',
              borderTopColor: 'rgba(233,224,206,0.85)',
              animation: 'ihTourne 900ms linear infinite',
            }}
          />
          <span style={{ fontSize: 11, letterSpacing: '0.08em', color: 'rgba(233,224,206,0.55)', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(charge * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
