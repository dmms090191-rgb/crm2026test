import { EyeOff, Image as ImageIcon, Check } from 'lucide-react';
import { TRANSPARENT_COST_PER_IMAGE, UNIT_COST_PER_IMAGE, type NumProposals } from './logoAiConstants';

interface Props {
  transparentBg: boolean;
  setTransparentBg: (v: boolean | ((prev: boolean) => boolean)) => void;
  numProposals: NumProposals;
  setNumProposals: (v: NumProposals) => void;
  numTypes: number;
  surfaceSecondary: string;
  surfaceBorder: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
}

export default function LogoAiOptionsBar({
  transparentBg, setTransparentBg, numProposals, setNumProposals,
  numTypes, surfaceSecondary, surfaceBorder,
  textSecondary, textTertiary, textQuaternary,
}: Props) {
  const effectiveTypes = Math.max(numTypes, 1);
  const totalTranspCost = numProposals * effectiveTypes * TRANSPARENT_COST_PER_IMAGE;

  return (
    <>
      {/* Transparent toggle */}
      <button type="button" onClick={() => setTransparentBg((v: boolean) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 lg:py-2 rounded-xl lg:rounded-lg transition-all text-left active:scale-[0.98]"
        style={{
          background: transparentBg ? 'rgba(14,165,233,0.06)' : 'transparent',
          border: `1px solid ${transparentBg ? 'rgba(14,165,233,0.15)' : surfaceBorder}`,
        }}>
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            background: transparentBg ? 'linear-gradient(135deg, #0ea5e9, #0369a1)' : surfaceSecondary,
            boxShadow: transparentBg ? '0 2px 8px rgba(14,165,233,0.15)' : 'none',
          }}>
          <EyeOff className="w-3.5 h-3.5" style={{ color: transparentBg ? '#fff' : textQuaternary }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold block" style={{ color: transparentBg ? '#38bdf8' : textSecondary }}>
            Fond transparent
          </span>
          <span className="text-[9px] block font-medium" style={{ color: textQuaternary }}>
            {transparentBg ? `Actif (+${totalTranspCost} u.)` : 'Desactive'}
          </span>
        </div>
        <div className="w-9 h-5 rounded-full relative flex-shrink-0 transition-all"
          style={{
            background: transparentBg ? 'linear-gradient(135deg, #0ea5e9, #0369a1)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${transparentBg ? 'rgba(14,165,233,0.3)' : surfaceBorder}`,
          }}>
          <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-[2px] transition-all"
            style={{
              left: transparentBg ? 18 : 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
        </div>
      </button>

      {/* Proposals */}
      <div>
        <label className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider mb-1.5">
          <ImageIcon className="w-3 h-3" style={{ color: '#d97706' }} />
          <span style={{ color: textTertiary }}>
            Propositions{effectiveTypes > 1 ? ' par type' : ''}
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2 lg:gap-1.5">
          {([1, 2, 4] as NumProposals[]).map(n => {
            const totalImages = n * effectiveTypes;
            const total = totalImages * UNIT_COST_PER_IMAGE + (transparentBg ? totalImages * TRANSPARENT_COST_PER_IMAGE : 0);
            const active = numProposals === n;
            return (
              <button key={n} type="button" onClick={() => setNumProposals(n)}
                className="relative flex flex-col items-center gap-0.5 py-2.5 lg:py-2 px-2 rounded-xl lg:rounded-lg transition-all active:scale-95"
                style={{
                  background: active ? 'rgba(245,158,11,0.06)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(245,158,11,0.2)' : surfaceBorder}`,
                }}>
                {active && (
                  <div className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)' }}>
                    <Check className="w-1.5 h-1.5 text-white" strokeWidth={3} />
                  </div>
                )}
                <span className="text-[16px] font-black tabular-nums leading-none" style={{ color: active ? '#f59e0b' : textSecondary }}>
                  {totalImages}
                </span>
                <span className="text-[9px] font-semibold" style={{ color: active ? '#d97706' : textTertiary }}>
                  logo{totalImages > 1 ? 's' : ''}
                </span>
                <span className="text-[7px] font-bold tabular-nums" style={{ color: textQuaternary }}>
                  {total} u.
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
