import { Layers, ChevronDown, Search, X } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';

interface Props {
  ongletNom: string;
  principal: boolean;
  onOuvrir: () => void;
  recherche: string;
  onRecherche: (v: string) => void;
  /** Resultats de la recherche globale, ou null hors recherche. */
  resultats: number | null;
}

/*
 * LE CHOIX DE L'ONGLET ET LA RECHERCHE GLOBALE, au-dessus du tableau ET des cartes.
 *
 * Un seul montage pour les deux presentations (comme le selecteur de format) : l'onglet et
 * la recherche ne peuvent donc pas diverger entre le bureau et le telephone.
 *
 * La recherche porte sur TOUS les leads, quel que soit l'onglet : on cherche quelqu'un, pas
 * une ligne d'un onglet. Pendant qu'elle est active, la liste montre a quel(s) onglet(s)
 * appartient chaque resultat.
 */
export default function BarreOnglet({ ongletNom, principal, onOuvrir, recherche, onRecherche, resultats }: Props) {
  const t = useThemeTokens();
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <button
        type="button"
        onClick={onOuvrir}
        aria-haspopup="dialog"
        className="flex items-center gap-2 h-11 px-3.5 rounded-xl text-[13px] font-semibold min-w-0 sm:max-w-[45%]"
        style={{
          background: principal ? t.surface.secondary : t.accent.bg,
          border: `1px solid ${principal ? t.surface.border : t.accent.border}`,
          color: principal ? t.text.secondary : t.accent.text,
        }}
        title="Choisir un onglet de colonnes"
      >
        <Layers className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">Onglet : {ongletNom}</span>
        <ChevronDown className="w-4 h-4 flex-shrink-0 ml-auto" />
      </button>
      <div className="relative flex-1 min-w-0">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: t.table.cellIcon }} />
        <input
          type="search"
          value={recherche}
          onChange={e => onRecherche(e.target.value)}
          placeholder="Rechercher dans tous les leads : nom, prénom, entreprise, email, téléphone"
          aria-label="Rechercher dans tous les leads"
          className="w-full h-11 pl-10 pr-10 rounded-xl text-[13px] focus:outline-none"
          style={{ background: recherche ? t.accent.bg : t.surface.secondary, border: `1px solid ${recherche ? t.accent.border : t.surface.border}`, color: t.input.text, caretColor: t.input.text }}
        />
        {recherche && (
          <button type="button" onClick={() => onRecherche('')} aria-label="Effacer la recherche"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: t.text.tertiary }}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {resultats !== null && (
        <p className="text-[11px] sm:hidden" role="status" style={{ color: t.text.tertiary }}>
          {resultats} résultat{resultats > 1 ? 's' : ''} dans tous les leads
        </p>
      )}
    </div>
  );
}
