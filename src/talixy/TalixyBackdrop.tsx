import { useTheme } from '../contexts/ThemeContext';
import { useEditorModeSafe } from '../contexts/EditorModeContext';
import { useTalixy } from './useTalixy';

/*
 * TALIXY — LA couche de fond de la maquette : une seule scene pour toute la page.
 *
 * Mesures (image 3) : vignettage fort (#737C8C aux coins -> #E8EEF7 a l'horizon, rapport de
 * luminance 4,2x), horizon vers 63 % de la hauteur, sol legerement brillant avec 2 reflets
 * verticaux (x ~51 % large, x ~84 % etroit), et une dizaine de petites lumieres flottantes
 * (certaines nettes, d'autres floues) qui derivent tres lentement.
 *
 * Regles : fixed z-0 pointer-events-none (patron GlassBackgroundLayer) ; peint en degrades CSS,
 * AUCUN canvas, AUCUN filtre ; seules les particules s'animent (transform/opacity, classe .tx-anim
 * neutralisee en mouvement reduit). La couche s'efface d'elle-meme si l'utilisateur a choisi son
 * propre fond (image de l'editeur ou d'un theme personnalise) : son choix prime.
 */

/** Particules mesurees dans la maquette : position (%), taille (px), nettes ou floues, cadence de derive (s). */
const LIGHTS: { x: number; y: number; s: number; soft: boolean; d: number }[] = [
  { x: 36.1, y: 21.4, s: 5, soft: false, d: 19 },
  { x: 89.9, y: 22.0, s: 6, soft: false, d: 23 },
  { x: 12.0, y: 31.5, s: 4, soft: true, d: 17 },
  { x: 44.1, y: 32.8, s: 3, soft: true, d: 21 },
  { x: 78.6, y: 44.1, s: 5, soft: false, d: 25 },
  { x: 2.4, y: 45.6, s: 6, soft: true, d: 27 },
  { x: 54.0, y: 43.0, s: 3, soft: true, d: 15 },
  { x: 97.5, y: 60.8, s: 5, soft: false, d: 22 },
  { x: 21.3, y: 74.0, s: 4, soft: true, d: 24 },
  { x: 51.0, y: 91.0, s: 5, soft: false, d: 20 },
];

export default function TalixyBackdrop() {
  const talixy = useTalixy();
  const { customThemeOverrides } = useTheme();
  const editorCtx = useEditorModeSafe();
  if (!talixy.active) return null;
  // Un fond choisi par l'utilisateur (editeur ou theme perso) prime toujours sur la scene Talixy.
  if (editorCtx?.backgroundImage || customThemeOverrides?.background_image) return null;
  return (
    <div aria-hidden className="tx-backdrop" data-testid="talixy-backdrop">
      <div className="tx-backdrop-floor" />
      <div className="tx-backdrop-vignette" />
      {talixy.motion && (
        <div className="tx-backdrop-lights">
          {LIGHTS.map((l, i) => (
            <span
              key={i}
              className={`tx-anim tx-light tx-light-${i % 3}`}
              data-soft={l.soft ? 'true' : 'false'}
              style={{
                left: `${l.x}%`,
                top: `${l.y}%`,
                width: l.s,
                height: l.s,
                animationDuration: `${l.d}s`,
                animationDelay: `${-(i * 3.7) % l.d}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}
