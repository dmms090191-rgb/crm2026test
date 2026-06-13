import { useState, useCallback } from 'react';
import { ArrowLeft, Paintbrush, Bookmark, Link2, Unlink2, AlignHorizontalDistributeCenter, Pencil, LayoutGrid, PanelTopOpen, Save } from 'lucide-react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import { SaveSessionBtn, ToolbarBtn } from '../../components/editor/EditorToolbarButtons';

interface Props {
  title: string;
  onBack: () => void;
  onSaveSession: () => Promise<boolean>;
  onSaveTheme: () => void;
  onAlignPanels?: () => void;
  brushesActive?: boolean;
  onToggleBrushes?: () => void;
  previewBarActive?: boolean;
  onTogglePreviewBar?: () => void;
  panelsVisible?: boolean;
  onTogglePanels?: () => void;
  vcHasPending?: boolean;
  onVcSaveAll?: () => Promise<void>;
}

export default function EditorSubModeToolbar({
  title, onBack, onSaveSession, onSaveTheme, onAlignPanels,
  brushesActive, onToggleBrushes, previewBarActive, onTogglePreviewBar,
  panelsVisible, onTogglePanels, vcHasPending, onVcSaveAll,
}: Props) {
  const { editingThemeKey, unifiedDrag, toggleUnifiedDrag } = useEditorMode();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    const ok = await onSaveSession();
    setSaveStatus(ok ? 'saved' : 'error');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [onSaveSession]);

  return (
    <div
      data-editor-toolbar="true"
      className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5"
      style={{
        background: 'rgba(10,12,20,0.88)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: 'rgba(255,255,255,0.65)',
        }}
      >
        <ArrowLeft className="w-3 h-3" />
        <span className="hidden sm:inline">Retour</span>
      </button>

      <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />

      <div className="flex items-center gap-1.5">
        <Paintbrush className="w-3 h-3" style={{ color: '#60a5fa' }} />
        <span className="text-[10px] font-bold tracking-wide uppercase" style={{ color: '#60a5fa' }}>
          {title}
        </span>
      </div>

      {onTogglePanels && (
        <>
          <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <ToolbarBtn
            icon={<PanelTopOpen className="w-3 h-3" />}
            label="Afficher les reglages"
            onClick={onTogglePanels}
            active={panelsVisible}
          />
        </>
      )}

      {onAlignPanels && (
        <>
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
        </>
      )}

      {onToggleBrushes && (
        <>
          <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <ToolbarBtn
            icon={<Pencil className="w-3 h-3" />}
            label="Modification"
            onClick={onToggleBrushes}
            active={brushesActive}
          />
        </>
      )}

      {onTogglePreviewBar && (
        <ToolbarBtn
          icon={<LayoutGrid className="w-3 h-3" />}
          label="Apercu modals"
          onClick={onTogglePreviewBar}
          active={previewBarActive}
        />
      )}

      <div className="flex-1" />

      {onVcSaveAll && <VcSaveAllBtn hasPending={!!vcHasPending} onSave={onVcSaveAll} />}
      <SaveSessionBtn status={saveStatus} onClick={handleSave} />
      <button
        onClick={onSaveTheme}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
        style={{
          background: 'rgba(52,211,153,0.12)',
          border: '1px solid rgba(52,211,153,0.25)',
          color: '#34d399',
        }}
      >
        <Bookmark className="w-3 h-3" />
        <span className="hidden sm:inline">
          {editingThemeKey ? 'Mettre a jour le theme' : 'Enregistrer dans Themes personnalises'}
        </span>
      </button>
    </div>
  );
}

function VcSaveAllBtn({ hasPending, onSave }: { hasPending: boolean; onSave: () => Promise<void> }) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const handleClick = useCallback(async () => {
    setStatus('saving');
    await onSave();
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2000);
  }, [onSave]);
  return (
    <button
      onClick={handleClick}
      disabled={status === 'saving' || (!hasPending && status === 'idle')}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40"
      style={{
        background: hasPending ? 'linear-gradient(135deg, #06b6d4, #2563eb)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${hasPending ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.10)'}`,
        color: hasPending ? '#fff' : 'rgba(255,255,255,0.5)',
        boxShadow: hasPending ? '0 4px 14px rgba(34,211,238,0.35)' : 'none',
      }}
      title="Sauvegarder toutes les personnalisations"
    >
      <Save className="w-3 h-3" />
      <span className="hidden sm:inline">
        {status === 'saving' ? 'Sauvegarde...' : status === 'saved' ? 'Sauvegarde !' : 'Sauvegarder'}
      </span>
    </button>
  );
}
