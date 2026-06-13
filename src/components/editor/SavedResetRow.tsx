import { RotateCcw } from 'lucide-react';
import type { EditorPanelTokens } from './editorPanelTheme';

interface Props {
  label: string;
  count: number;
  confirmActive: boolean;
  confirmMessage: string;
  onAskReset: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  pt: EditorPanelTokens;
}

export default function SavedResetRow({ label, count, confirmActive, confirmMessage, onAskReset, onConfirm, onCancel, pt }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-[10px] font-semibold flex-1" style={{ color: pt.text.secondary }}>
          {label}
        </span>
        <span className="text-[9px] font-mono tabular-nums" style={{ color: pt.label.muted }}>
          {count}
        </span>
        <button
          onClick={onAskReset}
          disabled={count === 0}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-all duration-150 hover:scale-[1.03] disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
          style={{
            background: count > 0 ? pt.danger.bg : 'transparent',
            color: pt.danger.text,
            border: `1px solid ${count > 0 ? pt.danger.border : 'transparent'}`,
          }}
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Reinitialiser
        </button>
      </div>
      {confirmActive && (
        <div
          className="px-3 pb-2.5 pt-1 flex flex-col gap-2"
          style={{ borderTop: `1px solid ${pt.surface.border}` }}
        >
          <p className="text-[10px] font-medium" style={{ color: pt.text.secondary }}>
            {confirmMessage}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={onCancel}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-150"
              style={{
                background: pt.surface.secondary,
                color: pt.text.secondary,
                border: `1px solid ${pt.surface.border}`,
              }}
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-150 hover:scale-[1.02]"
              style={{
                background: pt.danger.bg,
                color: pt.danger.text,
                border: `1px solid ${pt.danger.border}`,
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
