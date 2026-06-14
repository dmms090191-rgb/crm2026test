import { Upload, Pipette, RotateCcw, Loader2, Undo2, Check } from 'lucide-react';
import type { ColorIsolationState } from './calquer-logo-types';

interface Props {
  onUpload: () => void;
  hasImage: boolean;
  ciState: ColorIsolationState;
  pipetteActive: boolean;
  applying: boolean;
  hasResult: boolean;
  onActivatePipette: () => void;
  onToleranceChange: (t: number) => void;
  onUndo: () => void;
  onReset: () => void;
}

export default function CalquerLogoPanel({
  onUpload, hasImage, ciState, pipetteActive, applying, hasResult,
  onActivatePipette, onToleranceChange, onUndo, onReset,
}: Props) {
  const picked = ciState.pickedColor;

  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-5 p-4 overflow-y-auto border-r"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)' }}>

      <div className="space-y-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(148,163,184,0.6)' }}>
          Logo
        </h3>
        <button onClick={onUpload}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
          }}>
          <Upload className="w-4 h-4" />
          {hasImage ? 'Changer le logo' : 'Charger un logo'}
        </button>
      </div>

      {hasImage && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(148,163,184,0.6)' }}>
              Isolation couleur
            </h3>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.55)' }}>
              Cliquez sur la couleur a garder. Tout le reste deviendra transparent.
            </p>

            <button
              onClick={onActivatePipette}
              disabled={applying}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:enabled:scale-[1.02] disabled:opacity-40"
              style={{
                background: pipetteActive
                  ? 'rgba(16,185,129,0.2)'
                  : 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
                border: `1.5px solid ${pipetteActive ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.25)'}`,
                color: pipetteActive ? '#34d399' : '#6ee7b7',
                boxShadow: pipetteActive ? '0 0 24px rgba(16,185,129,0.15)' : '0 2px 8px rgba(16,185,129,0.08)',
              }}>
              {applying ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <Pipette className="w-4.5 h-4.5" />
              )}
              {applying ? 'Application...' : pipetteActive ? 'Cliquez sur l\'image' : 'Garder une couleur'}
            </button>
          </div>

          {picked && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-8 h-8 rounded-lg border border-white/20 flex-shrink-0 shadow-inner"
                style={{ background: `rgb(${picked[0]},${picked[1]},${picked[2]})` }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>
                  Couleur gardee
                </p>
                <p className="text-xs font-mono font-semibold" style={{ color: 'rgba(226,232,240,0.9)' }}>
                  rgb({picked[0]}, {picked[1]}, {picked[2]})
                </p>
              </div>
              {hasResult && <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#34d399' }} />}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(148,163,184,0.5)' }}>
                Tolerance
              </label>
              <span className="text-xs font-mono font-semibold" style={{ color: 'rgba(226,232,240,0.7)' }}>
                {ciState.tolerance}
              </span>
            </div>
            <input
              type="range" min={1} max={150} value={ciState.tolerance}
              onChange={e => onToleranceChange(+e.target.value)}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.1)', accentColor: '#10b981' }}
            />
            <div className="flex justify-between text-[9px]" style={{ color: 'rgba(148,163,184,0.4)' }}>
              <span>Precis</span>
              <span>Large</span>
            </div>
          </div>

          {hasResult && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#34d399' }} />
              <span className="text-[10px] font-medium" style={{ color: '#34d399' }}>
                Couleur isolee - fond transparent
              </span>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button onClick={onUndo} disabled={!hasResult || applying}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:enabled:scale-[1.02] disabled:opacity-35"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
                color: hasResult && !applying ? '#fbbf24' : 'rgba(148,163,184,0.4)',
              }}>
              <Undo2 className="w-3.5 h-3.5" />
              Annuler
            </button>

            <button onClick={onReset} disabled={applying}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:enabled:scale-[1.02] disabled:opacity-40"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(226,232,240,0.6)',
              }}>
              <RotateCcw className="w-3.5 h-3.5" />
              Reinitialiser
            </button>
          </div>
        </div>
      )}

      <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.5)' }}>
          Chargez un logo puis isolez la couleur souhaitee. Le reste sera supprime.
        </p>
      </div>
    </div>
  );
}
