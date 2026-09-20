import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Plus, Maximize2, Minimize2 } from 'lucide-react';
import SimulatedPhone from './SimulatedPhone';
import { echelleAjustement, echelleFinale } from './phoneFullscreen';

type PhoneModelId = 'iphone-17-pro-max' | 'samsung-s26-ultra';

const MODEL_OPTIONS: { id: PhoneModelId; label: string }[] = [
  { id: 'iphone-17-pro-max', label: 'iPhone' },
  { id: 'samsung-s26-ultra', label: 'Samsung' },
];

/** Respiration laissee autour du telephone en plein ecran (px). */
const MARGE_PLEIN_ECRAN = 56;

interface Props {
  pos: { x: number; y: number };
  scale: number;
  modelId: string;
  onClose: () => void;
  onMinimize: () => void;
  onScaleChange: (s: number) => void;
  onModelChange: (id: string) => void;
  onDragStart: (e: React.MouseEvent) => void;
  appIconUrl?: string | null;
  appName?: string;
}

export default function FloatingPhoneWindow({
  pos, scale, modelId, onClose, onMinimize,
  onScaleChange, onModelChange, onDragStart,
  appIconUrl, appName,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  /*
   * PLEIN ECRAN — l'etat vit ICI, et nulle part ailleurs.
   *
   * C'est le point clef : passer en plein ecran ne fait que changer le `transform` de cette meme
   * racine. Le sous-arbre n'est ni deplace ni remonte, donc l'<iframe> du telephone n'est jamais
   * rechargee : page en cours, session et defilement sont conserves a l'entree comme a la sortie.
   *
   * Et surtout, le VIEWPORT LOGIQUE ne bouge pas : l'iframe garde sa largeur et sa hauteur en
   * pixels CSS (440x956 pour l'iPhone, 480x1040 pour le Samsung). Une transformation CSS
   * n'affecte pas le viewport de mise en page d'un document : on agrandit l'image du telephone
   * sur l'ecran, jamais la fenetre que le contenu mobile croit avoir. Exactement comme le zoom.
   */
  const [pleinEcran, setPleinEcran] = useState(false);

  /** Taille de mise en page du panneau, AVANT transformation (offsetWidth ignore les transforms). */
  const [naturel, setNaturel] = useState({ w: 0, h: 0 });
  const [ecran, setEcran] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  const resolvedX = pos.x < 0 ? window.innerWidth - 280 : pos.x;
  const resolvedY = pos.y < 0 ? 80 : pos.y;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Echap sort d'abord du plein ecran ; il ne reduit le panneau que s'il est deja normal.
      if (pleinEcran) setPleinEcran(false);
      else onMinimize();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onMinimize, pleinEcran]);

  // Le panneau change de taille quand on change de modele : on le remesure au lieu de l'ecrire en dur.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const mesurer = () => setNaturel(prev => (
      prev.w === el.offsetWidth && prev.h === el.offsetHeight ? prev : { w: el.offsetWidth, h: el.offsetHeight }
    ));
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const surRedimension = () => setEcran({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', surRedimension);
    return () => window.removeEventListener('resize', surRedimension);
  }, []);

  /*
   * Echelle d'ajustement : le plus petit des deux rapports, pour que le telephone tienne ENTIER,
   * sans rognage et sans deformation (une seule echelle, appliquee aux deux axes).
   */
  const ajustement = pleinEcran ? echelleAjustement(naturel, ecran, MARGE_PLEIN_ECRAN) : 1;
  // Le zoom reste actif par-dessus : a 100 % le telephone remplit exactement la place disponible.
  const echelle = echelleFinale(ajustement, scale);

  const styleRacine: React.CSSProperties = pleinEcran
    ? {
      left: '50%',
      top: '50%',
      transform: `translate(-50%, -50%) scale(${echelle})`,
      transformOrigin: 'center center',
    }
    : {
      left: resolvedX,
      top: resolvedY,
      transform: `scale(${echelle})`,
      transformOrigin: 'top left',
    };

  return createPortal(
    <>
      {/*
        Voile du plein ecran. Il est TOUJOURS monte, et seule son opacite change : le rendre
        conditionnel decalerait la position du panneau dans l'arbre React, qui serait alors
        demonte et remonte — donc l'iframe rechargee, et la session mobile perdue.
      */}
      <div
        data-tx-phone-veil
        className="fixed inset-0 z-[9998]"
        style={{
          background: 'rgba(15,23,42,0.55)',
          backdropFilter: pleinEcran ? 'blur(6px)' : 'none',
          WebkitBackdropFilter: pleinEcran ? 'blur(6px)' : 'none',
          opacity: pleinEcran ? 1 : 0,
          pointerEvents: pleinEcran ? 'auto' : 'none',
          transition: 'opacity 220ms cubic-bezier(.22,1,.36,1)',
        }}
        onClick={() => setPleinEcran(false)}
      />

      <div
        ref={containerRef}
        data-floating-phone
        data-tx-phone
        data-tx-fs={pleinEcran ? '' : undefined}
        className="fixed z-[9999] flex flex-col"
        style={styleRacine}
      >
        {/* Header bar */}
        <div
          data-tx-phone-head
          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-t-xl select-none ${pleinEcran ? '' : 'cursor-move'}`}
          style={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderBottom: 'none',
            backdropFilter: 'blur(16px)',
          }}
          onMouseDown={pleinEcran ? undefined : onDragStart}
        >
          <span
            className="text-[10px] font-bold tracking-wide uppercase"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Telephone virtuel
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onMinimize}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title="Reduire"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title="Fermer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Controls bar */}
        <div
          data-tx-phone-ctl
          className="flex items-center justify-between gap-2 px-3 py-1.5"
          style={{
            background: 'rgba(15,23,42,0.92)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Model selector */}
          <div className="flex items-center gap-1">
            {MODEL_OPTIONS.map(m => {
              const active = m.id === modelId;
              return (
                <button
                  key={m.id}
                  data-tx-model
                  data-tx-active={active ? '' : undefined}
                  onClick={() => onModelChange(m.id)}
                  className="px-2 py-1 rounded-md text-[9px] font-semibold transition-all"
                  style={{
                    background: active ? 'rgba(14,165,233,0.15)' : 'transparent',
                    color: active ? '#0ea5e9' : 'rgba(255,255,255,0.35)',
                    border: active ? '1px solid rgba(14,165,233,0.25)' : '1px solid transparent',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Scale controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onScaleChange(scale - 10)}
              disabled={scale <= 60}
              className="w-5 h-5 rounded flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => { if (scale > 60) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span
              className="text-[9px] font-mono font-medium w-7 text-center"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {scale}%
            </span>
            <button
              onClick={() => onScaleChange(scale + 10)}
              disabled={scale >= 150}
              className="w-5 h-5 rounded flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => { if (scale < 150) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus className="w-2.5 h-2.5" />
            </button>

            {/* Plein ecran : meme taille et meme traitement que les deux commandes de zoom. */}
            <button
              data-tx-fs-btn
              onClick={() => setPleinEcran(v => !v)}
              className="w-5 h-5 rounded flex items-center justify-center transition-colors ml-1"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title={pleinEcran ? 'Quitter le plein ecran (Echap)' : 'Plein ecran'}
              aria-label={pleinEcran ? 'Quitter le plein ecran' : 'Plein ecran'}
            >
              {pleinEcran ? <Minimize2 className="w-2.5 h-2.5" /> : <Maximize2 className="w-2.5 h-2.5" />}
            </button>
          </div>
        </div>

        {/* Phone body */}
        <div
          data-tx-phone-body
          className="rounded-b-xl overflow-hidden"
          style={{
            background: 'rgba(15,23,42,0.92)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            padding: '0 8px 8px 8px',
          }}
        >
          <SimulatedPhone
            showReloadButton={false}
            appIconUrl={appIconUrl ?? null}
            appName={appName}
            hideModelSelector
            externalModelId={modelId as PhoneModelId}
          />
        </div>
      </div>
    </>,
    document.body,
  );
}
