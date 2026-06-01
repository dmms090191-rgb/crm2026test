import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Plus } from 'lucide-react';
import SimulatedPhone from './SimulatedPhone';

type PhoneModelId = 'iphone-17-pro-max' | 'samsung-s26-ultra';

const MODEL_OPTIONS: { id: PhoneModelId; label: string }[] = [
  { id: 'iphone-17-pro-max', label: 'iPhone' },
  { id: 'samsung-s26-ultra', label: 'Samsung' },
];

interface Props {
  pos: { x: number; y: number };
  scale: number;
  modelId: string;
  onClose: () => void;
  onMinimize: () => void;
  onScaleChange: (s: number) => void;
  onModelChange: (id: string) => void;
  onDragStart: (e: React.MouseEvent) => void;
  appIconUrl?: string | null;
  appName?: string;
}

export default function FloatingPhoneWindow({
  pos, scale, modelId, onClose, onMinimize,
  onScaleChange, onModelChange, onDragStart,
  appIconUrl, appName,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const resolvedX = pos.x < 0 ? window.innerWidth - 280 : pos.x;
  const resolvedY = pos.y < 0 ? 80 : pos.y;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMinimize();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onMinimize]);

  const phoneScale = scale / 100;

  return createPortal(
    <div
      ref={containerRef}
      data-floating-phone
      className="fixed z-[9999] flex flex-col"
      style={{
        left: resolvedX,
        top: resolvedY,
        transform: `scale(${phoneScale})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-t-xl cursor-move select-none"
        style={{
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          backdropFilter: 'blur(16px)',
        }}
        onMouseDown={onDragStart}
      >
        <span
          className="text-[10px] font-bold tracking-wide uppercase"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          Telephone virtuel
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Reduire"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Fermer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Controls bar */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-1.5"
        style={{
          background: 'rgba(15,23,42,0.92)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Model selector */}
        <div className="flex items-center gap-1">
          {MODEL_OPTIONS.map(m => {
            const active = m.id === modelId;
            return (
              <button
                key={m.id}
                onClick={() => onModelChange(m.id)}
                className="px-2 py-1 rounded-md text-[9px] font-semibold transition-all"
                style={{
                  background: active ? 'rgba(14,165,233,0.15)' : 'transparent',
                  color: active ? '#0ea5e9' : 'rgba(255,255,255,0.35)',
                  border: active ? '1px solid rgba(14,165,233,0.25)' : '1px solid transparent',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Scale controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onScaleChange(scale - 10)}
            disabled={scale <= 60}
            className="w-5 h-5 rounded flex items-center justify-center transition-colors disabled:opacity-30"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => { if (scale > 60) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <span
            className="text-[9px] font-mono font-medium w-7 text-center"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {scale}%
          </span>
          <button
            onClick={() => onScaleChange(scale + 10)}
            disabled={scale >= 150}
            className="w-5 h-5 rounded flex items-center justify-center transition-colors disabled:opacity-30"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => { if (scale < 150) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Phone body */}
      <div
        className="rounded-b-xl overflow-hidden"
        style={{
          background: 'rgba(15,23,42,0.92)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
          padding: '0 8px 8px 8px',
        }}
      >
        <SimulatedPhone
          showReloadButton={false}
          appIconUrl={appIconUrl ?? null}
          appName={appName}
          hideModelSelector
          externalModelId={modelId as PhoneModelId}
        />
      </div>
    </div>,
    document.body,
  );
}
