import { Volume2, VolumeX } from 'lucide-react';
import { TALIXY_PALETTE as P } from './talixyPalette';
import { talixyAlpha as a } from '../lib/themeTokensTalixy';
import { useTalixySound } from './useTalixySound';

/*
 * TALIXY — reglage du son d'interface : couper / remettre, volume 0-100 %.
 * Reglage propre au compte reellement connecte, garde sur cet appareil apres reconnexion.
 * En relachant le curseur, on entend le son au nouveau volume.
 */
export default function TalixySoundControl() {
  const { prefs, setVolume, setMuted, play } = useTalixySound();
  const silent = prefs.muted || prefs.volume === 0;

  return (
    <div data-testid="talixy-sound" className="mt-5 rounded-2xl px-4 py-3"
      style={{ background: a(P.violet, 0.08), border: `1px solid ${a(P.violetLight, 0.22)}` }}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setMuted(!prefs.muted)} data-testid="talixy-sound-toggle"
          aria-pressed={!prefs.muted} aria-label={prefs.muted ? 'Remettre le son' : 'Couper le son'}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-[filter] duration-150 hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            color: silent ? P.textMuted : P.turquoise,
            background: a(silent ? P.lavender : P.turquoise, 0.12),
            border: `1px solid ${a(silent ? P.lavender : P.turquoise, 0.4)}`,
            outlineColor: P.turquoise,
          }}>
          {silent ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="font-semibold" style={{ color: P.text }}>Son de l’interface</span>
            <span className="tabular-nums" style={{ color: P.textMuted }} data-testid="talixy-sound-value">
              {prefs.muted ? 'Coupé' : `${prefs.volume} %`}
            </span>
          </div>
          <input type="range" min={0} max={100} step={1} value={prefs.volume} disabled={prefs.muted}
            onChange={e => setVolume(Number(e.target.value))}
            onPointerUp={() => play('navigation')}
            onKeyUp={e => { if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') play('navigation'); }}
            aria-label="Volume du son de l’interface" data-testid="talixy-sound-volume"
            className="mt-1.5 w-full disabled:opacity-40" style={{ accentColor: P.violet }} />
        </div>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug" style={{ color: P.textFaint }}>
        Un son à chaque changement d’onglet. Réglage propre à votre compte, conservé sur cet appareil.
      </p>
    </div>
  );
}
