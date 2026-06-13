import type { ReactNode } from 'react';
import { EyeOff, Check, Layers } from 'lucide-react';
import { TRANSPARENT_COST_PER_IMAGE, UNIT_COST_PER_IMAGE, type NumProposals } from './logoAiConstants';
import { useVCElement } from '../visualCustomize/useVCElement';

interface Props {
  transparentBg: boolean;
  setTransparentBg: (v: boolean | ((prev: boolean) => boolean)) => void;
  numProposals: NumProposals;
  setNumProposals: (v: NumProposals) => void;
  numTypes: number;
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceBorder: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
  propositionsFooter?: ReactNode;
}

export default function LogoAiOptionsBar({
  transparentBg, setTransparentBg, numProposals, setNumProposals,
  numTypes, surfacePrimary, surfaceSecondary, surfaceBorder,
  textSecondary, textTertiary, textQuaternary,
  propositionsFooter,
}: Props) {
  const effectiveTypes = Math.max(numTypes, 1);
  const totalTranspCost = numProposals * effectiveTypes * TRANSPARENT_COST_PER_IMAGE;

  const vcFond = useVCElement<HTMLDivElement>('logo-card-fond-transparent', 'card', 'Carte Fond transparent');
  const vcActif = useVCElement<HTMLButtonElement>('logo-card-actif-credits', 'card', 'Carte Actif +credits');
  const vcPropositions = useVCElement<HTMLDivElement>('logo-card-propositions', 'card', 'Carte Propositions');

  const cardStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${surfaceSecondary}, ${surfacePrimary}80)`,
    border: `1px solid ${surfaceBorder}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* Fond transparent - compact */}
      <div ref={vcFond.ref} className="rounded-xl p-3 flex-shrink-0" style={{ ...cardStyle, ...vcFond.style }}>
        <div className="mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-extrabold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.14))', color: '#b45309', border: '1px solid rgba(245,158,11,0.10)' }}>
              5
            </span>
            <EyeOff className="w-2.5 h-2.5" style={{ color: '#d97706' }} />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: textTertiary }}>Fond transparent</span>
          </div>
          <p className="text-[9px] font-medium mt-1 leading-snug" style={{ color: textQuaternary, opacity: 0.7 }}>
            Genere les logos sans fond d'arriere-plan
          </p>
        </div>
        <button ref={vcActif.ref} type="button" onClick={() => setTransparentBg((v: boolean) => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left active:scale-[0.98]"
          style={{
            background: transparentBg ? 'linear-gradient(135deg, rgba(14,165,233,0.03), rgba(3,105,161,0.05))' : surfaceSecondary,
            border: `1px solid ${transparentBg ? 'rgba(14,165,233,0.15)' : surfaceBorder}`,
            ...vcActif.style,
          }}>
          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{
              background: transparentBg ? 'linear-gradient(135deg, #0ea5e9, #0369a1)' : surfaceSecondary,
              boxShadow: transparentBg ? '0 2px 8px rgba(14,165,233,0.20)' : 'none',
              border: transparentBg ? 'none' : `1px solid ${surfaceBorder}`,
            }}>
            <EyeOff className="w-3 h-3" style={{ color: transparentBg ? '#fff' : textQuaternary }} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold block leading-tight" style={{ color: transparentBg ? '#0284c7' : textSecondary }}>
              {transparentBg ? 'Actif' : 'Desactive'}
            </span>
            <span className="text-[8px] block font-medium leading-tight" style={{ color: textQuaternary }}>
              {transparentBg ? `+${totalTranspCost} credits` : 'Arriere-plan conserve'}
            </span>
          </div>
          <div className="w-8 h-[18px] rounded-full relative flex-shrink-0 transition-all"
            style={{
              background: transparentBg ? 'linear-gradient(135deg, #0ea5e9, #0369a1)' : 'rgba(128,128,128,0.15)',
              border: `1px solid ${transparentBg ? 'rgba(14,165,233,0.25)' : surfaceBorder}`,
            }}>
            <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-[1px] transition-all"
              style={{
                left: transparentBg ? 16 : 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
              }} />
          </div>
        </button>
      </div>

      {/* Propositions - compact */}
      <div ref={vcPropositions.ref} className="rounded-xl p-3 flex flex-col flex-1 min-h-0" style={{ ...cardStyle, ...vcPropositions.style }}>
        <div className="mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-extrabold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.14))', color: '#b45309', border: '1px solid rgba(245,158,11,0.10)' }}>
              6
            </span>
            <Layers className="w-2.5 h-2.5" style={{ color: '#d97706' }} />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: textTertiary }}>
              Propositions{effectiveTypes > 1 ? ' /type' : ''}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {([1, 2, 4] as NumProposals[]).map(n => {
            const totalImages = n * effectiveTypes;
            const total = totalImages * UNIT_COST_PER_IMAGE + (transparentBg ? totalImages * TRANSPARENT_COST_PER_IMAGE : 0);
            const active = numProposals === n;
            return (
              <button key={n} type="button" onClick={() => setNumProposals(n)}
                className="relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all active:scale-95"
                style={{
                  background: active ? 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(217,119,6,0.07))' : 'transparent',
                  border: `1.5px solid ${active ? 'rgba(245,158,11,0.22)' : surfaceBorder}`,
                  boxShadow: active ? '0 2px 10px rgba(245,158,11,0.05)' : 'none',
                }}>
                {active && (
                  <div className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)', boxShadow: '0 1px 4px rgba(245,158,11,0.25)' }}>
                    <Check className="w-1.5 h-1.5 text-white" strokeWidth={3} />
                  </div>
                )}
                <span className="text-[13px] font-black tabular-nums leading-none" style={{ color: active ? '#d97706' : textSecondary }}>
                  {totalImages}
                </span>
                <span className="text-[8px] font-semibold" style={{ color: active ? '#b45309' : textTertiary }}>
                  logo{totalImages > 1 ? 's' : ''}
                </span>
                <span className="text-[7px] font-bold tabular-nums px-1 py-px rounded"
                  style={{
                    background: active ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.02)',
                    color: active ? '#b45309' : textQuaternary,
                  }}>
                  {total} cr.
                </span>
              </button>
            );
          })}
        </div>
        {propositionsFooter && <div className="mt-auto pt-1.5">{propositionsFooter}</div>}
      </div>
    </div>
  );
}
