import { useState, useEffect, useCallback, type RefObject } from 'react';

interface Props {
  activeField: string | null;
  fieldLabel: string | null;
  containerRef: RefObject<HTMLDivElement>;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function StudioHighlightOverlay({ activeField, fieldLabel, containerRef }: Props) {
  const [rect, setRect] = useState<HighlightRect | null>(null);
  const [visible, setVisible] = useState(false);

  const computeRect = useCallback(() => {
    if (!activeField || !containerRef.current) {
      setRect(null);
      setVisible(false);
      return;
    }
    const el = containerRef.current.querySelector(`[data-studio-field="${activeField}"]`);
    if (!el) {
      setRect(null);
      setVisible(false);
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const containerRect = containerRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setRect({
      top: elRect.top - containerRect.top + containerRef.current.scrollTop,
      left: elRect.left - containerRect.left,
      width: elRect.width,
      height: elRect.height,
    });
    setVisible(true);
  }, [activeField, containerRef]);

  useEffect(() => {
    if (!activeField) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(computeRect, 100);
    const fadeTimer = setTimeout(() => setVisible(false), 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
    };
  }, [activeField, computeRect]);

  if (!rect || !activeField) return null;

  const pad = 4;

  return (
    <div
      className="absolute pointer-events-none z-50 transition-opacity duration-500"
      style={{
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        opacity: visible ? 1 : 0,
        borderRadius: '8px',
        border: '2px solid rgba(14,165,233,0.5)',
        boxShadow: '0 0 16px rgba(14,165,233,0.15), 0 0 4px rgba(14,165,233,0.25)',
      }}
    >
      {fieldLabel && (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md text-[9px] font-bold whitespace-nowrap"
          style={{
            top: '-24px',
            background: 'rgba(14,165,233,0.9)',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
          }}
        >
          {fieldLabel}
        </div>
      )}
    </div>
  );
}
