import { Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { COST_WARNING_THRESHOLD } from './logoAiConstants';
import { useEditorModeSafe } from '../../contexts/EditorModeContext';
import { resolveZoneBg } from '../../contexts/editorModeHelpers';

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
  const editorCtx = useEditorModeSafe();
  const btnOvr = editorCtx?.getButtonOverridesWithPreview()?.['btn_generate_logo'];
  const genBg = btnOvr?.bg ? resolveZoneBg(btnOvr.bg) : undefined;
  const genText = btnOvr?.textColor ?? undefined;
  const genTransparent = btnOvr?.opacityMode === 'transparent';

  return (
    <div className="space-y-1.5">
      {estimatedCost > COST_WARNING_THRESHOLD && (
        <div className="flex items-center gap-1.5 text-[9px] font-medium px-1" style={{ color: '#d97706' }}>
          <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" /> Cout eleve.
        </div>
      )}
      <div className="flex items-center gap-2">
        <button data-editor-btn-id="btn_generate_logo" onClick={onGenerate} disabled={busy || !canGenerate}
          className={`group relative overflow-hidden flex items-center justify-center gap-2 py-1.5 px-4 rounded-lg text-[11px] font-extrabold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]${editorCtx?.highlightedButtonId === 'btn_generate_logo' ? ' editor-target-highlight' : ''}`}
          style={{
            background: genBg || 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
            color: genText || '#fff',
            boxShadow: canGenerate ? '0 8px 32px rgba(245,158,11,0.30), 0 2px 8px rgba(245,158,11,0.15), inset 0 1px 0 rgba(255,255,255,0.20)' : 'none',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            ...(genTransparent && genBg ? { opacity: 0.55 } : {}),
          }}>
          {!genBg && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)' }} />}
          <span className="relative flex items-center gap-2 whitespace-nowrap">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? 'Generation...' : `Generer ${totalImages} logo${totalImages > 1 ? 's' : ''}`}
          </span>
        </button>
        <div className="flex-1 rounded-lg px-3 py-1.5"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(217,119,6,0.07))',
            border: '1px solid rgba(245,158,11,0.14)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}>
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-[15px] font-black tabular-nums" style={{ color: '#d97706' }}>{estimatedCost}</span>
            <span className="text-[8px] font-bold" style={{ color: textQuaternary }}>
              credits ({totalImages} img)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
