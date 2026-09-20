import { useState } from 'react';
import { BadgeCheck, Check, Orbit, Sparkles, Volume2 } from 'lucide-react';
import { TALIXY_PALETTE as P, type TalixyColor } from './talixyPalette';
import { talixyAlpha as a } from '../lib/themeTokensTalixy';
import { usePrefersReducedMotion } from './useTalixy';
import TalixySoundControl from './TalixySoundControl';

/*
 * TALIXY — vitrine de l'onglet Talixy (Bibliotheque de themes).
 * Montree uniquement dans la portee personnelle de Talvex Administrateur (voir talixyLibrary.ts).
 * Couleurs : uniquement la palette Talixy. Demonstration de profondeur statique et legere
 * (trois plans en perspective, legere inclinaison au survol), sans animation infinie ni flou.
 */
interface Props {
  /** Talixy est deja le theme actif. */
  active: boolean;
  onActivate: () => void;
}

const FEATURES: { icon: typeof Orbit; label: string; hint: string; color: TalixyColor }[] = [
  { icon: Orbit, label: 'Navigation 3D en arc', hint: 'Une vraie roue : l’actif au premier plan, les voisins sur la jante.', color: 'violet' },
  { icon: Volume2, label: 'Son interface', hint: 'Un son court et discret à chaque changement d’onglet.', color: 'turquoise' },
  { icon: Sparkles, label: 'Expérience immersive', hint: 'Profondeur, lumière et néons sur une nuit indigo.', color: 'magenta' },
];

const SWATCHES: { key: TalixyColor; label: string }[] = [
  { key: 'night', label: 'Nuit' },
  { key: 'violet', label: 'Violet' },
  { key: 'cyan', label: 'Cyan' },
  { key: 'turquoise', label: 'Turquoise' },
  { key: 'rose', label: 'Rose' },
  { key: 'magenta', label: 'Magenta' },
  { key: 'warm', label: 'Ambre' },
];

const TITLE_GRADIENT = `linear-gradient(100deg, ${P.violetLight} 0%, ${P.magenta} 55%, ${P.warm} 100%)`;
const BUTTON_GRADIENT = `linear-gradient(120deg, ${P.violet} 0%, ${P.magenta} 100%)`;

export default function TalixyShowcase({ active, onActivate }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [hover, setHover] = useState(false);
  const tilt = hover && !reducedMotion;

  return (
    <section
      aria-labelledby="talixy-showcase-title"
      data-testid="talixy-showcase"
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: `linear-gradient(160deg, ${P.void} 0%, ${P.deep} 45%, ${P.indigo} 100%)`,
        border: `1px solid ${a(P.violetLight, 0.22)}`,
        boxShadow: `0 30px 80px ${a(P.shade, 0.6)}, 0 0 60px ${a(P.violet, 0.12)}, inset 0 1px 0 ${a(P.text, 0.06)}`,
      }}
    >
      {/* Nappes de lumiere coloree : statiques. */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        background: [
          `radial-gradient(38% 45% at 12% 8%, ${a(P.violet, 0.34)} 0%, transparent 70%)`,
          `radial-gradient(30% 40% at 92% 28%, ${a(P.magenta, 0.22)} 0%, transparent 70%)`,
          `radial-gradient(40% 45% at 70% 100%, ${a(P.turquoise, 0.16)} 0%, transparent 70%)`,
        ].join(', '),
      }} />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: P.text, background: a(P.violet, 0.18), border: `1px solid ${a(P.violetLight, 0.4)}`, boxShadow: `0 0 18px ${a(P.violet, 0.25)}` }}>
            <BadgeCheck className="h-3.5 w-3.5" style={{ color: P.turquoise }} aria-hidden />
            Thème signature Talvex
          </span>

          <h3 id="talixy-showcase-title" className="mt-4 text-4xl font-black tracking-[0.22em] sm:text-5xl"
            style={{ backgroundImage: TITLE_GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: `drop-shadow(0 0 18px ${a(P.violet, 0.35)})` }}>
            TALIXY
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: P.textSoft }}>
            L’identité visuelle immersive de Talvex : une interface qui existe dans l’espace, portée par la lumière et les néons.
          </p>

          <ul className="mt-5 space-y-2.5">
            {FEATURES.map(({ icon: Icon, label, hint, color }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ background: a(P[color], 0.14), border: `1px solid ${a(P[color], 0.4)}`, boxShadow: `0 0 16px ${a(P[color], 0.22)}` }}>
                  <Icon className="h-4 w-4" style={{ color: P[color] }} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold" style={{ color: P.text }}>{label}</span>
                  <span className="block text-[11px] leading-snug" style={{ color: P.textMuted }}>{hint}</span>
                </span>
              </li>
            ))}
          </ul>

          <TalixySoundControl />

          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: P.textFaint }}>Palette nuit indigo</p>
            <div className="mt-2.5 flex flex-wrap gap-3">
              {SWATCHES.map(({ key, label }) => (
                <span key={key} className="flex flex-col items-center gap-1.5" title={P[key]}>
                  <span className="h-7 w-7 rounded-full" style={{
                    background: P[key],
                    border: `1px solid ${a(P.text, key === 'night' ? 0.25 : 0.12)}`,
                    boxShadow: key === 'night' ? 'none' : `0 0 14px ${a(P[key], 0.45)}`,
                  }} />
                  <span className="text-[9px] font-medium" style={{ color: P.textMuted }}>{label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {active ? (
              <span role="status" data-testid="talixy-active"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold"
                style={{ color: P.text, background: a(P.success, 0.12), border: `1px solid ${a(P.success, 0.45)}`, boxShadow: `0 0 22px ${a(P.success, 0.18)}` }}>
                <Check className="h-4 w-4" style={{ color: P.success }} strokeWidth={3} aria-hidden />
                Talixy est actif
              </span>
            ) : (
              <button type="button" onClick={onActivate} data-testid="talixy-activate"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: P.text, background: BUTTON_GRADIENT, boxShadow: `0 10px 30px ${a(P.violet, 0.4)}, 0 0 24px ${a(P.magenta, 0.25)}`, outlineColor: P.turquoise }}>
                <Sparkles className="h-4 w-4" aria-hidden />
                Activer Talixy
              </button>
            )}
            <span className="text-[11px] leading-snug" style={{ color: P.textMuted }}>
              {active
                ? 'Pour revenir à Graphite ou à un autre thème, choisissez-le dans l’onglet « Tous ».'
                : 'S’applique uniquement à votre espace Talvex Administrateur.'}
            </span>
          </div>
          <p className="mt-3 text-[10px]" style={{ color: P.textFaint }}>
            Prototype : navigation en arc et son actifs dans votre sidebar Talvex Administrateur.
          </p>
        </div>

        {/* Demonstration de profondeur : trois plans en perspective, le plus proche mis en lumiere. */}
        <div aria-hidden className="relative mx-auto h-52 w-full max-w-sm sm:h-64" style={{ perspective: 900 }}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          <div className="absolute inset-0" style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${tilt ? -10 : -20}deg) rotateX(${tilt ? 4 : 8}deg)`,
            transition: reducedMotion ? 'none' : 'transform 420ms cubic-bezier(.22,1,.36,1)',
          }}>
            {[
              { z: -130, x: 36, y: -18, o: 0.45, c: 'turquoise' as TalixyColor, label: 'Fond' },
              { z: -60, x: 18, y: -6, o: 0.72, c: 'violet' as TalixyColor, label: 'Contenu' },
              { z: 24, x: 0, y: 8, o: 1, c: 'magenta' as TalixyColor, label: 'Actif' },
            ].map(plane => (
              <div key={plane.label} className="absolute inset-x-6 top-6 bottom-6 rounded-2xl"
                style={{
                  transform: `translate3d(${plane.x}px, ${plane.y}px, ${plane.z}px)`,
                  opacity: plane.o,
                  background: `linear-gradient(150deg, ${a(P.lift, 0.92)} 0%, ${a(P.panel, 0.85)} 100%)`,
                  border: `1px solid ${a(P[plane.c], plane.label === 'Actif' ? 0.7 : 0.35)}`,
                  boxShadow: plane.label === 'Actif'
                    ? `0 18px 50px ${a(P.shade, 0.6)}, 0 0 34px ${a(P[plane.c], 0.35)}`
                    : `0 12px 36px ${a(P.shade, 0.5)}`,
                }}>
                <span className="absolute left-4 top-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: P[plane.c] }}>{plane.label}</span>
                {plane.label === 'Actif' && (
                  <span className="absolute bottom-4 left-4 right-4 h-2 rounded-full" style={{ background: BUTTON_GRADIENT, boxShadow: `0 0 16px ${a(P.magenta, 0.5)}` }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
