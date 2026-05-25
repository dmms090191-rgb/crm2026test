import { useRef } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';
import DemoCursorOverlay from './DemoCursorOverlay';

interface Props {
  cursor: { xPercent: number; yPercent: number } | null;
  clickRipple: { xPercent: number; yPercent: number; id: number } | null;
  saName: string;
  children: React.ReactNode;
}

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

export default function SmartphonePreviewFrame({ cursor, clickRipple, saName, children }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center justify-center h-full py-6">
      <div
        className="relative flex-shrink-0 rounded-[3rem] overflow-hidden"
        style={{
          width: PHONE_WIDTH + 24,
          height: PHONE_HEIGHT + 24,
          background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.06)',
          border: '3px solid #333',
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-30 rounded-full"
          style={{
            width: 120,
            height: 28,
            background: '#000',
            borderRadius: '0 0 16px 16px',
          }}
        />

        {/* Status bar */}
        <div
          className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 pt-3 pb-1"
          style={{ height: 44, background: 'rgba(0,0,0,0.3)' }}
        >
          <span className="text-[11px] font-semibold text-white/80">{timeStr}</span>
          <div className="flex items-center gap-1">
            <Signal className="w-3 h-3 text-white/60" />
            <Wifi className="w-3 h-3 text-white/60" />
            <Battery className="w-3.5 h-3.5 text-white/60" />
          </div>
        </div>

        {/* Screen content area */}
        <div
          ref={contentRef}
          className="absolute rounded-[2.5rem] overflow-hidden"
          style={{
            top: 12,
            left: 12,
            width: PHONE_WIDTH,
            height: PHONE_HEIGHT,
            background: '#0f172a',
          }}
        >
          <div className="w-full h-full overflow-auto">
            {children}
          </div>

          <DemoCursorOverlay
            cursor={cursor}
            clickRipple={clickRipple}
            saName={saName}
            containerRef={contentRef as React.RefObject<HTMLElement>}
          />
        </div>

        {/* Home indicator */}
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full"
          style={{ width: 120, height: 4, background: 'rgba(255,255,255,0.2)' }}
        />
      </div>
    </div>
  );
}
