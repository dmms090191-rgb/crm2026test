import { MousePointerClick, Image as ImageIcon } from 'lucide-react';
import type { EditorPanelTokens } from './editorPanelTheme';

export function TextModeEmptyState({ pt }: { pt: EditorPanelTokens }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-4 text-center">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
      >
        <MousePointerClick className="w-5 h-5" style={{ color: pt.label.muted }} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold" style={{ color: pt.text.secondary }}>
          Aucune cible selectionnee
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: pt.label.muted }}>
          Selectionne d'abord "Colorer toutes les categories" ou "Colorer tous les onglets" dans le panneau Contenu.
        </p>
      </div>
    </div>
  );
}

export function Zone4ImageInfoBanner({ pt }: { pt: EditorPanelTokens }) {
  return (
    <div
      className="flex items-center gap-2 mx-3 mt-2.5 mb-0.5 px-3 py-2 rounded-xl"
      style={{
        background: 'rgba(14,165,233,0.08)',
        border: '1px solid rgba(14,165,233,0.18)',
      }}
    >
      <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#0ea5e9' }} />
      <p className="text-[10px] leading-relaxed" style={{ color: '#0ea5e9' }}>
        L'image reste active. La couleur s'applique derriere l'image.
      </p>
    </div>
  );
}

export function ImageModeNotice({ pt }: { pt: EditorPanelTokens }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-4 text-center">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
      >
        <ImageIcon className="w-5 h-5" style={{ color: pt.label.muted }} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold" style={{ color: pt.text.secondary }}>
          Mode Image actif
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: pt.label.muted }}>
          L'onglet Image utilise une image, pas une couleur. Passe a l'onglet Fonds pour modifier les couleurs des zones.
        </p>
      </div>
    </div>
  );
}

export function ButtonModeEmptyState({ pt }: { pt: EditorPanelTokens }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-4 text-center">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
      >
        <MousePointerClick className="w-5 h-5" style={{ color: pt.label.muted }} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold" style={{ color: pt.text.secondary }}>
          Aucun bouton selectionne
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: pt.label.muted }}>
          Selectionne un bouton dans le panneau Contenu pour modifier son fond ou son texte.
        </p>
      </div>
    </div>
  );
}
