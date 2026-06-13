import { useEffect, useState, useCallback } from 'react';
import { useEditorModeSafe, type EditorZone } from '../../contexts/EditorModeContext';

interface ZoneRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  sidebarBodyRef: React.RefObject<HTMLElement | null>;
  topbarRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLElement | null>;
  logoRef: React.RefObject<HTMLElement | null>;
}

const ZONE_COLORS: Record<EditorZone, string> = {
  zone1: '59,130,246',
  zone2: '168,85,247',
  zone3: '34,197,94',
  zone4: '249,115,22',
};

export default function EditorZoneHighlight({ sidebarBodyRef, topbarRef, contentRef, logoRef }: Props) {
  const editor = useEditorModeSafe();
  const [rect, setRect] = useState<ZoneRect | null>(null);

  const measure = useCallback(() => {
    if (!editor?.editorOpen || !editor.activeZone) { setRect(null); return; }
    const refMap: Record<EditorZone, React.RefObject<HTMLElement | null>> = {
      zone1: logoRef,
      zone2: sidebarBodyRef,
      zone3: topbarRef,
      zone4: contentRef,
    };
    const el = refMap[editor.activeZone]?.current;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [editor?.editorOpen, editor?.activeZone, sidebarBodyRef, topbarRef, contentRef, logoRef]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    const id = setInterval(measure, 500);
    return () => { window.removeEventListener('resize', measure); clearInterval(id); };
  }, [measure]);

  if (!editor?.editorOpen || !editor.activeZone || !rect) return null;

  const rgb = ZONE_COLORS[editor.activeZone];

  return (
    <div
      className="fixed pointer-events-none z-[99997] transition-all duration-300"
      style={{
        top: rect.top - 2,
        left: rect.left - 2,
        width: rect.width + 4,
        height: rect.height + 4,
        border: `2px solid rgba(${rgb}, 0.7)`,
        borderRadius: 8,
        boxShadow: `0 0 0 4px rgba(${rgb}, 0.12), inset 0 0 0 1px rgba(${rgb}, 0.15), 0 0 20px rgba(${rgb}, 0.15)`,
      }}
    >
      <div
        className="absolute -top-6 left-2 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
        style={{
          background: `rgba(${rgb}, 0.9)`,
          color: '#fff',
          boxShadow: `0 2px 8px rgba(${rgb}, 0.3)`,
        }}
      >
        Zone {editor.activeZone.replace('zone', '')}
      </div>
    </div>
  );
}
