import { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

interface Props {
  saName: string;
  viewLabel: string | null;
}

export default function DemoNavigationToast({ saName, viewLabel }: Props) {
  const [visible, setVisible] = useState(false);
  const [displayLabel, setDisplayLabel] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!viewLabel) return;
    setDisplayLabel(viewLabel);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [viewLabel]);

  if (!visible || !displayLabel) return null;

  return (
    <div
      className="fixed top-16 left-1/2 z-[99998] -translate-x-1/2 px-4 py-2 rounded-xl shadow-xl flex items-center gap-2"
      style={{
        background: 'rgba(15,15,15,0.92)',
        border: '1px solid rgba(245,158,11,0.3)',
        backdropFilter: 'blur(12px)',
        animation: 'demoToastIn 300ms ease-out',
      }}
    >
      <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
      <span className="text-[11px] text-white font-medium whitespace-nowrap">
        <span style={{ color: '#f59e0b' }}>{saName}</span>
        {' '}vous guide vers{' '}
        <span className="font-bold">{displayLabel}</span>
      </span>

      <style>{`
        @keyframes demoToastIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
