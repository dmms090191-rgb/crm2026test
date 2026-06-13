import { ArrowLeftRight } from 'lucide-react';

interface Props {
  hasOverlay: boolean;
  inverted: boolean;
  onSwap: () => void;
}

export default function CalquerLogoLayerBar({ hasOverlay, inverted, onSwap }: Props) {
  if (!hasOverlay) return null;

  const frontLabel = inverted ? 'PNG Logo' : 'Calque';

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
        style={{
          background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}>
        <span className="text-xs font-medium whitespace-nowrap"
          style={{ color: 'rgba(226,232,240,0.9)' }}>
          Devant : <span style={{ color: inverted ? '#3b82f6' : '#10b981' }}>{frontLabel}</span>
        </span>

        <button onClick={onSwap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
          }}>
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Echanger
        </button>
      </div>
    </div>
  );
}
