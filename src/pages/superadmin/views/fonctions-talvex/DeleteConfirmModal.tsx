import { AlertTriangle, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteConfirmModal({ isOpen, title, message, onConfirm, onClose }: Props) {
  const t = useThemeTokens();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl"
        style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>{title}</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: t.text.tertiary }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs leading-relaxed" style={{ color: t.text.secondary }}>{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-xs font-medium" style={{ color: t.text.secondary }}>Annuler</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: '#ef4444' }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
