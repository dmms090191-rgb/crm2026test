import { useState } from 'react';
import { LayoutGrid, Layers, Image, Type } from 'lucide-react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import { getEditorPanelTokens } from './editorPanelTheme';
import DraggablePanel from './DraggablePanel';
import EditorFondsContent from './EditorFondsContent';
import EditorImageContent from './EditorImageContent';
import EditorTextesContent from './EditorTextesContent';

interface SidebarCategory {
  title: string;
  items: { id: string; label: string }[];
}

export const SA_SIDEBAR_CATEGORIES: SidebarCategory[] = [
  { title: 'Principal', items: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'logo', label: 'Logo' },
    { id: 'site-talvex', label: 'Site' },
    { id: 'application', label: 'Application' },
    { id: 'themes', label: 'Themes' },
    { id: 'tuto', label: 'Tuto' },
  ] },
  { title: 'Gestion', items: [
    { id: 'admins', label: 'Liste admins' },
    { id: 'mon-compte', label: 'Mon compte' },
    { id: 'crm-societe', label: 'CRM Societe' },
    { id: 'sites', label: 'Sites & Domaines' },
    { id: 'statuts', label: 'Statuts' },
  ] },
  { title: 'Contact', items: [
    { id: 'chat-admin', label: 'Chat Admin' },
  ] },
  { title: 'Outils & Système', items: [
    { id: 'api-ia', label: 'API IA' },
    { id: 'ameliorations', label: 'Ameliorations' },
    { id: 'fonctions-talvex', label: 'Fonctions Talvex' },
    { id: 'cerveau-ia', label: 'Cerveau IA SA' },
    { id: 'editeur-ia', label: 'Editeur IA' },
  ] },
  { title: 'Maintenance', items: [
    { id: 'system', label: 'System' },
    { id: 'documentation-crm', label: 'Documentation CRM' },
    { id: 'tests-systeme', label: 'Tests Systeme' },
    { id: 'sauvegarde', label: 'Sauvegarde & restauration' },
  ] },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  initialPos?: { x: number; y: number } | null;
  onPositionChange?: (x: number, y: number) => void;
}

export default function EditorBackgroundsModal({ visible, onClose, initialPos, onPositionChange }: Props) {
  const ctx = useEditorMode();
  const pt = getEditorPanelTokens(ctx.panelTheme, ctx.panelPalettePreview || ctx.customPanelPalette);
  const [minimized, setMinimized] = useState(false);

  if (!visible) return null;

  const tabIcon = ctx.editorTab === 'fonds'
    ? <Layers className="w-3 h-3" style={{ color: pt.accent.solid }} />
    : ctx.editorTab === 'image'
      ? <Image className="w-3 h-3" style={{ color: pt.accent.solid }} />
      : <Type className="w-3 h-3" style={{ color: pt.accent.solid }} />;
  const tabLabel = ctx.editorTab === 'fonds' ? 'Fonds' : ctx.editorTab === 'image' ? 'Image' : 'Textes onglets';

  return (
    <DraggablePanel
      title="Contenu"
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
        <div className="px-3 pt-2 pb-1.5 flex items-center gap-1.5">
          {tabIcon}
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pt.accent.text }}>
            {tabLabel}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {ctx.editorTab === 'fonds' ? (
            <EditorFondsContent ctx={ctx} pt={pt} />
          ) : ctx.editorTab === 'image' ? (
            <EditorImageContent ctx={ctx} pt={pt} />
          ) : (
            <EditorTextesContent ctx={ctx} pt={pt} typoTarget={ctx.typoTarget} onTypoTargetChange={ctx.setTypoTarget} />
          )}
        </div>
      </div>
    </DraggablePanel>
  );
}
