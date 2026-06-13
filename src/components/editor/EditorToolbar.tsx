import { useState, useCallback } from 'react';
import { Paintbrush, Link2, Unlink2, RotateCcw, X, Bookmark, AlignHorizontalDistributeCenter, Ruler } from 'lucide-react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import { PaletteModalsDropdown } from './EditorToolbarPaletteDropdown';
import { SaveSessionBtn, ToolbarBtn } from './EditorToolbarButtons';
import MeasureSurfaceTool from './MeasureSurfaceTool';

interface Props {
  onSaveTheme: () => void;
  onResetPositions: () => void;
  onAlignPanels: () => void;
  onSaveSession: () => Promise<boolean>;
}

export default function EditorToolbar({ onSaveTheme, onResetPositions, onAlignPanels, onSaveSession }: Props) {
  const { editorOpen, unifiedDrag, toggleUnifiedDrag, closeEditor, clearAllOverrides, editingThemeKey } = useEditorMode();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [measuring, setMeasuring] = useState(false);

  const handleSaveSession = useCallback(async () => {
    setSaveStatus('saving');
    const ok = await onSaveSession();
    setSaveStatus(ok ? 'saved' : 'error');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [onSaveSession]);

  if (!editorOpen) return null;

  return (
    <div data-editor-toolbar="true" className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5" style={{
      background: 'rgba(10,12,20,0.85)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="flex items-center gap-1.5">
        <Paintbrush className="w-3 h-3" style={{ color: '#60a5fa' }} />
        <span className="text-[10px] font-bold tracking-wide uppercase" style={{ color: '#60a5fa' }}>
          Mode Editeur actif
        </span>
      </div>

      <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />

      <ToolbarBtn
        icon={unifiedDrag ? <Link2 className="w-3 h-3" /> : <Unlink2 className="w-3 h-3" />}
        label={unifiedDrag ? 'Modals unis' : 'Unir'}
        onClick={toggleUnifiedDrag}
        active={unifiedDrag}
      />
      <ToolbarBtn
        icon={<AlignHorizontalDistributeCenter className="w-3 h-3" />}
        label="Aligner"
        onClick={onAlignPanels}
      />
      <ToolbarBtn
        icon={<RotateCcw className="w-3 h-3" />}
        label="Reset position"
        onClick={onResetPositions}
      />
      <ToolbarBtn
        icon={<Ruler className="w-3 h-3" />}
        label="Mesurer surface"
        onClick={() => setMeasuring(m => !m)}
        active={measuring}
      />

      <div className="w-px h-4 mx-0.5" style={{ background: 'rgba(255,255,255,0.06)' }} />

      <PaletteModalsDropdown />

      <div className="w-px h-4 mx-0.5" style={{ background: 'rgba(255,255,255,0.06)' }} />

      <SaveSessionBtn status={saveStatus} onClick={handleSaveSession} />
      <ToolbarBtn
        icon={<Bookmark className="w-3 h-3" />}
        label={editingThemeKey ? 'Mettre a jour le theme' : 'Enregistrer dans Themes personnalises'}
        onClick={onSaveTheme}
        accent
      />

      <div className="flex-1" />

      <ToolbarBtn
        icon={<RotateCcw className="w-3 h-3" />}
        label="Reset couleurs"
        onClick={clearAllOverrides}
        danger
      />
      <ToolbarBtn
        icon={<X className="w-3 h-3" />}
        label="Quitter"
        onClick={closeEditor}
        danger
      />
      <MeasureSurfaceTool active={measuring} onClose={() => setMeasuring(false)} />
    </div>
  );
}
