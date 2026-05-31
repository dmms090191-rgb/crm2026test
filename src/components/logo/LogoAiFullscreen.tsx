import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT } from './logoAiTypes';

export function ZoomControls({ zoom, onZoom, variant }: {
  zoom: number; onZoom: (z: number) => void; variant: 'overlay' | 'inline';
}) {
  const isOverlay = variant === 'overlay';
  const bg = isOverlay ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
  const border = isOverlay ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)';
  const color = isOverlay ? '#fff' : 'rgba(255,255,255,0.85)';
  const shadow = isOverlay ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)';

  return (
    <div className="flex items-center gap-1 rounded-lg px-1 py-0.5"
      style={{ background: bg, border, backdropFilter: 'blur(12px)', boxShadow: shadow }}
      onClick={e => e.stopPropagation()}>
      <button onClick={() => onZoom(Math.max(ZOOM_MIN, zoom - ZOOM_STEP))}
        disabled={zoom <= ZOOM_MIN}
        className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:bg-white/10 disabled:opacity-30"
        style={{ color }}>
        <ZoomOut className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onZoom(ZOOM_DEFAULT)}
        className="px-1.5 h-6 rounded-md flex items-center justify-center gap-1 transition-all hover:bg-white/10"
        style={{ color, minWidth: 44 }}
        title="Reset zoom">
        {zoom === ZOOM_DEFAULT ? (
          <RotateCcw className="w-3 h-3" style={{ opacity: 0.5 }} />
        ) : (
          <span className="text-[10px] font-bold tabular-nums">{zoom}%</span>
        )}
      </button>
      <button onClick={() => onZoom(Math.min(ZOOM_MAX, zoom + ZOOM_STEP))}
        disabled={zoom >= ZOOM_MAX}
        className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:bg-white/10 disabled:opacity-30"
        style={{ color }}>
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function FullscreenOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP));
      if (e.key === '-') setZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP));
      if (e.key === '0') setZoom(ZOOM_DEFAULT);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-3 right-3 lg:top-5 lg:right-5 z-[10000] flex items-center gap-2 px-3 py-2 lg:px-3.5 rounded-xl text-[12px] font-bold transition-all active:scale-95 hover:scale-105"
        style={{
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff', backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
        <X className="w-5 h-5 lg:w-4 lg:h-4" />
        <span className="hidden sm:inline">Fermer</span>
      </button>
      <div className="absolute bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 z-[10000]">
        <ZoomControls zoom={zoom} onZoom={setZoom} variant="overlay" />
      </div>
      <img src={url} alt="Logo plein ecran"
        className="object-contain transition-transform duration-200"
        style={{ transform: `scale(${zoom / 100})`, maxWidth: '92vw', maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()} />
    </div>
  );
}
