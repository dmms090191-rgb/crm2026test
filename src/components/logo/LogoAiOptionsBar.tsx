import { EyeOff } from 'lucide-react';
import { TRANSPARENT_COST_PER_IMAGE, UNIT_COST_PER_IMAGE, type NumProposals } from './logoAiConstants';

interface Props {
  transparentBg: boolean;
  setTransparentBg: (v: boolean | ((prev: boolean) => boolean)) => void;
  numProposals: NumProposals;
  setNumProposals: (v: NumProposals) => void;
  btnStyle: (active: boolean) => React.CSSProperties;
  surfaceSecondary: string;
  surfaceBorder: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
}

export default function LogoAiOptionsBar({
  transparentBg, setTransparentBg, numProposals, setNumProposals,
  btnStyle, surfaceSecondary, surfaceBorder,
  textSecondary, textTertiary, textQuaternary,
}: Props) {
  return (
    <>
      {/* Transparent background toggle */}
      <div>
        <button
          type="button"
          onClick={() => setTransparentBg((v: boolean) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
          style={{
            background: transparentBg ? 'rgba(14,165,233,0.06)' : surfaceSecondary,
            border: `1px solid ${transparentBg ? 'rgba(14,165,233,0.25)' : surfaceBorder}`,
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: transparentBg
                ? 'linear-gradient(135deg, #0ea5e9, #0284c7)'
                : surfaceSecondary,
              border: transparentBg ? 'none' : `1px solid ${surfaceBorder}`,
            }}
          >
            <EyeOff className="w-4 h-4" style={{ color: transparentBg ? '#fff' : textQuaternary }} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold block" style={{ color: transparentBg ? '#0284c7' : textSecondary }}>
              Fond transparent
            </span>
            <span className="text-[10px] block" style={{ color: textTertiary }}>
              Supprime automatiquement le fond apres generation (PNG)
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <div
              className="w-9 h-5 rounded-full relative transition-all"
              style={{ background: transparentBg ? '#0ea5e9' : 'rgba(0,0,0,0.12)' }}
            >
              <div
                className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                style={{
                  left: transparentBg ? 18 : 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </div>
            {transparentBg && (
              <span className="text-[9px] font-bold" style={{ color: '#0ea5e9' }}>
                +{numProposals * TRANSPARENT_COST_PER_IMAGE} unites
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Number of proposals */}
      <div>
        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textSecondary }}>Nombre de propositions</label>
        <div className="flex gap-2">
          {([1, 2, 4] as NumProposals[]).map(n => {
            const total = n * UNIT_COST_PER_IMAGE + (transparentBg ? n * TRANSPARENT_COST_PER_IMAGE : 0);
            return (
              <button
                key={n}
                type="button"
                onClick={() => setNumProposals(n)}
                className="flex-1 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
                style={btnStyle(numProposals === n)}
              >
                <span>{n} logo{n > 1 ? 's' : ''}</span>
                <span className="text-[9px] font-normal opacity-70">{total} unites</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
