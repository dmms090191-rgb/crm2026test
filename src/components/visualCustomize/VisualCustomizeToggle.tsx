import { X } from 'lucide-react';
import { useVisualCustomize } from './VisualCustomizeContext';

interface Props {
  visible?: boolean;
}

export default function VisualCustomizeToggle({ visible }: Props) {
  const { enabled, setEnabled, setActiveSelection, setQuickApply, clearAllDrafts } = useVisualCustomize();

  if (!visible || !enabled) return null;

  const handleClick = () => {
    setActiveSelection(null);
    setQuickApply({ active: false, presetConfig: null, presetModalKind: null, presetName: '' });
    clearAllDrafts();
    setEnabled(false);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9997,
    }}>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 rounded-full px-4 py-2.5 transition-all duration-300 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
          boxShadow: '0 10px 32px rgba(239,68,68,0.45), 0 0 0 4px rgba(239,68,68,0.18)',
          color: '#fff',
        }}
        title="Quitter le mode personnalisation"
      >
        <X className="w-4 h-4" />
        <span className="text-[11px] font-bold tracking-wide">Terminer</span>
      </button>
    </div>
  );
}
