import { useState, useRef, useEffect } from 'react';
import type { useThemeTokens } from '../../../../../hooks/useThemeTokens';

const PALETTE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#d946ef', '#ec4899', '#f43f5e', '#78716c',
];

interface Props {
  currentColor: string | null;
  tokens: ReturnType<typeof useThemeTokens>;
  onSelect: (color: string | null) => void;
  onClose: () => void;
}

export default function SystemColorPicker({ currentColor, tokens, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  useEffect(() => {
    if (ref.current) {
      const parent = ref.current.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        setPos({ top: rect.bottom + 4, left: rect.right - 172 });
      }
    }
  }, []);

  return (
    <div
      ref={ref}
      className="fixed z-[9999] rounded-lg shadow-xl p-2.5"
      style={{
        background: tokens.surface.primary,
        border: `1px solid ${tokens.surface.border}`,
        width: '172px',
        top: pos ? `${pos.top}px` : '-9999px',
        left: pos ? `${pos.left}px` : '0',
      }}
    >
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {PALETTE_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onSelect(c)}
            className="w-8 h-8 rounded-md transition-transform hover:scale-110"
            style={{ background: c, outline: currentColor === c ? `2px solid ${tokens.text.secondary}` : 'none', outlineOffset: '2px' }}
          />
        ))}
      </div>
      {currentColor && (
        <button
          onClick={() => onSelect(null)}
          className="w-full text-center text-[10px] py-1.5 rounded"
          style={{ color: tokens.text.tertiary, background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}
        >
          Retirer la couleur
        </button>
      )}
    </div>
  );
}
