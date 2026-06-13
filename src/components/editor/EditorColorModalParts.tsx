import { useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import type { EditorPanelTokens } from './editorPanelTheme';

export { TextModeEmptyState, Zone4ImageInfoBanner, ImageModeNotice, ButtonModeEmptyState } from './EditorColorModalEmptyStates';
export { TextModeContent, ButtonTextColorPicker } from './EditorColorModalTextPickers';

export function ButtonSubTabs({ subTarget, onSubTargetChange, pt }: {
  subTarget: 'fond' | 'texte';
  onSubTargetChange: (s: 'fond' | 'texte') => void;
  pt: EditorPanelTokens;
}) {
  return (
    <div className="px-3 pt-2.5 pb-1 flex gap-1.5">
      <ModeBtn label="Fond" active={subTarget === 'fond'} onClick={() => onSubTargetChange('fond')} pt={pt} />
      <ModeBtn label="Texte" active={subTarget === 'texte'} onClick={() => onSubTargetChange('texte')} pt={pt} />
    </div>
  );
}

export function ButtonTargetBanner({ targetLabel, pt }: {
  targetLabel: string;
  pt: EditorPanelTokens;
}) {
  return (
    <div
      className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl mx-3.5"
      style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
    >
      <span className="text-[10px] font-medium" style={{ color: pt.label.muted }}>Cible :</span>
      <span className="text-[10px] font-bold" style={{ color: pt.accent.text }}>{targetLabel}</span>
    </div>
  );
}

export function ButtonApplyButton({ label, onApply, pt }: {
  label: string;
  onApply: () => void;
  pt: EditorPanelTokens;
}) {
  const [applied, setApplied] = useState(false);
  return (
    <button
      onClick={() => {
        onApply();
        setApplied(true);
        setTimeout(() => setApplied(false), 1500);
      }}
      className="w-full py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-1.5"
      style={{
        background: applied ? pt.success.bg : `linear-gradient(135deg, ${pt.accent.solid}, ${pt.accent.bgHover})`,
        color: applied ? pt.success.text : '#fff',
        border: `1px solid ${applied ? pt.success.border : pt.accent.border}`,
        boxShadow: applied ? 'none' : `0 4px 16px ${pt.accent.bg}`,
      }}
    >
      {applied ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Applique !
        </>
      ) : (
        label
      )}
    </button>
  );
}

export function ModeBtn({ label, active, onClick, pt }: { label: string; active: boolean; onClick: () => void; pt: EditorPanelTokens }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-200"
      style={{
        background: active ? `linear-gradient(135deg, ${pt.accent.bg}, ${pt.accent.bgHover})` : pt.surface.secondary,
        color: active ? pt.accent.text : pt.label.muted,
        border: `1px solid ${active ? pt.accent.border : pt.surface.border}`,
        boxShadow: active ? `0 2px 8px ${pt.accent.bg}` : 'none',
      }}
    >
      {label}
    </button>
  );
}

export function ButtonOpacityToggle({ value, onChange, pt }: {
  value: 'transparent' | 'opaque';
  onChange: (v: 'transparent' | 'opaque') => void;
  pt: EditorPanelTokens;
}) {
  const isTransparent = value === 'transparent';
  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Eye className="w-3 h-3" style={{ color: pt.label.muted }} />
        <span className="text-[10px] font-semibold" style={{ color: pt.text.secondary }}>Opacite du fond</span>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange('transparent')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all duration-200"
          style={{
            background: isTransparent ? 'rgba(14,165,233,0.10)' : pt.surface.secondary,
            color: isTransparent ? '#0284c7' : pt.label.muted,
            border: `1px solid ${isTransparent ? 'rgba(14,165,233,0.25)' : pt.surface.border}`,
            boxShadow: isTransparent ? '0 2px 8px rgba(14,165,233,0.08)' : 'none',
          }}
        >
          <EyeOff className="w-3 h-3" />
          Transparent
        </button>
        <button
          onClick={() => onChange('opaque')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all duration-200"
          style={{
            background: !isTransparent ? 'rgba(22,163,106,0.10)' : pt.surface.secondary,
            color: !isTransparent ? '#16a34a' : pt.label.muted,
            border: `1px solid ${!isTransparent ? 'rgba(22,163,106,0.25)' : pt.surface.border}`,
            boxShadow: !isTransparent ? '0 2px 8px rgba(22,163,106,0.08)' : 'none',
          }}
        >
          <Eye className="w-3 h-3" />
          Opaque
        </button>
      </div>
    </div>
  );
}
