import { Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { COST_WARNING_THRESHOLD } from './logoAiConstants';

interface Props {
  estimatedCost: number;
  totalImages: number;
  canGenerate: boolean;
  loading: boolean;
  postProcessing: boolean;
  onGenerate: () => void;
  textTertiary: string;
  textQuaternary: string;
}

export default function LogoAiCostPanel({
  estimatedCost, totalImages, canGenerate, loading, postProcessing,
  onGenerate, textTertiary, textQuaternary,
}: Props) {
  const busy = loading || postProcessing;

  return (
    <div className="flex-shrink-0 pt-2 mt-auto space-y-2">
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg"
        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(217,119,6,0.06))', border: '1px solid rgba(245,158,11,0.10)' }}>
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: textTertiary }}>Cout</span>
        <div className="flex items-baseline gap-1">
          <span className="text-[13px] font-black tabular-nums" style={{ color: '#d97706' }}>{estimatedCost}</span>
          <span className="text-[8px] font-bold" style={{ color: textQuaternary }}>
            credits ({totalImages} img)
          </span>
        </div>
      </div>
      {estimatedCost > COST_WARNING_THRESHOLD && (
        <div className="flex items-center gap-1.5 text-[9px] font-medium px-1" style={{ color: '#d97706' }}>
          <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" /> Cout eleve.
        </div>
      )}
      <button onClick={onGenerate} disabled={busy || !canGenerate}
        className="group relative w-full overflow-hidden flex items-center justify-center gap-2 py-3 lg:py-2.5 rounded-xl text-[13px] lg:text-[12px] font-extrabold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
          color: '#fff',
          boxShadow: canGenerate ? '0 8px 32px rgba(245,158,11,0.30), 0 2px 8px rgba(245,158,11,0.15), inset 0 1px 0 rgba(255,255,255,0.20)' : 'none',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)' }} />
        <span className="relative flex items-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? 'Generation...' : `Generer ${totalImages} logo${totalImages > 1 ? 's' : ''}`}
        </span>
      </button>
    </div>
  );
}
