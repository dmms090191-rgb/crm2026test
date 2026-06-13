import { useState, useMemo, useRef } from 'react';
import { Bookmark, X, Sparkles, Zap } from 'lucide-react';
import type { VCConfig, VCElementType } from './visualCustomizeTypes';
import { useVCPresets, type VCModalKind, type VCPreset } from './useVCPresets';
import { useVCDraggable } from './useVCDraggable';
import { useVisualCustomize } from './VisualCustomizeContext';

interface Props {
  elementType: VCElementType;
  modalKind: VCModalKind;
  currentConfig: VCConfig | null;
  onApply: (cfg: VCConfig) => void;
}

const MODAL_KINDS: VCModalKind[] = ['A', 'B', 'C', 'D', 'E'];

export default function VCPresetsPanel({ elementType, modalKind, currentConfig, onApply }: Props) {
  const { presets, savePreset, deletePreset } = useVCPresets(elementType, modalKind);
  const { quickApply, setQuickApply } = useVisualCustomize();
  const [name, setName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const { pos, onHeaderMouseDown } = useVCDraggable(panelRef);

  const grouped = useMemo(() => {
    const map: Record<VCModalKind, VCPreset[]> = { A: [], B: [], C: [], D: [], E: [] };
    for (const p of presets) {
      const k = p.modal_kind as VCModalKind;
      if (k && map[k]) map[k].push(p);
    }
    return map;
  }, [presets]);

  const currentPresets = grouped[modalKind] ?? [];
  const otherKinds = MODAL_KINDS.filter(k => k !== modalKind && grouped[k].length > 0);

  const handleSave = async () => {
    if (!currentConfig || !name.trim()) return;
    await savePreset(name, currentConfig);
    setName('');
  };

  const isQuickActive = quickApply.active;

  const toggleQuickApply = () => {
    if (isQuickActive) {
      setQuickApply({ active: false, presetConfig: null, presetModalKind: null, presetName: '' });
    } else {
      setQuickApply({ active: true, presetConfig: null, presetModalKind: null, presetName: '' });
    }
  };

  const selectForQuickApply = (preset: VCPreset) => {
    if (!isQuickActive) return;
    const isSame = quickApply.presetName === preset.name && quickApply.presetModalKind === preset.modal_kind;
    if (isSame) {
      setQuickApply({ ...quickApply, presetConfig: null, presetModalKind: null, presetName: '' });
    } else {
      setQuickApply({ ...quickApply, presetConfig: preset.config, presetModalKind: preset.modal_kind, presetName: preset.name });
    }
  };

  return (
    <div
      ref={panelRef}
      className="hidden lg:flex flex-col w-56 rounded-2xl overflow-hidden mr-2 relative pointer-events-auto"
      data-vc-presets
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      style={{
        background: 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.96))',
        border: '1px solid rgba(34,211,238,0.18)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(34,211,238,0.08)',
        maxHeight: 'calc(100vh - 48px)',
        transform: `translate(${pos.x}px, ${pos.y}px)`,
      }}
    >
      <PanelHeader onHeaderMouseDown={onHeaderMouseDown} />

      <SaveSection
        name={name}
        setName={setName}
        onSave={handleSave}
        canSave={!!currentConfig && !!name.trim()}
        modalKind={modalKind}
        hasPresets={presets.length > 0}
        isQuickActive={isQuickActive}
        onToggleQuick={toggleQuickApply}
      />

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {presets.length === 0 && <EmptyState />}

        {currentPresets.length > 0 && (
          <PresetGroup
            kind={modalKind}
            items={currentPresets}
            isCurrent
            isQuickActive={isQuickActive}
            quickApply={quickApply}
            onApply={onApply}
            onSelectQuick={selectForQuickApply}
            onDelete={deletePreset}
          />
        )}

        {otherKinds.map(k => (
          <PresetGroup
            key={k}
            kind={k}
            items={grouped[k]}
            isCurrent={false}
            isQuickActive={isQuickActive}
            quickApply={quickApply}
            onApply={onApply}
            onSelectQuick={selectForQuickApply}
            onDelete={deletePreset}
          />
        ))}
      </div>
    </div>
  );
}

function PanelHeader({ onHeaderMouseDown }: { onHeaderMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      className="flex items-center gap-2 px-3.5 py-3 cursor-move select-none"
      onMouseDown={onHeaderMouseDown}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <Bookmark className="w-3.5 h-3.5" style={{ color: '#22d3ee' }} />
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#22d3ee' }}>
        Bibliotheque de reglages
      </span>
    </div>
  );
}

interface SaveSectionProps {
  name: string;
  setName: (v: string) => void;
  onSave: () => void;
  canSave: boolean;
  modalKind: VCModalKind;
  hasPresets: boolean;
  isQuickActive: boolean;
  onToggleQuick: () => void;
}

function SaveSection({ name, setName, onSave, canSave, modalKind, hasPresets, isQuickActive, onToggleQuick }: SaveSectionProps) {
  return (
    <div className="px-3 py-2.5 space-y-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex items-center gap-1.5">
        <span
          className="flex items-center justify-center w-5 h-5 rounded text-[9px] font-black flex-shrink-0"
          style={{ background: 'rgba(34,211,238,0.15)', color: '#67e8f9', border: '1px solid rgba(34,211,238,0.3)' }}
        >
          {modalKind}
        </span>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') onSave(); }}
          placeholder="Nom du reglage..."
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-[11px] outline-none placeholder:text-slate-500"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(34,211,238,0.2)', color: '#e2e8f0' }}
        />
      </div>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onSave(); }}
        onMouseDown={e => e.stopPropagation()}
        disabled={!canSave}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #06b6d4, #2563eb)', color: '#fff', boxShadow: '0 6px 18px rgba(34,211,238,0.35)' }}
      >
        <Sparkles className="w-3 h-3" /> Enregistrer ({modalKind})
      </button>

      {hasPresets && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggleQuick(); }}
          onMouseDown={e => e.stopPropagation()}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-[1.02]"
          style={{
            background: isQuickActive ? 'rgba(234,179,8,0.18)' : 'rgba(255,255,255,0.04)',
            color: isQuickActive ? '#fbbf24' : '#94a3b8',
            border: `1px solid ${isQuickActive ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: isQuickActive ? '0 0 12px rgba(234,179,8,0.2)' : 'none',
          }}
        >
          <Zap className="w-3 h-3" /> Application rapide
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-6 px-2">
      <div className="w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2" style={{ background: 'rgba(34,211,238,0.08)' }}>
        <Bookmark className="w-3.5 h-3.5" style={{ color: '#67e8f9' }} />
      </div>
      <p className="text-[10px] leading-relaxed" style={{ color: '#64748b' }}>
        Aucun reglage enregistre.<br />Cree ton premier preset.
      </p>
    </div>
  );
}

interface PresetGroupProps {
  kind: VCModalKind;
  items: VCPreset[];
  isCurrent: boolean;
  isQuickActive: boolean;
  quickApply: { presetConfig: VCConfig | null; presetModalKind: VCModalKind | null; presetName: string };
  onApply: (cfg: VCConfig) => void;
  onSelectQuick: (p: VCPreset) => void;
  onDelete: (id: string) => void;
}

function PresetGroup({ kind, items, isCurrent, isQuickActive, quickApply, onApply, onSelectQuick, onDelete }: PresetGroupProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="flex items-center justify-center w-4 h-4 rounded text-[8px] font-black flex-shrink-0"
          style={{
            background: isCurrent ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.06)',
            color: isCurrent ? '#67e8f9' : '#64748b',
            border: `1px solid ${isCurrent ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {kind}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: isCurrent ? '#94a3b8' : '#475569' }}>
          Modal {kind} {isCurrent && '(actuel)'}
        </span>
      </div>
      <div className="space-y-1">
        {items.map(p => {
          const isSelected = isQuickActive && quickApply.presetName === p.name && quickApply.presetModalKind === p.modal_kind;
          const isCompatible = isCurrent;
          return (
            <div
              key={p.id}
              className="group flex items-center gap-1 rounded-lg overflow-hidden transition-all hover:scale-[1.02]"
              style={{
                background: isSelected ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isSelected ? 'rgba(234,179,8,0.35)' : 'rgba(255,255,255,0.06)'}`,
                opacity: !isCurrent && !isQuickActive ? 0.55 : 1,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (isQuickActive) { onSelectQuick(p); return; }
                  if (isCompatible) onApply(p.config);
                }}
                className="flex-1 text-left px-2.5 py-1.5 text-[10px] font-semibold truncate transition-colors"
                style={{ color: isSelected ? '#fbbf24' : '#e2e8f0' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.color = isCompatible || isQuickActive ? '#67e8f9' : '#94a3b8'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.color = '#e2e8f0'; }}
                title={isQuickActive ? `Selectionner : ${p.name}` : isCompatible ? `Appliquer : ${p.name}` : `Incompatible (Modal ${kind})`}
              >
                {isSelected && <Zap className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />}
                {p.name}
              </button>
              <button
                type="button"
                onClick={() => onDelete(p.id)}
                className="w-6 h-6 mr-1 flex items-center justify-center rounded-md opacity-50 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                style={{ color: '#fca5a5' }}
                title="Supprimer le preset"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
