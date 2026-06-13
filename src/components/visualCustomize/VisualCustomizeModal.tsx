import { useEffect, useMemo, useRef } from 'react';
import { X, RotateCcw, Undo2, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useVisualCustomize } from './VisualCustomizeContext';
import { defaultFor, DEFAULT_CARD, type VCConfig } from './visualCustomizeTypes';
import VCCardEditor from './VCCardEditor';
import VCButtonEditor from './VCButtonEditor';
import VCTextEditor from './VCTextEditor';
import VCHybridEditor from './VCHybridEditor';
import VCPresetsPanel from './VCPresetsPanel';
import { useVCDraggable } from './useVCDraggable';
import { VCColor } from './VisualCustomizeControls';
import type { VCTextConfig } from './visualCustomizeTypes';
import { DEFAULT_TEXT } from './visualCustomizeTypes';

const GROUP_ONLY_IDS = new Set<string>(['sa-health-audit-rows-group']);

export default function VisualCustomizeModal() {
  const { activeSelection, setActiveSelection, configs, draft, updateDraft, resetDraft, resetElement, markersHidden, setMarkersHidden } = useVisualCustomize();
  const closeModal = () => { setMarkersHidden(false); setActiveSelection(null); };
  const modalRef = useRef<HTMLDivElement>(null);
  const { pos, onHeaderMouseDown } = useVCDraggable(modalRef);

  useEffect(() => {
    if (!activeSelection) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (modalRef.current?.contains(target)) return;
      if (target.closest('[data-vc-overlay]')) return;
      if (target.closest('[data-vc-presets]')) return;
      closeModal();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [activeSelection, setActiveSelection]);

  const current = useMemo<VCConfig | null>(() => {
    if (!activeSelection) return null;
    const isHybridSel = activeSelection.id.startsWith('hybrid-') || activeSelection.label.toLowerCase().startsWith('hybride');
    const fallback = isHybridSel ? { ...DEFAULT_CARD } : defaultFor(activeSelection.type);
    return draft[activeSelection.id] ?? configs[activeSelection.id] ?? fallback;
  }, [activeSelection, draft, configs]);

  if (!activeSelection) return null;

  const handleReset = async () => {
    await resetElement(activeSelection.id);
  };

  const handleUndo = () => {
    resetDraft(activeSelection.id);
  };

  const labelLc = activeSelection.label.toLowerCase();
  const isHybrid = activeSelection.id.startsWith('hybrid-') || labelLc.startsWith('hybride');
  const isIconOrBadge = activeSelection.type === 'text' && (
    labelLc.startsWith('icone') || labelLc.startsWith('icône') || labelLc.startsWith('badge')
  );
  const isSimpleText = activeSelection.type === 'text' && !isIconOrBadge;
  const isGroupOnly = !isHybrid && (GROUP_ONLY_IDS.has(activeSelection.id) || isIconOrBadge || isSimpleText);
  const colorOnlyLabel = labelLc.startsWith('badge')
    ? 'Couleur du badge'
    : labelLc.startsWith('icone') || labelLc.startsWith('icône')
      ? "Couleur de l'icone"
      : 'Couleur principale';
  const colorOnlyHint = labelLc.startsWith('badge')
    ? 'Choisissez la couleur du badge.'
    : labelLc.startsWith('icone') || labelLc.startsWith('icône')
      ? "Choisissez la couleur de l'icone."
      : "Choisissez une couleur principale. Elle s'applique a tous les elements internes de la carte Sante du projet.";
  const typeLabel = isIconOrBadge
    ? (labelLc.startsWith('badge') ? 'le badge' : "l'icone")
    : GROUP_ONLY_IDS.has(activeSelection.id)
      ? 'le groupe'
      : activeSelection.type === 'card' ? 'la carte' : activeSelection.type === 'button' ? 'le bouton' : 'le texte';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-end p-4 sm:p-6 pointer-events-none">
      {(() => {
        const modalKind: 'A' | 'B' | 'C' | 'D' | 'E' =
          isHybrid
            ? 'E'
            : activeSelection.type === 'button' && !isGroupOnly
              ? 'A'
              : (labelLc.startsWith('icone') || labelLc.startsWith('icône'))
                ? 'B'
                : (GROUP_ONLY_IDS.has(activeSelection.id) || isSimpleText)
                  ? 'C'
                  : activeSelection.type === 'card'
                    ? 'D'
                    : 'C';
        return (
          <VCPresetsPanel
            elementType={activeSelection.type}
            modalKind={modalKind}
            currentConfig={current}
            onApply={(cfg) => updateDraft(activeSelection.id, cfg)}
          />
        );
      })()}
      <div
        ref={modalRef}
        className="relative pointer-events-auto w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.96))',
          border: '1px solid rgba(34,211,238,0.25)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,211,238,0.08), 0 0 60px rgba(34,211,238,0.15)',
          maxHeight: 'calc(100vh - 48px)',
          transform: `translate(${pos.x}px, ${pos.y}px)`,
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 cursor-move select-none"
          onMouseDown={onHeaderMouseDown}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #2563eb)', boxShadow: '0 4px 14px rgba(34,211,238,0.4)' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#22d3ee' }}>{
                isHybrid
                  ? 'Modal E'
                  : activeSelection.type === 'button' && !isGroupOnly
                    ? 'Modal A'
                    : (labelLc.startsWith('icone') || labelLc.startsWith('icône'))
                      ? 'Modal B'
                      : (GROUP_ONLY_IDS.has(activeSelection.id) || isSimpleText)
                        ? 'Modal C'
                        : activeSelection.type === 'card'
                          ? 'Modal D'
                          : `Personnaliser ${typeLabel}`
              }</p>
              <p className="text-[13px] font-bold" style={{ color: '#f1f5f9' }}>{activeSelection.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMarkersHidden(!markersHidden)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: markersHidden ? 'rgba(34,211,238,0.18)' : 'transparent',
                color: markersHidden ? '#22d3ee' : '#94a3b8',
                border: `1px solid ${markersHidden ? 'rgba(34,211,238,0.35)' : 'transparent'}`,
              }}
              title={markersHidden ? 'Afficher les reperes' : 'Masquer les reperes'}
            >
              {markersHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => closeModal()}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ color: '#94a3b8' }}
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isHybrid ? (
            <VCHybridEditor value={current as never} onChange={(v) => updateDraft(activeSelection.id, v)} />
          ) : isGroupOnly ? (
            (() => {
              const textCfg = (current as VCTextConfig | null) ?? { ...DEFAULT_TEXT };
              const showBg = isIconOrBadge;
              return (
                <div className="space-y-3">
                  <p className="text-[11px] leading-relaxed" style={{ color: '#94a3b8' }}>
                    {colorOnlyHint}
                  </p>
                  <VCColor
                    label={colorOnlyLabel}
                    value={textCfg.color}
                    onChange={(v) => updateDraft(activeSelection.id, { ...textCfg, color: v })}
                  />
                  {showBg && (
                    <VCColor
                      label="Couleur de fond"
                      value={textCfg.background ?? '#22c55e20'}
                      onChange={(v) => updateDraft(activeSelection.id, { ...textCfg, background: v, useBackground: true })}
                    />
                  )}
                </div>
              );
            })()
          ) : (
            <>
              {activeSelection.type === 'card' && (
                <VCCardEditor value={current as never} onChange={(v) => updateDraft(activeSelection.id, v)} />
              )}
              {activeSelection.type === 'button' && (
                <VCButtonEditor value={current as never} onChange={(v) => updateDraft(activeSelection.id, v)} />
              )}
              {activeSelection.type === 'text' && (
                <VCTextEditor value={current as never} onChange={(v) => updateDraft(activeSelection.id, v)} />
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}
            title="Restaurer le style par defaut"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
            title="Annuler les changements de cet element"
          >
            <Undo2 className="w-3 h-3" /> Annuler les changements
          </button>
        </div>
      </div>
    </div>
  );
}
