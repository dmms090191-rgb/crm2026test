import { useState } from 'react';
import { BookmarkCheck, Check } from 'lucide-react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import { getEditorPanelTokens } from './editorPanelTheme';
import DraggablePanel from './DraggablePanel';
import {
  loadSavedSolids,
  loadSavedGradients,
} from './editorSavedStore';
import SavedSwatchGrid from './SavedSwatchGrid';
import SavedResetRow from './SavedResetRow';
import { useSavedColorsActions } from './useSavedColorsActions';

interface Props {
  visible: boolean;
  onClose: () => void;
  refreshKey: number;
  initialPos?: { x: number; y: number } | null;
  onPositionChange?: (x: number, y: number) => void;
}

export default function EditorSavedColorsModal({
  visible,
  onClose,
  refreshKey,
  initialPos,
  onPositionChange,
}: Props) {
  const ctx = useEditorMode();
  const pt = getEditorPanelTokens(ctx.panelTheme, ctx.panelPalettePreview || ctx.customPanelPalette);
  const [minimized, setMinimized] = useState(false);

  const solids = loadSavedSolids();
  const gradients = loadSavedGradients();

  const {
    confirmed,
    gradientBlockMsg,
    resetConfirm,
    setResetConfirm,
    previewSaved,
    applySelected,
    removeSolid,
    removeGradient,
    resetSolids,
    resetGradients,
    canApply,
    isTextMode,
    isImageMode,
    isBtnFond,
    isBtnTexte,
  } = useSavedColorsActions(ctx);

  if (!visible) return null;

  const hasSomething = solids.length > 0 || gradients.length > 0;

  void refreshKey;

  return (
    <DraggablePanel
      title="Couleurs sauvegardees"
      icon={
        <BookmarkCheck
          className="w-3.5 h-3.5"
          style={{ color: pt.accent.solid }}
        />
      }
      defaultX={Math.min(window.innerWidth - 290, 530)}
      defaultY={80}
      width={272}
      minimized={minimized}
      onMinimize={() => setMinimized((m) => !m)}
      onClose={onClose}
      initialPos={initialPos}
      onPositionChange={onPositionChange}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 160px)', minHeight: 420 }}
      >
        <div className="flex-1 overflow-y-auto min-h-0">
          <p
            className="text-[8px] px-3 pt-2 pb-1"
            style={{ color: pt.label.muted }}
          >
            {hasSomething
              ? 'Cliquez pour previsualiser. Survolez pour supprimer.'
              : 'Creez une couleur et cliquez sur Sauvegarder.'}
          </p>

          <div className="px-3 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: pt.label.muted }}
              >
                Couleurs unies
              </span>
              <span
                className="text-[9px] font-medium tabular-nums"
                style={{ color: pt.label.muted }}
              >
                {solids.length}
              </span>
            </div>
            <SavedSwatchGrid
              items={solids}
              label="Couleur"
              onPreview={previewSaved}
              onRemove={removeSolid}
              pt={pt}
            />
          </div>

          <div className="mx-3 my-1">
            <div
              className="h-px"
              style={{ background: pt.surface.border }}
            />
          </div>

          <div className="px-3 pb-2 pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: pt.label.muted }}
              >
                Degrades
              </span>
              <span
                className="text-[9px] font-medium tabular-nums"
                style={{ color: pt.label.muted }}
              >
                {gradients.length}
              </span>
            </div>
            <SavedSwatchGrid
              items={gradients}
              label="Degrade"
              onPreview={previewSaved}
              onRemove={removeGradient}
              pt={pt}
            />
          </div>

          <div className="mx-3 mt-2 mb-1">
            <div className="h-px" style={{ background: pt.surface.border }} />
          </div>

          <div className="px-3 pt-1.5 pb-2 flex flex-col gap-2">
            <SavedResetRow
              label="Couleurs unies"
              count={solids.length}
              confirmActive={resetConfirm === 'solids'}
              confirmMessage="Supprimer toutes les couleurs unies sauvegardees ?"
              onAskReset={() => setResetConfirm(resetConfirm === 'solids' ? null : 'solids')}
              onConfirm={resetSolids}
              onCancel={() => setResetConfirm(null)}
              pt={pt}
            />
            <SavedResetRow
              label="Degrades"
              count={gradients.length}
              confirmActive={resetConfirm === 'gradients'}
              confirmMessage="Supprimer tous les degrades sauvegardes ?"
              onAskReset={() => setResetConfirm(resetConfirm === 'gradients' ? null : 'gradients')}
              onConfirm={resetGradients}
              onCancel={() => setResetConfirm(null)}
              pt={pt}
            />
          </div>
        </div>

        <div
          className="flex-shrink-0 px-3 pb-2.5 pt-2"
          style={{ borderTop: `1px solid ${pt.surface.border}` }}
        >
          {gradientBlockMsg && (
            <p className="text-[9px] font-medium text-center mb-2 px-2 py-1.5 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.15)' }}>
              {gradientBlockMsg}
            </p>
          )}
          <button
            onClick={applySelected}
            disabled={!canApply || !hasSomething}
            className="relative w-full py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 overflow-hidden flex items-center justify-center gap-1.5"
            style={{
              background: confirmed
                ? pt.success.text
                : `linear-gradient(135deg, ${pt.accent.solid}, ${pt.accent.bgHover})`,
              color: '#fff',
              border: `1px solid ${confirmed ? pt.success.border : pt.accent.border}`,
            }}
          >
            <Check className="w-3.5 h-3.5" />
            {confirmed || (isImageMode ? 'Mode Image actif' : isBtnFond ? 'Appliquer au fond du bouton' : isBtnTexte ? 'Appliquer au texte du bouton' : isTextMode ? 'Appliquer au texte' : 'Appliquer a la zone')}
          </button>
        </div>
      </div>
    </DraggablePanel>
  );
}
