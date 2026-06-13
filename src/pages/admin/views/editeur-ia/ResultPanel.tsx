import { useState } from 'react';
import { Maximize2, Download, MoreHorizontal, CheckCircle2, Layers, ArrowLeftRight, RefreshCw, ZoomIn, Monitor, AlertTriangle } from 'lucide-react';
import type { AiGeneratedImage } from './editeurIaTypes';
import { TALVEX_TARGET_WIDTH, TALVEX_TARGET_HEIGHT } from './editeurIaTypes';
import ImageCompareSlider from './ImageCompareSlider';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

const glassPanelStyle = (t: ReturnType<typeof useThemeTokens>) => ({
  background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
  border: `1px solid ${t.surface.border}`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
  backdropFilter: 'blur(8px)' as const,
  WebkitBackdropFilter: 'blur(8px)' as const,
});

interface Props {
  currentImage: AiGeneratedImage | null;
  generating: boolean;
  onUseAsZone4: (url: string) => void;
  onDownload: (url: string, name: string) => void;
  onContinueFromImage?: (image: AiGeneratedImage) => void;
  onUpscaleForCover?: (image: AiGeneratedImage) => void;
}

function getCoverageStatus(w: number, h: number): { covers: boolean; label: string; color: string } {
  if (w >= TALVEX_TARGET_WIDTH && h >= TALVEX_TARGET_HEIGHT) {
    return { covers: true, label: 'Couvre le fond Talvex', color: 'emerald' };
  }
  const scaleX = TALVEX_TARGET_WIDTH / w;
  const scaleY = TALVEX_TARGET_HEIGHT / h;
  const scale = Math.max(scaleX, scaleY);
  if (scale <= 1.5) {
    return { covers: false, label: 'Proche de la cible (couverture avec leger etirement)', color: 'amber' };
  }
  return { covers: false, label: 'Trop petite pour le fond Talvex - upscale recommande', color: 'red' };
}

function ResultPanel({ currentImage, generating, onUseAsZone4, onDownload, onContinueFromImage, onUpscaleForCover }: Props) {
  const t = useThemeTokens();
  const [compareMode, setCompareMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  if (!currentImage && !generating) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={glassPanelStyle(t)}>
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
          <Layers className="w-8 h-8 text-white/10" />
        </div>
        <h3 className="text-sm font-semibold text-white/30">Resultat genere</h3>
        <p className="text-[11px] text-white/15 mt-1 max-w-[280px] text-center">
          Envoyez un message a l'IA pour generer votre premiere image
        </p>
      </div>
    );
  }

  if (generating && !currentImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={glassPanelStyle(t)}>
        <div className="relative w-20 h-20 mb-4">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 animate-pulse" />
          <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 animate-pulse delay-150" />
          <div className="absolute inset-4 rounded-lg bg-[#0a0c12] flex items-center justify-center">
            <Layers className="w-6 h-6 text-cyan-400/40 animate-pulse" />
          </div>
        </div>
        <p className="text-[12px] font-medium text-white/40">Generation en cours...</p>
        <p className="text-[10px] text-white/20 mt-1">Stability AI travaille sur votre image</p>
      </div>
    );
  }

  if (!currentImage) return null;

  const hasOriginal = !!currentImage.source_image_url;
  const showCompare = compareMode && hasOriginal;
  const w = currentImage.width;
  const h = currentImage.height;
  const ratio = w && h ? (w / h).toFixed(2) : '?';
  const coverage = w && h ? getCoverageStatus(w, h) : null;
  const needsUpscale = coverage && !coverage.covers;

  return (
    <div className="flex flex-col h-full" style={glassPanelStyle(t)}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="text-sm font-bold text-white/80">Resultat genere</h3>
        <button
          onClick={() => setFullscreen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-white/50 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/70 transition-all"
        >
          <Maximize2 className="w-3 h-3" />
          Apercu plein ecran
        </button>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-2">
        <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/[0.06] bg-black/40">
          {showCompare ? (
            <ImageCompareSlider
              originalUrl={currentImage.source_image_url!}
              generatedUrl={currentImage.generated_image_url}
            />
          ) : (
            <img
              src={currentImage.generated_image_url}
              alt={currentImage.name}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>

      {/* Dimension info bar */}
      <DimensionInfoBar width={w} height={h} ratio={ratio} coverage={coverage} />

      {/* Upscale suggestion */}
      {needsUpscale && onUpscaleForCover && (
        <div className="px-4 pb-2">
          <button
            onClick={() => onUpscaleForCover(currentImage)}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 hover:text-amber-200 disabled:opacity-40 transition-all duration-200"
          >
            <ZoomIn className="w-4 h-4" />
            Agrandir pour couvrir l'ecran ({TALVEX_TARGET_WIDTH}x{TALVEX_TARGET_HEIGHT})
          </button>
        </div>
      )}

      {hasOriginal && (
        <div className="flex items-center justify-center gap-3 px-4 pb-2">
          <button
            onClick={() => setCompareMode(false)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              !compareMode ? 'bg-white/[0.1] text-white/80' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Generee
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={1}
            value={compareMode ? 1 : 0}
            onChange={(e) => setCompareMode(e.target.value === '1')}
            className="w-20 h-1 rounded-full appearance-none cursor-pointer"
            style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.2), rgba(6,182,212,0.4))' }}
          />
          <button
            onClick={() => setCompareMode(true)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              compareMode ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            Comparer avant / apres
          </button>
        </div>
      )}

      {onContinueFromImage && (
        <div className="px-4 pb-2">
          <button
            onClick={() => onContinueFromImage(currentImage)}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15 hover:text-cyan-200 disabled:opacity-40 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Modifier cette image
          </button>
        </div>
      )}

      <div className="px-4 pb-2 flex gap-2">
        <button
          onClick={() => onUseAsZone4(currentImage.generated_image_url)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.01] transition-all duration-200"
        >
          <CheckCircle2 className="w-4 h-4" />
          Utiliser comme fond Zone 4
        </button>
        <button
          onClick={() => onDownload(currentImage.generated_image_url, currentImage.name)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[12px] font-bold text-white/70 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/90 transition-all duration-200"
        >
          <Download className="w-4 h-4" />
          Telecharger
        </button>
        <button className="flex items-center justify-center w-12 py-3 rounded-xl text-white/40 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/60 transition-all">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pb-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60" />
          <span className="text-[10px] text-white/40">
            Stability AI
          </span>
        </div>
        <span className="text-[10px] text-white/20">|</span>
        <span className="text-[10px] text-white/30">
          {currentImage.model === 'sd3.5-large' ? 'SD 3.5 Large' : currentImage.model}
        </span>
        <div className="ml-auto px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
          <span className="text-[10px] font-semibold text-amber-400/80">
            {currentImage.credits_used} credits
          </span>
        </div>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center cursor-pointer"
          onClick={() => setFullscreen(false)}
        >
          <img
            src={currentImage.generated_image_url}
            alt={currentImage.name}
            className="max-w-[95vw] max-h-[95vh] object-contain"
          />
          <button className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors">
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function DimensionInfoBar({ width, height, ratio, coverage }: {
  width: number;
  height: number;
  ratio: string;
  coverage: { covers: boolean; label: string; color: string } | null;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    emerald: { bg: 'bg-emerald-500/8', border: 'border-emerald-500/15', text: 'text-emerald-300/80', dot: 'bg-emerald-400' },
    amber: { bg: 'bg-amber-500/8', border: 'border-amber-500/15', text: 'text-amber-300/80', dot: 'bg-amber-400' },
    red: { bg: 'bg-red-500/8', border: 'border-red-500/15', text: 'text-red-300/80', dot: 'bg-red-400' },
  };
  const c = coverage ? colorMap[coverage.color] || colorMap.amber : null;

  return (
    <div className="px-4 pb-2">
      <div className={`rounded-lg px-3 py-2 border ${c ? c.bg : 'bg-white/[0.03]'} ${c ? c.border : 'border-white/[0.06]'}`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Monitor className="w-3 h-3 text-white/30" />
            <span className="text-[10px] text-white/50">Resolution :</span>
            <span className="text-[10px] font-bold text-white/70 tabular-nums">{width}x{height}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/50">Ratio :</span>
            <span className="text-[10px] font-bold text-white/70">{ratio}:1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/50">Cible Talvex :</span>
            <span className="text-[10px] font-bold text-white/70 tabular-nums">{TALVEX_TARGET_WIDTH}x{TALVEX_TARGET_HEIGHT}</span>
          </div>
        </div>
        {coverage && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {coverage.covers ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400/70" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-amber-400/70" />
            )}
            <div className={`w-1.5 h-1.5 rounded-full ${c?.dot}`} />
            <span className={`text-[10px] font-medium ${c?.text}`}>{coverage.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}


export default ResultPanel