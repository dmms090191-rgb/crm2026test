import { useState, useRef, useCallback, useEffect, useId, type ReactNode } from 'react';
import { X, Minus, RotateCcw } from 'lucide-react';
import { useEditorModeSafe } from '../../contexts/EditorModeContext';
import { type EditorPanelTokens, getEditorPanelTokens } from './editorPanelTheme';

interface Props {
  title: string;
  icon: ReactNode;
  defaultX: number;
  defaultY: number;
  width: number;
  children: ReactNode;
  minimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
  initialPos?: { x: number; y: number } | null;
  onPositionChange?: (x: number, y: number) => void;
}

interface GroupBounds { left: number; top: number; right: number; bottom: number }

function clampSingle(x: number, y: number, w: number, h: number) {
  const maxX = Math.max(0, window.innerWidth - w);
  const maxY = Math.max(0, window.innerHeight - h);
  return { x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)) };
}

function clampTotalDelta(totalDx: number, totalDy: number, gb: GroupBounds) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let dx = totalDx;
  let dy = totalDy;
  if (gb.left + dx < 0) dx = -gb.left;
  if (gb.right + dx > vw) dx = vw - gb.right;
  if (gb.top + dy < 0) dy = -gb.top;
  if (gb.bottom + dy > vh) dy = vh - gb.bottom;
  return { dx, dy };
}

function snapshotGroupBounds(getters: (() => DOMRect | null)[]): GroupBounds | null {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  let any = false;
  for (const get of getters) {
    const rect = get();
    if (!rect) continue;
    any = true;
    l = Math.min(l, rect.left);
    t = Math.min(t, rect.top);
    r = Math.max(r, rect.right);
    b = Math.max(b, rect.bottom);
  }
  return any ? { left: l, top: t, right: r, bottom: b } : null;
}

export default function DraggablePanel({
  title, icon, defaultX, defaultY, width, children,
  minimized, onMinimize, onClose, initialPos, onPositionChange,
}: Props) {
  const editor = useEditorModeSafe();
  const pt: EditorPanelTokens = getEditorPanelTokens(
    editor?.panelTheme ?? 'gris',
    editor?.panelPalettePreview || editor?.customPanelPalette,
  );
  const panelId = useId();
  const [pos, setPosRaw] = useState({
    x: initialPos?.x ?? defaultX,
    y: initialPos?.y ?? defaultY,
  });
  const dragRef = useRef<{
    startX: number; startY: number; origX: number; origY: number;
    groupBounds: GroupBounds | null;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  const onPosChangeRef = useRef(onPositionChange);
  onPosChangeRef.current = onPositionChange;
  const lastApplied = useRef({ dx: 0, dy: 0 });

  const setPos = useCallback(
    (next: { x: number; y: number }) => {
      setPosRaw(next);
      onPosChangeRef.current?.(next.x, next.y);
    },
    [],
  );

  useEffect(() => {
    if (!editor) return;
    const getRect = () => panelRef.current?.getBoundingClientRect() ?? null;
    editor.dragPanelRects.current.push(getRect);
    return () => {
      editor.dragPanelRects.current = editor.dragPanelRects.current.filter(g => g !== getRect);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const handler = (dx: number, dy: number, sourceId: string) => {
      if (sourceId === panelId) return;
      setPosRaw(prev => {
        const next = { x: prev.x + dx, y: prev.y + dy };
        onPosChangeRef.current?.(next.x, next.y);
        return next;
      });
    };
    editor.dragBroadcast.current.push(handler);
    return () => {
      editor.dragBroadcast.current = editor.dragBroadcast.current.filter(h => h !== handler);
    };
  }, [editor, panelId]);

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      const cur = posRef.current;
      const gb = editor?.unifiedDrag
        ? snapshotGroupBounds(editor.dragPanelRects.current)
        : null;
      dragRef.current = {
        startX: clientX, startY: clientY,
        origX: cur.x, origY: cur.y,
        groupBounds: gb,
      };
      lastApplied.current = { dx: 0, dy: 0 };
    },
    [editor],
  );

  const applyMove = useCallback(
    (clientX: number, clientY: number) => {
      const d = dragRef.current;
      if (!d) return;
      const rawDx = clientX - d.startX;
      const rawDy = clientY - d.startY;

      if (editor?.unifiedDrag && d.groupBounds) {
        const { dx, dy } = clampTotalDelta(rawDx, rawDy, d.groupBounds);
        const incX = dx - lastApplied.current.dx;
        const incY = dy - lastApplied.current.dy;
        lastApplied.current = { dx, dy };
        setPos({ x: d.origX + dx, y: d.origY + dy });
        for (const fn of editor.dragBroadcast.current) fn(incX, incY, panelId);
      } else {
        const h = panelRef.current?.offsetHeight ?? 200;
        const c = clampSingle(d.origX + rawDx, d.origY + rawDy, width, h);
        setPos(c);
      }
    },
    [editor, panelId, width, setPos],
  );

  const endDrag = useCallback(() => { dragRef.current = null; }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
      const onMove = (ev: MouseEvent) => applyMove(ev.clientX, ev.clientY);
      const onUp = () => {
        endDrag();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [startDrag, applyMove, endDrag],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY);
      const onMove = (ev: TouchEvent) => {
        const tc = ev.touches[0];
        applyMove(tc.clientX, tc.clientY);
      };
      const onUp = () => {
        endDrag();
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
      };
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    },
    [startDrag, applyMove, endDrag],
  );

  const resetPos = useCallback(() => {
    const h = panelRef.current?.offsetHeight ?? 200;
    setPos(clampSingle(defaultX, defaultY, width, h));
  }, [defaultX, defaultY, width, setPos]);

  const mountCountRef = useRef(0);
  const prevInitialPosRef = useRef(initialPos);
  useEffect(() => {
    const isFirst = mountCountRef.current === 0;
    mountCountRef.current++;
    const prev = prevInitialPosRef.current;
    prevInitialPosRef.current = initialPos;
    if (!initialPos || isFirst) return;
    if (prev && prev.x === initialPos.x && prev.y === initialPos.y) return;
    const h = panelRef.current?.offsetHeight ?? 200;
    setPos(clampSingle(initialPos.x, initialPos.y, width, h));
  }, [initialPos, width, setPos]);

  return (
    <div
      ref={panelRef}
      className="fixed z-[99998] flex flex-col select-none"
      style={{
        top: pos.y,
        left: pos.x,
        width,
        background: pt.panel.bg,
        border: `1px solid ${pt.panel.border}`,
        borderRadius: 16,
        boxShadow: pt.panel.shadow,
        backdropFilter: pt.panel.backdrop,
        transition: dragRef.current ? 'none' : 'box-shadow 0.2s',
      }}
    >
      <div
        className="flex items-center justify-between px-3.5 py-2.5 cursor-grab active:cursor-grabbing"
        style={{ borderBottom: minimized ? 'none' : `1px solid ${pt.header.borderBottom}` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-xs font-bold truncate" style={{ color: pt.header.title }}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); resetPos(); }}
            className="p-1 rounded-md transition-colors hover:scale-110"
            style={{ color: pt.header.iconMuted }}
            title="Reinitialiser la position"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onMinimize(); }}
            className="p-1 rounded-md transition-colors hover:scale-110"
            style={{ color: pt.header.iconMuted }}
            title={minimized ? 'Agrandir' : 'Reduire'}
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="p-1 rounded-md transition-colors hover:scale-110"
            style={{ color: pt.header.iconMuted }}
            title="Fermer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!minimized && children}
    </div>
  );
}
