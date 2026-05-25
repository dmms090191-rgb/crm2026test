import { useState, useEffect } from 'react';
import { MousePointer2 } from 'lucide-react';

interface Props {
  cursor: { xPercent: number; yPercent: number } | null;
  clickRipple: { xPercent: number; yPercent: number; id: number } | null;
  saName: string;
  containerRef?: React.RefObject<HTMLElement>;
}

export default function DemoCursorOverlay({ cursor, clickRipple, saName, containerRef }: Props) {
  const [ripples, setRipples] = useState<{ xPercent: number; yPercent: number; id: number }[]>([]);

  useEffect(() => {
    if (!clickRipple) return;
    setRipples(prev => [...prev, clickRipple]);
    const timer = setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== clickRipple.id));
    }, 600);
    return () => clearTimeout(timer);
  }, [clickRipple]);

  if (!cursor) return null;

  const container = containerRef?.current;
  const w = container ? container.clientWidth : window.innerWidth;
  const h = container ? container.clientHeight : window.innerHeight;
  const px = cursor.xPercent * w;
  const py = cursor.yPercent * h;

  return (
    <div
      style={{
        position: container ? 'absolute' : 'fixed',
        inset: 0,
        zIndex: 99999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: px,
          top: py,
          transition: 'left 33ms linear, top 33ms linear',
          transform: 'translate(-2px, -2px)',
        }}
      >
        <MousePointer2
          className="w-6 h-6 drop-shadow-lg"
          style={{ color: '#d97706', fill: 'rgba(245,158,11,0.15)' }}
          strokeWidth={2.5}
        />
        <div
          className="absolute left-5 top-5 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff',
            letterSpacing: '0.02em',
          }}
        >
          {saName}
        </div>
      </div>

      {ripples.map(r => (
        <div
          key={r.id}
          style={{
            position: 'absolute',
            left: r.xPercent * w,
            top: r.yPercent * h,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="demo-click-ripple" />
        </div>
      ))}

      <style>{`
        @keyframes demoRipple {
          0% { width: 0; height: 0; opacity: 0.6; }
          100% { width: 60px; height: 60px; opacity: 0; }
        }
        .demo-click-ripple {
          width: 0;
          height: 0;
          border-radius: 50%;
          border: 2.5px solid #f59e0b;
          background: rgba(245,158,11,0.12);
          animation: demoRipple 0.5s ease-out forwards;
          transform: translate(-50%, -50%);
          position: absolute;
          left: 50%;
          top: 50%;
        }
      `}</style>
    </div>
  );
}
