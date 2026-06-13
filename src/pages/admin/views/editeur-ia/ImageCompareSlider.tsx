import { useState, useRef, useCallback } from 'react';

interface Props {
  originalUrl: string;
  generatedUrl: string;
}

export default function ImageCompareSlider({ originalUrl, generatedUrl }: Props) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    updatePosition(e.clientX);
    const onMove = (ev: MouseEvent) => {
      if (dragging.current) updatePosition(ev.clientX);
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [updatePosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragging.current = true;
    updatePosition(e.touches[0].clientX);
    const onMove = (ev: TouchEvent) => {
      if (dragging.current) updatePosition(ev.touches[0].clientX);
    };
    const onEnd = () => {
      dragging.current = false;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }, [updatePosition]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-col-resize select-none rounded-xl"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <img src={generatedUrl} alt="Generee" className="absolute inset-0 w-full h-full object-contain" />

      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={originalUrl}
          alt="Originale"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ width: `${containerRef.current?.offsetWidth ?? 0}px`, maxWidth: 'none' }}
        />
      </div>

      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
          <div className="flex items-center gap-0.5">
            <div className="w-0 h-0 border-t-[4px] border-b-[4px] border-r-[5px] border-transparent border-r-gray-700" />
            <div className="w-0 h-0 border-t-[4px] border-b-[4px] border-l-[5px] border-transparent border-l-gray-700" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-black/60 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
        Originale
      </div>
      <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
        Generee
      </div>
    </div>
  );
}
