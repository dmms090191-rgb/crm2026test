import { useState, useEffect } from 'react';

interface Props {
  cursor: { xPercent: number; yPercent: number } | null;
  clickRipple: { xPercent: number; yPercent: number; id: number } | null;
  saName: string;
}

export default function DemoTouchOverlay({ cursor, clickRipple, saName }: Props) {
  const [ripples, setRipples] = useState<{ xPercent: number; yPercent: number; id: number }[]>([]);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (!clickRipple) return;
    setRipples(prev => [...prev, clickRipple]);
    setShowIndicator(true);
    const rippleTimer = setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== clickRipple.id));
    }, 800);
    const indicatorTimer = setTimeout(() => setShowIndicator(false), 1200);
    return () => { clearTimeout(rippleTimer); clearTimeout(indicatorTimer); };
  }, [clickRipple]);

  if (!cursor) return null;

  const px = cursor.xPercent * window.innerWidth;
  const py = cursor.yPercent * window.innerHeight;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: px,
          top: py,
          transform: 'translate(-50%, -50%)',
          transition: 'left 50ms linear, top 50ms linear',
        }}
      >
        <div
          className="demo-touch-dot"
          style={{ opacity: showIndicator ? 1 : 0.4 }}
        />
        {showIndicator && (
          <div
            className="absolute whitespace-nowrap px-2 py-0.5 rounded-full text-[9px] font-bold shadow-lg"
            style={{
              left: '50%',
              top: -24,
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff',
              animation: 'demoTouchLabelIn 200ms ease-out',
            }}
          >
            {saName}
          </div>
        )}
      </div>

      {ripples.map(r => {
        const rx = r.xPercent * window.innerWidth;
        const ry = r.yPercent * window.innerHeight;
        return (
          <div
            key={r.id}
            style={{
              position: 'absolute',
              left: rx,
              top: ry,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="demo-touch-ripple-outer" />
            <div className="demo-touch-ripple-inner" />
          </div>
        );
      })}

      <style>{`
        .demo-touch-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.7) 0%, rgba(245,158,11,0.2) 60%, transparent 100%);
          box-shadow: 0 0 12px rgba(245,158,11,0.4);
          transition: opacity 300ms ease;
        }
        @keyframes demoTouchRippleOuter {
          0% { width: 0; height: 0; opacity: 0.5; }
          100% { width: 80px; height: 80px; opacity: 0; }
        }
        @keyframes demoTouchRippleInner {
          0% { width: 0; height: 0; opacity: 0.7; }
          50% { width: 40px; height: 40px; opacity: 0.4; }
          100% { width: 50px; height: 50px; opacity: 0; }
        }
        @keyframes demoTouchLabelIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(4px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .demo-touch-ripple-outer {
          position: absolute;
          left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 2px solid rgba(245,158,11,0.5);
          background: rgba(245,158,11,0.08);
          animation: demoTouchRippleOuter 700ms ease-out forwards;
        }
        .demo-touch-ripple-inner {
          position: absolute;
          left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: rgba(245,158,11,0.15);
          animation: demoTouchRippleInner 500ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}
