import {
  Loader2, Sparkles, Wand2, Layers, Palette,
  Image as ImageIcon,
} from 'lucide-react';

interface LoadingProps {
  postProcessing: boolean;
  postProcessStatus: string | null;
  totalImages: number;
  progressLabel: string | null;
  textPrimary: string;
  textQuaternary: string;
}

export function ResultsLoadingState({
  postProcessing, postProcessStatus, totalImages, progressLabel,
  textPrimary, textQuaternary,
}: LoadingProps) {
  const blue = postProcessing;
  const accent = blue ? '#0ea5e9' : '#f59e0b';
  const accentDark = blue ? '#0369a1' : '#b45309';
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-8">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${accent}10, ${accent}05)`,
            border: `1.5px solid ${accent}15`,
            boxShadow: `0 8px 40px ${accent}10`,
          }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accentDark})`, boxShadow: `0 3px 10px ${accent}40` }}>
          <Wand2 className="w-3 h-3 text-white" />
        </div>
      </div>
      <div>
        <p className="text-[14px] font-bold mb-1" style={{ color: textPrimary }}>
          {blue ? 'Suppression du fond...' : 'Creation en cours...'}
        </p>
        <p className="text-[11px] font-medium max-w-[280px] mx-auto" style={{ color: textQuaternary }}>
          {blue ? (postProcessStatus || 'Conversion transparente...') : progressLabel || `${totalImages} logo${totalImages > 1 ? 's' : ''} vectoriel${totalImages > 1 ? 's' : ''}`}
        </p>
      </div>
      <div className="w-44 h-1.5 rounded-full overflow-hidden" style={{ background: `${accent}08` }}>
        <div className="h-full rounded-full" style={{
          width: '60%',
          background: `linear-gradient(90deg, ${accent}, ${blue ? '#38bdf8' : '#fbbf24'})`,
          animation: 'pulse 2s ease-in-out infinite',
        }} />
      </div>
    </div>
  );
}

interface EmptyProps {
  textSecondary: string;
  textQuaternary: string;
}

export function ResultsEmptyState({ textSecondary, textQuaternary }: EmptyProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
      <div className="relative mb-6">
        <div className="w-18 h-18 rounded-2xl flex items-center justify-center"
          style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(217,119,6,0.03))',
            border: '1.5px solid rgba(245,158,11,0.08)',
            boxShadow: '0 8px 40px rgba(245,158,11,0.04)',
          }}>
          <Wand2 className="w-8 h-8" style={{ color: '#d97706', opacity: 0.4 }} />
        </div>
        <div className="absolute -top-2.5 -right-3.5 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))',
            border: '1px solid rgba(245,158,11,0.10)',
          }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#f59e0b', opacity: 0.45 }} />
        </div>
        <div className="absolute -bottom-1.5 -left-3.5 w-6 h-6 rounded-md flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))',
            border: '1px solid rgba(245,158,11,0.08)',
          }}>
          <Palette className="w-3 h-3" style={{ color: '#d97706', opacity: 0.35 }} />
        </div>
      </div>

      <h3 className="text-[15px] font-bold mb-1.5" style={{ color: textSecondary }}>
        Votre espace de creation
      </h3>
      <p className="text-[11px] max-w-[300px] leading-relaxed font-medium mb-5" style={{ color: textQuaternary }}>
        Configurez a gauche, puis laissez l'IA creer des logos pour votre marque.
      </p>

      <div className="flex flex-wrap justify-center gap-2.5 mb-4">
        {[
          { icon: <Layers className="w-3 h-3" />, text: 'SVG Vectoriel' },
          { icon: <Sparkles className="w-3 h-3" />, text: 'Recraft V4.1' },
          { icon: <ImageIcon className="w-3 h-3" />, text: 'Multi-styles' },
        ].map((pill, i) => (
          <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold"
            style={{
              background: 'rgba(245,158,11,0.04)',
              border: '1px solid rgba(245,158,11,0.08)',
              color: textQuaternary,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}>
            <span style={{ color: '#d97706' }}>{pill.icon}</span>
            {pill.text}
          </span>
        ))}
      </div>
    </div>
  );
}
