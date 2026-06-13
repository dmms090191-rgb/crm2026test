import { Paintbrush, LayoutGrid as Layout, X } from 'lucide-react';
import { useVisualCustomize } from '../../components/visualCustomize/VisualCustomizeContext';

interface Props {
  onSelectOnglet: () => void;
  onSelectZoneDroite: () => void;
  onClose: () => void;
}

export default function EditorChoiceButtons({ onSelectOnglet, onSelectZoneDroite, onClose }: Props) {
  const vc = useVisualCustomize();

  const handleZoneDroite = () => {
    vc.setEnabled(true);
    onSelectZoneDroite();
  };

  return (
    <div
      className="flex-shrink-0 flex items-center justify-center gap-3 px-4 py-3"
      style={{
        background: 'rgba(10,12,20,0.88)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <button
        type="button"
        onClick={onSelectOnglet}
        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold transition-all duration-200 hover:scale-[1.03]"
        style={{
          background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
          color: '#fff',
          boxShadow: '0 4px 16px rgba(14,165,233,0.35)',
        }}
      >
        <Paintbrush className="w-4 h-4" />
        Personnaliser onglet
      </button>

      <button
        type="button"
        onClick={handleZoneDroite}
        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold transition-all duration-200 hover:scale-[1.03]"
        style={{
          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          color: '#fff',
          boxShadow: '0 4px 16px rgba(6,182,212,0.35)',
        }}
      >
        <Layout className="w-4 h-4" />
        Personnaliser zone droite
      </button>

      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 hover:scale-[1.03]"
        style={{
          background: 'rgba(239,68,68,0.15)',
          color: '#f87171',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        <X className="w-3.5 h-3.5" />
        Quitter
      </button>
    </div>
  );
}
