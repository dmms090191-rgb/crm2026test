import { useEffect, useRef, useState } from 'react';

/**
 * LE FILM PILOTE PAR LE DEFILEMENT.
 *
 * Le visiteur ne lance jamais la lecture : il DEPLACE la tete de lecture avec sa molette. Vers
 * le bas la scene avance, vers le haut elle revient, image par image. C'est toute la mecanique
 * du site, et elle tient dans quatre precautions que l'on ne peut pas sauter.
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
 */

interface Props {
  /** Chemin du film encode pour le scrub (images cles rapprochees). */
  src: string;
  poster: string;
  /** Progression du chapitre, de 0 a 1. */
  progression: number;
  /** Mouvement reduit : on ne scrubbe pas, on montre l'image finale. */
  mouvementReduit: boolean;
  /** L'ecran est-il sur ce chapitre ? Sinon on ne telecharge rien. */
  proche: boolean;
}

/** Au-dela, l'ecart est invisible : la boucle s'arrete. */
const REPOS = 0.0004;
/** Force de l'amortissement, par pas de 16,667 ms. */
const K = 0.16;

export default function FilmScrub({ src, poster, progression, mouvementReduit, proche }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [pret, setPret] = useState(false);
  const [echec, setEchec] = useState(false);
  const [charge, setCharge] = useState(0);

  const cible = useRef(0);
  const montre = useRef(0);
  const raf = useRef<number | null>(null);
  const dernierTic = useRef(0);
  const seekOccupe = useRef(false);
  const enAttente = useRef<number | null>(null);

  // Telechargement complet, declenche seulement quand le chapitre approche.
  useEffect(() => {
    if (!proche || mouvementReduit || echec || pret) return;
    let vivant = true;
    const controleur = new AbortController();

    (async () => {
      try {
        const reponse = await fetch(src, { signal: controleur.signal });
        if (!reponse.ok) throw new Error(String(reponse.status));
        const total = Number(reponse.headers.get('Content-Length')) || 0;
        const lecteur = reponse.body?.getReader();
        if (!lecteur) throw new Error('flux indisponible');

        const morceaux: Uint8Array[] = [];
        let recu = 0;
        for (;;) {
          const { done, value } = await lecteur.read();
          if (done) break;
          if (!value) continue;
          morceaux.push(value);
          recu += value.length;
          if (vivant && total) setCharge(recu / total);
        }
        if (!vivant) return;

        const blob = new Blob(morceaux as BlobPart[], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const el = video.current;
        if (!el) return;
        el.src = url;
        el.load();
        setPret(true);
      } catch {
        if (vivant) setEchec(true);
      }
    })();

    return () => { vivant = false; controleur.abort(); };
  }, [src, proche, mouvementReduit, echec, pret]);

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

  const scrubActif = pret && !echec && !mouvementReduit;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#070a16' }}>
      <img
        src={poster}
        alt=""
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <video
        ref={video}
        preload="none"
        muted
        playsInline
        aria-hidden
        tabIndex={-1}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: scrubActif ? 1 : 0,
          transition: 'opacity 420ms ease',
        }}
      />
      {/* Anneau de chargement : il disparait des que le film prend la main, et ne reste
          jamais bloque — en cas d'echec, le poster porte le chapitre a lui seul. */}
      {proche && !pret && !echec && !mouvementReduit && (
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
