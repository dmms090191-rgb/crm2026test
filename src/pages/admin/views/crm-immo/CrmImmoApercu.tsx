import { useState, useRef, useEffect, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import {
  ETAT_INITIAL, ECHELLE_MIN,
  distance, milieu, tailleAjustee, versDecalage, apresDoubleTape, apresPincement,
  type EtatApercu, type Taille, type Point,
} from '../../../../lib/crmImmoApercu';
import { nomTronque } from '../../../../lib/crmImmoDocuments';

/**
 * L'APERCU PLEIN ECRAN D'UNE PHOTO DU DOSSIER.
 *
 * ---------- CE QU'IL NE FAIT PAS, ET C'EST VOULU ----------
 *
 * Il ne supprime pas, ne renomme pas, ne deplace pas. On y entre pour VOIR de quelle
 * photo il s'agit, et on en ressort. Une action destructrice derriere un geste
 * d'exploration est exactement la facon de perdre une piece de bail d'un doigt.
 *
 * ---------- L'URL EST SIGNEE, ET COURTE ----------
 *
 * Le bucket reste PRIVE. L'image vient de la meme URL signee de 120 secondes que le
 * reste du module, demandee a l'ouverture par urlSignee() — pas de la vignette, dont
 * l'URL dort dans l'etat du composant parent depuis peut-etre bien plus longtemps.
 * Si elle perime quand meme pendant la consultation, `onError` en redemande UNE, une
 * seule fois par URL : une boucle de regeneration sur une image reellement absente
 * tournerait sans fin et sans rien dire.
 *
 * ---------- UN PORTAIL, ET POURQUOI ----------
 *
 * L'apercu nait dans l'onglet Documents, lui-meme dans la modale Details, dont la coque
 * porte `overflow-hidden`. Rendu sur place, il serait rogne par elle. Et un ancetre
 * portant transform, filter ou backdrop-filter ferait d'un `fixed` un calque relatif a
 * cet ancetre plutot qu'a l'ecran. Le portail vers document.body coupe court aux deux,
 * comme le fait deja SitePreviewModal.
 *
 * ---------- ECHAP NE DOIT FERMER QUE L'APERCU ----------
 *
 * La modale Details ecoute elle aussi Echap, sur `document`, en phase de BULLAGE. On
 * ecoute donc en phase de CAPTURE, qui passe avant, et on arrete la propagation : la
 * modale en dessous ne voit jamais la touche. Sans cela, un seul Echap fermerait les
 * deux, et on se retrouverait sorti du dossier pour avoir ferme une photo.
 */

interface Props {
  nomAffiche: string;
  /** L'URL signee, fraiche, fournie par le parent. */
  url: string;
  /** Demande au parent une URL neuve. Appelee au plus une fois par URL. */
  onRegenerer: () => void;
  onFermer: () => void;
}

export default function CrmImmoApercu({ nomAffiche, url, onRegenerer, onFermer }: Props) {
  /*
   * ---------- LES COULEURS VIENNENT DES JETONS, Y COMPRIS LE FOND SOMBRE ----------
   *
   * Une premiere version posait un rgba() sombre en dur, et la garde du module l'a
   * refusee a juste titre : une couleur ecrite a la main est illisible sur les cinq
   * themes clairs. Or le fond sombre demande ne demandait PAS d'enfreindre la regle —
   * t.modal.overlayBg est deja sombre sur les SEIZE themes (du quasi-noir a 0,80
   * d'opacite jusqu'a un ardoise a 0,40), parce qu'un voile de modale l'est toujours.
   *
   * Le texte, lui, ne peut pas vivre sur ce voile : un jeton de texte suit son theme et
   * serait sombre sur sombre. L'en-tete est donc une VRAIE barre de modale — fond
   * t.modal.bg, titre t.modal.title, bouton de fermeture avec les jetons prevus pour lui,
   * les memes que le X de la modale Details. Lisible par construction, sur les seize.
   * Seule la zone de l'IMAGE garde le voile, et il n'y a aucun texte dessus.
   */
  const t = useThemeTokens();
  const [etat, setEtat] = useState<EtatApercu>({ ...ETAT_INITIAL });
  const [naturelle, setNaturelle] = useState<Taille>({ largeur: 0, hauteur: 0 });
  const [cadre, setCadre] = useState<Taille>({ largeur: 0, hauteur: 0 });
  const [echec, setEchec] = useState(false);

  const surface = useRef<HTMLDivElement | null>(null);
  /** Les doigts poses, par identifiant de pointeur. */
  const doigts = useRef<Map<number, Point>>(new Map());
  /** L'etat au DEBUT du pincement : on repart toujours de la, jamais du coup d'avant. */
  const departPincement = useRef<{ etat: EtatApercu; distance: number } | null>(null);
  /** L'URL pour laquelle on a deja redemande une regeneration. */
  const dejaRegenere = useRef<string | null>(null);
  const dernierTape = useRef<{ t: number; p: Point } | null>(null);

  const ajustee = tailleAjustee(naturelle, cadre);

  /* Une URL neuve : on oublie l'echec et le droit de regeneration deja consomme. */
  useEffect(() => { setEchec(false); }, [url]);

  /* Le cadre reel, suivi a la rotation et au redimensionnement. */
  useEffect(() => {
    const el = surface.current;
    if (el === null) return;
    const mesurer = () => {
      const r = el.getBoundingClientRect();
      setCadre({ largeur: r.width, hauteur: r.height });
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /*
   * Echap, en CAPTURE, et la propagation arretee : voir l'en-tete. On fige aussi le
   * defilement de la page dessous, comme SitePreviewModal, pour qu'un geste vertical sur
   * l'image ne fasse pas defiler la liste des documents derriere.
   */
  const fermerRef = useRef(onFermer);
  fermerRef.current = onFermer;
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      fermerRef.current();
    };
    document.addEventListener('keydown', auClavier, true);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', auClavier, true);
      document.body.style.overflow = avant;
    };
  }, []);

  /** Un point d'ecran ramene dans le repere du cadre. */
  const dansLeCadre = useCallback((e: { clientX: number; clientY: number }): Point => {
    const r = surface.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  }, []);

  const auPointeurBas = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    doigts.current.set(e.pointerId, dansLeCadre(e));

    if (doigts.current.size === 2) {
      const [a, b] = [...doigts.current.values()];
      departPincement.current = { etat, distance: distance(a, b) };
      dernierTape.current = null;      // un pincement n'est pas un tape
      return;
    }

    /* Le double-tape : deux appuis proches, dans la demi-seconde. */
    const p = dansLeCadre(e);
    const avant = dernierTape.current;
    const maintenant = e.timeStamp;
    if (avant !== null && maintenant - avant.t < 400 && distance(avant.p, p) < 40) {
      setEtat(ancien => apresDoubleTape(ancien, p, ajustee, cadre));
      dernierTape.current = null;
    } else {
      dernierTape.current = { t: maintenant, p };
    }
  }, [etat, ajustee, cadre, dansLeCadre]);

  const auPointeurBouge = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!doigts.current.has(e.pointerId)) return;
    const avant = doigts.current.get(e.pointerId)!;
    const p = dansLeCadre(e);
    doigts.current.set(e.pointerId, p);

    if (doigts.current.size >= 2) {
      const depart = departPincement.current;
      if (depart === null) return;
      const [a, b] = [...doigts.current.values()];
      setEtat(apresPincement(depart, distance(a, b), milieu(a, b), ajustee, cadre));
      return;
    }

    /* Un seul doigt : on ne deplace que si l'image deborde. A l'echelle 1 les bornes
       valent zero, donc versDecalage ne bouge rien — inutile d'en faire un cas. */
    setEtat(ancien => versDecalage(ancien, p.x - avant.x, p.y - avant.y, ajustee, cadre));
  }, [ajustee, cadre, dansLeCadre]);

  const auPointeurHaut = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    doigts.current.delete(e.pointerId);
    if (doigts.current.size < 2) departPincement.current = null;
  }, []);

  /* La molette zoome autour du pointeur, sur ordinateur. */
  const laMolette = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (cadre.largeur === 0) return;
    const p = dansLeCadre(e);
    const facteur = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setEtat(ancien => apresPincement({ etat: ancien, distance: 1 }, facteur, p, ajustee, cadre));
  }, [ajustee, cadre, dansLeCadre]);

  const zoome = etat.echelle > ECHELLE_MIN;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ background: t.modal.overlayBg }}
      data-testid="crm-immo-apercu"
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu de ${nomAffiche}`}
    >
      {/* L'en-tete : le nom discret a gauche, la fermeture a droite. Il ne defile pas. */}
      <div className="flex items-start justify-between gap-3 px-3 py-2 shrink-0"
        style={{ background: t.modal.bg, borderBottom: `1px solid ${t.modal.border}` }}>
        <p className="text-xs min-w-0 pt-2.5" title={nomAffiche}
          style={{ color: t.modal.subtitle }}
          data-testid="crm-immo-apercu-nom">
          {nomTronque(nomAffiche, 40)}
        </p>
        {/* 44 px au doigt sous md : ce bouton est la SEULE sortie tactile, le voile etant
            entierement couvert par l'image. Memes jetons que le X de la modale Details. */}
        <button type="button" onClick={onFermer}
          aria-label="Fermer l’aperçu" title="Fermer l’aperçu"
          data-testid="crm-immo-apercu-fermer"
          className="shrink-0 inline-flex items-center justify-center rounded-full p-2.5 max-md:min-h-[44px] max-md:min-w-[44px]"
          style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/*
        LA SURFACE DU GESTE. `touch-action: none` est indispensable : sans lui, le
        navigateur prend le pincement et le glissement pour lui — il zoomerait la PAGE
        et ferait defiler derriere l'apercu — et nos pointeurs n'en verraient qu'une
        partie. Il est pose ICI et nulle part ailleurs : l'en-tete garde ses gestes
        natifs, donc le bouton de fermeture reste un bouton ordinaire.
      */}
      <div ref={surface}
        className="flex-1 min-h-0 relative overflow-hidden select-none"
        style={{ touchAction: 'none' }}
        data-testid="crm-immo-apercu-surface"
        onPointerDown={auPointeurBas}
        onPointerMove={auPointeurBouge}
        onPointerUp={auPointeurHaut}
        onPointerCancel={auPointeurHaut}
        onWheel={laMolette}
      >
        {echec ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm"
            style={{ color: t.text.inverse }}
            data-testid="crm-immo-apercu-echec">
            Cette image n’a pas pu être affichée. Son lien temporaire a peut-être expiré,
            ou le fichier n’est plus dans le stockage.
          </p>
        ) : (
          /*
            object-contain : l'image entiere, jamais coupee, jamais deformee. Le transform
            n'applique qu'UNE echelle, donc le rapport est conserve par construction.
            La transition ne vaut QUE hors geste : animer pendant un pincement ferait
            trainer l'image derriere les doigts.
          */
          <img
            src={url}
            alt={nomAffiche}
            draggable={false}
            data-testid="crm-immo-apercu-image"
            /* `absolute inset-0` suffit a la dimensionner : un `h-full` en plus serait
               redondant ET interdit ici — la garde du module refuse les hauteurs en
               pourcentage, qu'une div sans style de ThemeContext romprait en silence.
               C'est le meme piege que `h-full` contre `h-[100dvh]` sur la coque. */
            className="absolute inset-0 object-contain"
            style={{
              transform: `translate(${etat.x}px, ${etat.y}px) scale(${etat.echelle})`,
              transition: doigts.current.size > 0 ? 'none' : 'transform 120ms ease-out',
              cursor: zoome ? 'grab' : 'default',
            }}
            onLoad={e => {
              const img = e.currentTarget;
              setNaturelle({ largeur: img.naturalWidth, hauteur: img.naturalHeight });
            }}
            onError={() => {
              /* UNE seule regeneration par URL : sur un fichier reellement absent du
                 stockage, redemander en boucle tournerait sans fin et sans rien dire. */
              if (dejaRegenere.current !== url) { dejaRegenere.current = url; onRegenerer(); }
              else setEchec(true);
            }}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
