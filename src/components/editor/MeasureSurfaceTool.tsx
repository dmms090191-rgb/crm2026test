import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Ruler, Copy, Check, X } from 'lucide-react';

interface Measurement {
  width: number;
  height: number;
  top: number;
  left: number;
}

interface Props {
  active: boolean;
  onClose: () => void;
}

const TOOLBAR_SELECTOR = '[data-editor-toolbar="true"]';

export default function MeasureSurfaceTool({ active, onClose }: Props) {
  const [hover, setHover] = useState<Measurement | null>(null);
  const [result, setResult] = useState<Measurement | null>(null);
  const [copied, setCopied] = useState(false);

  const isExcluded = useCallback((el: Element | null): boolean => {
    if (!el) return false;
    return !!(
      el.closest(TOOLBAR_SELECTOR) ||
      el.closest('[data-measure-popup="true"]') ||
      el.closest('[data-measure-overlay="true"]')
    );
  }, []);

  const findTarget = useCallback((x: number, y: number): Element | null => {
    const stack = document.elementsFromPoint(x, y);
    for (const el of stack) {
      if (isExcluded(el)) continue;
      if (el === document.body || el === document.documentElement) continue;
      return el;
    }
    return null;
  }, [isExcluded]);

  useEffect(() => {
    if (!active) {
      setHover(null);
      return;
    }

    const onMove = (e: MouseEvent) => {
      if (result) return;
      if (isExcluded(e.target as Element)) {
        setHover(null);
        return;
      }
      const el = findTarget(e.clientX, e.clientY);
      if (!el) {
        setHover(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setHover({ width: r.width, height: r.height, top: r.top, left: r.left });
    };

    const onClick = (e: MouseEvent) => {
      if (isExcluded(e.target as Element)) return;
      if (result) return;
      const el = findTarget(e.clientX, e.clientY);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const r = el.getBoundingClientRect();
      setResult({ width: r.width, height: r.height, top: r.top, left: r.left });
      setHover(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (result) setResult(null);
        else onClose();
      }
    };

    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [active, findTarget, onClose, result]);

  if (!active) return null;

  const w = result ? Math.round(result.width) : 0;
  const h = result ? Math.round(result.height) : 0;
  const ratio = result && h > 0 ? (result.width / result.height).toFixed(3) : '0';

  const handleCopy = async () => {
    if (!result) return;
    const text = `${w} x ${h} px (ratio ${ratio})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return createPortal(
    <>
      <div
        data-measure-overlay="true"
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 2147483645, cursor: 'crosshair' }}
      />
      {hover && !result && (
        <div
          data-measure-overlay="true"
          className="fixed pointer-events-none"
          style={{
            top: hover.top,
            left: hover.left,
            width: hover.width,
            height: hover.height,
            border: '2px solid #f59e0b',
            background: 'rgba(245,158,11,0.08)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
            zIndex: 2147483646,
          }}
        >
          <div
            className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap"
            style={{ background: '#f59e0b', color: '#0a0c14' }}
          >
            {Math.round(hover.width)} x {Math.round(hover.height)} px
          </div>
        </div>
      )}
      {!result && (
        <div
          data-measure-overlay="true"
          className="fixed top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-[11px] font-medium pointer-events-none"
          style={{
            background: 'rgba(10,12,20,0.92)',
            border: '1px solid rgba(245,158,11,0.4)',
            color: '#fbbf24',
            backdropFilter: 'blur(8px)',
            zIndex: 2147483646,
          }}
        >
          Cliquez sur une zone pour la mesurer (Echap pour quitter)
        </div>
      )}
      {result && (
        <div
          data-measure-popup="true"
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 w-[320px]"
          style={{
            background: 'linear-gradient(135deg, rgba(15,17,28,0.98), rgba(20,22,32,0.98))',
            border: '1px solid rgba(245,158,11,0.35)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            zIndex: 2147483647,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 0 16px rgba(245,158,11,0.35)',
                }}
              >
                <Ruler className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Mesure de surface</h3>
            </div>
            <button
              onClick={() => { setResult(null); onClose(); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ color: '#94a3b8' }}
              title="Fermer l'outil"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 mb-4">
            <Row label="Largeur" value={`${w} px`} />
            <Row label="Hauteur" value={`${h} px`} />
            <Row label="Ratio" value={ratio} />
            <Row label="Image recommandee" value={`${w} x ${h} px`} highlight />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: copied
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
              }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copie' : 'Copier dimensions'}
            </button>
            <button
              onClick={() => setResult(null)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#cbd5e1',
              }}
            >
              Nouvelle mesure
            </button>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-lg"
      style={{
        background: highlight ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${highlight ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      <span className="text-[11px]" style={{ color: highlight ? '#fbbf24' : '#94a3b8' }}>
        {label}
      </span>
      <span
        className="text-xs font-mono font-bold"
        style={{ color: highlight ? '#fbbf24' : '#e2e8f0' }}
      >
        {value}
      </span>
    </div>
  );
}
