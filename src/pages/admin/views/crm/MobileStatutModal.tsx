import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getStatutCfg, FALLBACK_COLOR } from './utils';

interface StatutDef {
  id: string;
  nom: string;
  couleur: string;
}

interface MobileStatutModalProps {
  currentStatut: string;
  statutDefs: StatutDef[];
  onSelect: (statut: string) => void;
  onClose: () => void;
}

/*
 * « CHOISIR UN STATUT » — TOUJOURS AU CENTRE DE L'ECRAN.
 *
 * Le modal est rendu DANS document.body (portail), pas dans la ligne ou la carte qui l'ouvre.
 * La carte du tableau porte un `backdrop-filter`, et tout ancetre avec backdrop-filter,
 * filter ou transform devient le repere d'un `position: fixed` : le voile couvrait alors toute
 * la hauteur du tableau (11 585 px mesures pour 154 leads) et le modal se centrait au milieu
 * de cette hauteur, des milliers de pixels hors de l'ecran. Rendu dans body, `fixed` se
 * rapporte a la fenetre : meme place a l'ecran, quelle que soit la ligne cliquee.
 *
 * La page derriere ne defile pas tant qu'il est ouvert ; une longue liste defile DANS le modal.
 */
export default function MobileStatutModal({ currentStatut, statutDefs, onSelect, onClose }: MobileStatutModalProps) {
  const tokens = useThemeTokens();
  const idTitre = useId();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = avant; };
  }, []);

  const options = [
    { value: 'Nouveau', label: 'Sans statut' },
    ...statutDefs.filter(s => s.nom !== 'Nouveau').map(s => ({ value: s.nom, label: s.nom })),
  ];

  return createPortal(
    <div
      className="flex items-center justify-center p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: tokens.modal.overlayBg, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        className="w-[90vw] max-w-[420px] max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
        style={{
          /* 85 % de la hauteur visible ; sur telephone, dvh suit la barre d'adresse. */
          maxHeight: 'min(85vh, calc(100dvh - 32px))',
          background: tokens.modal.bg,
          border: `1px solid ${tokens.modal.border}`,
          boxShadow: tokens.modal.shadow,
        }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <p id={idTitre} className="text-sm font-semibold" style={{ color: tokens.modal.title }}>Choisir un statut</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-3 py-3 overflow-y-auto space-y-1.5 flex-1 min-h-0" style={{ overscrollBehavior: 'contain' }}>
          {options.map(opt => {
            const isNeutral = opt.value === 'Nouveau';
            const optDef = statutDefs.find(s => s.nom === opt.value);
            const cfg = getStatutCfg(optDef?.couleur ?? FALLBACK_COLOR, isNeutral);
            const isActive = currentStatut === opt.value || (currentStatut === '' && opt.value === 'Nouveau');

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onSelect(opt.value); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.97]"
                style={{
                  background: isActive ? cfg.bg : tokens.surface.hover,
                  border: `1px solid ${isActive ? cfg.border : tokens.surface.borderLight}`,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }}
                />
                <span
                  className="flex-1 text-sm font-medium"
                  style={{ color: isActive ? cfg.color : tokens.text.secondary }}
                >
                  {opt.label}
                </span>
                {isActive && <Check className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
