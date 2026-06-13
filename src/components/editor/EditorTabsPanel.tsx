import { useState } from 'react';
import { Layers, Image, Type, PanelLeftClose, PanelLeftOpen, LayoutGrid } from 'lucide-react';
import { useEditorMode, type EditorTab } from '../../contexts/EditorModeContext';
import { getEditorPanelTokens, type EditorPanelTokens } from './editorPanelTheme';
import DraggablePanel from './DraggablePanel';

interface EditorFamily {
  id: EditorTab;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const FAMILIES: EditorFamily[] = [
  { id: 'fonds', label: 'Fonds', icon: <Layers className="w-4 h-4" />, enabled: true },
  { id: 'image', label: 'Image', icon: <Image className="w-4 h-4" />, enabled: true },
  { id: 'texte', label: 'Textes onglets', icon: <Type className="w-4 h-4" />, enabled: true },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onCollapse: () => void;
  initialPos?: { x: number; y: number } | null;
  onPositionChange?: (x: number, y: number) => void;
}

export default function EditorTabsPanel({ visible, onClose, onCollapse, initialPos, onPositionChange }: Props) {
  const ctx = useEditorMode();
  const pt = getEditorPanelTokens(ctx.panelTheme, ctx.panelPalettePreview || ctx.customPanelPalette);
  const [minimized, setMinimized] = useState(false);

  if (!visible) return null;

  return (
    <DraggablePanel
      title="Onglets"
      icon={<LayoutGrid className="w-3.5 h-3.5" style={{ color: pt.accent.solid }} />}
      defaultX={16}
      defaultY={80}
      width={272}
      minimized={minimized}
      initialPos={initialPos}
      onPositionChange={onPositionChange}
      onMinimize={() => setMinimized(m => !m)}
      onClose={onClose}
    >
      <div className="flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 160px)', minHeight: 420 }}>
        <div className="flex-1 overflow-y-auto min-h-0">
          <p
            className="text-[9px] px-3.5 pt-3 pb-1"
            style={{ color: pt.label.muted }}
          >
            Choisir une partie a modifier
          </p>

          <div className="px-3 pb-3 pt-1 flex flex-col gap-1.5">
            {FAMILIES.map(fam => (
              <FamilyButton
                key={fam.id}
                family={fam}
                active={fam.enabled && ctx.editorTab === fam.id}
                onClick={() => {
                  if (!fam.enabled) return;
                  ctx.setEditorTab(fam.id);
                }}
                pt={pt}
              />
            ))}
          </div>
        </div>

        <div
          className="flex-shrink-0 px-3 pb-3 pt-2"
          style={{ borderTop: `1px solid ${pt.surface.border}` }}
        >
          <button
            onClick={onCollapse}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: pt.surface.secondary,
              color: pt.text.secondary,
              border: `1px solid ${pt.surface.border}`,
            }}
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
            Reduire
          </button>
        </div>
      </div>
    </DraggablePanel>
  );
}

export function EditorTabsCollapsedButton({ onClick, pt, contenuPos }: { onClick: () => void; pt: EditorPanelTokens; contenuPos?: { x: number; y: number } | null }) {
  const btnWidth = 82;
  const left = contenuPos ? contenuPos.x - btnWidth : 0;
  const top = contenuPos ? contenuPos.y : 80;

  return (
    <button
      onClick={onClick}
      className="fixed z-[99998] flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold transition-colors duration-200"
      style={{
        top,
        left,
        width: btnWidth,
        background: pt.panel.bg,
        border: `1px solid ${pt.panel.border}`,
        borderRight: 'none',
        borderRadius: '12px 0 0 12px',
        boxShadow: pt.panel.shadow,
        backdropFilter: pt.panel.backdrop,
        color: pt.accent.text,
      }}
    >
      <PanelLeftOpen className="w-3.5 h-3.5" />
      <span>Onglets</span>
    </button>
  );
}

function FamilyButton({ family, active, onClick, pt }: {
  family: EditorFamily;
  active: boolean;
  onClick: () => void;
  pt: EditorPanelTokens;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[12px] font-bold transition-all duration-200 hover:scale-[1.01]"
      style={{
        background: active
          ? `linear-gradient(135deg, ${pt.accent.solid}, ${pt.accent.bgHover})`
          : pt.surface.secondary,
        color: active ? '#fff' : pt.text.primary,
        border: `1px solid ${active ? pt.accent.border : pt.surface.border}`,
        boxShadow: active ? `0 4px 16px ${pt.accent.bg}` : 'none',
      }}
    >
      <span className="flex-shrink-0">{family.icon}</span>
      <span className="flex-1 text-left">{family.label}</span>
    </button>
  );
}
