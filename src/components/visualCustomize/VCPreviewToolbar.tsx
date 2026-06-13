import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { useVisualCustomize } from './VisualCustomizeContext';
import type { VCElementType } from './visualCustomizeTypes';

interface PreviewDef {
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  id: string;
  type: VCElementType;
  label: string;
  title: string;
}

const PREVIEWS: PreviewDef[] = [
  { letter: 'A', id: '__preview_a', type: 'button', label: 'Exemple bouton', title: 'Modal A - bouton' },
  { letter: 'B', id: '__preview_b', type: 'text', label: 'Icone exemple', title: 'Modal B - icone' },
  { letter: 'C', id: '__preview_c', type: 'text', label: 'Texte exemple', title: 'Modal C - couleur simple' },
  { letter: 'D', id: '__preview_d', type: 'card', label: 'Carte exemple', title: 'Modal D - carte' },
  { letter: 'E', id: 'hybrid-__preview_e', type: 'button', label: 'Hybride exemple', title: 'Modal E - hybride' },
];

function clampBar(x: number, y: number, el: HTMLDivElement | null) {
  const w = el?.offsetWidth ?? 370;
  const h = el?.offsetHeight ?? 52;
  const maxX = Math.max(0, window.innerWidth - w);
  const maxY = Math.max(0, window.innerHeight - h);
  return { x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)) };
}

export default function VCPreviewToolbar() {
  const { enabled, setActiveSelection } = useVisualCustomize();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    if (!enabled || pos) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const barWidth = 370;
    setPos({ x: Math.max(12, (w - barWidth) / 2), y: h - 150 });
  }, [enabled, pos]);

  useEffect(() => {
    if (!enabled) setPos(null);
  }, [enabled]);

  const onHandleDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const cur = posRef.current;
    if (!cur) return;
    dragRef.current = { mx: e.clientX, my: e.clientY, ox: cur.x, oy: cur.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const { mx, my, ox, oy } = dragRef.current;
      const rawX = ox + (ev.clientX - mx);
      const rawY = oy + (ev.clientY - my);
      const c = clampBar(rawX, rawY, elRef.current);
      posRef.current = c;
      setPos(c);
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const { previewBarVisible } = useVisualCustomize();
  if (!enabled || !pos || !previewBarVisible) return null;

  return (
    <div
      ref={elRef}
      className="fixed z-[9998] flex items-center gap-2 px-2 py-2 rounded-2xl select-none"
      style={{
        left: pos.x,
        top: pos.y,
        background: 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.92))',
        border: '1px solid rgba(34,211,238,0.28)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.55), 0 0 30px rgba(34,211,238,0.18)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        onMouseDown={onHandleDown}
        className="flex items-center justify-center w-6 h-8 rounded-lg cursor-move"
        style={{ color: '#64748b' }}
        title="Deplacer"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex items-center gap-1.5">
        {PREVIEWS.map((p) => (
          <button
            key={p.letter}
            type="button"
            onClick={() => setActiveSelection({ id: p.id, type: p.type, label: p.label })}
            className="w-9 h-9 rounded-xl text-[12px] font-bold transition-all hover:scale-[1.08]"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
              color: '#fff',
              boxShadow: '0 6px 18px rgba(34,211,238,0.4)',
              border: '1px solid rgba(255,255,255,0.18)',
            }}
            title={p.title}
          >
            {p.letter}
          </button>
        ))}
      </div>
    </div>
  );
}
