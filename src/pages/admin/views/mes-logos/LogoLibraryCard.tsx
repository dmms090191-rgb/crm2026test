import { Download, Trash2, Palette } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { LogoLibraryItem } from './mesLogosTypes';

interface Props {
  item: LogoLibraryItem;
  logoUrl: string;
  onEditBg: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

const CHECKER_CSS = `repeating-conic-gradient(#d1d5db 0% 25%, #f3f4f6 0% 50%) 0 0 / 16px 16px`;

function buildBg(item: LogoLibraryItem): string {
  if (item.bg_mode === 'checker') return CHECKER_CSS;
  if (item.bg_mode === 'gradient') return `linear-gradient(135deg, ${item.bg_color1}, ${item.bg_color2})`;
  return item.bg_color1;
}

export default function LogoLibraryCard({ item, logoUrl, onEditBg, onDownload, onDelete }: Props) {
  const t = useThemeTokens();
  const dateStr = new Date(item.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div
      className="group rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
      style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
    >
      <div
        className="relative w-full aspect-square flex items-center justify-center overflow-hidden"
        style={{ background: buildBg(item) }}
      >
        <img
          src={logoUrl}
          alt={item.name || 'Logo'}
          className="max-h-[75%] max-w-[80%] object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold truncate" style={{ color: t.card.title }}>
            {item.name || 'Sans nom'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: t.card.subtitle }}>
            {dateStr}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEditBg}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 hover:opacity-80"
            style={{ background: t.button.primaryBg + '18', color: t.button.primaryBg, border: `1px solid ${t.button.primaryBg}30` }}
            title="Modifier l'arrière-plan"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fond</span>
          </button>
          <button
            onClick={onDownload}
            className="flex items-center justify-center p-2 rounded-xl transition-all duration-200 hover:opacity-80"
            style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
            title="Télécharger"
          >
            <Download className="w-3.5 h-3.5" style={{ color: t.card.subtitle }} />
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center p-2 rounded-xl transition-all duration-200 hover:opacity-80"
            style={{ background: '#fee2e220', border: '1px solid #fca5a530' }}
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
