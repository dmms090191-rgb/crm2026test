import { Search, X, ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import {
  CATEGORIES, LIBELLES,
  type CategorieHistorique, type Compteurs, type Criteres, type FiltreEtat,
} from '../../../../lib/notificationHistory';

/**
 * Recherche, etat, categories et sens du tri pour l'historique des notifications.
 *
 * Purement presentatif : les valeurs et leurs setters viennent de la page. Le meme
 * composant sert au-dessus du tableau desktop et de la liste mobile, sans duplication.
 */

const ETATS: { valeur: FiltreEtat; libelle: string }[] = [
  { valeur: 'tous', libelle: 'Toutes' },
  { valeur: 'non-lues', libelle: 'Non lues' },
  { valeur: 'lues', libelle: 'Lues' },
  { valeur: 'archivees', libelle: 'Archivees' },
];

interface Props {
  criteres: Criteres;
  onCriteres: (c: Criteres) => void;
  compteurs: Compteurs;
  affiches: number;
}

export default function HistoriqueFilters({ criteres, onCriteres, compteurs, affiches }: Props) {
  const t = useThemeTokens();

  const basculerCategorie = (c: CategorieHistorique) => {
    const dedans = criteres.categories.includes(c);
    onCriteres({
      ...criteres,
      categories: dedans ? criteres.categories.filter(x => x !== c) : [...criteres.categories, c],
    });
  };

  const nombreEtat = (e: FiltreEtat) =>
    e === 'tous' ? compteurs.total - compteurs.archivees
    : e === 'non-lues' ? compteurs.nouvelles
    : e === 'lues' ? compteurs.lues
    : compteurs.archivees;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: t.input.placeholder }} />
          <input
            type="search"
            value={criteres.terme}
            onChange={e => onCriteres({ ...criteres, terme: e.target.value })}
            placeholder="Rechercher dans les notifications…"
            data-testid="historique-recherche"
            /* max-md:text-base : 16 px sous 768 px. En dessous de ce seuil, iOS Safari
               agrandit la page des qu on touche le champ — elle deborde alors a droite,
               au moment meme ou le clavier monte. */
            className="w-full pl-9 pr-9 py-2 rounded-lg text-sm max-md:text-base outline-none"
            style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }}
          />
          {criteres.terme !== '' && (
            <button type="button" onClick={() => onCriteres({ ...criteres, terme: '' })}
              title="Effacer" aria-label="Effacer la recherche"
              data-testid="historique-recherche-effacer"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
              style={{ color: t.label.muted }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button type="button"
          onClick={() => onCriteres({ ...criteres, tri: criteres.tri === 'recentes' ? 'anciennes' : 'recentes' })}
          data-testid="historique-tri"
          aria-label={criteres.tri === 'recentes'
            ? 'Trier des plus anciennes aux plus recentes'
            : 'Trier des plus recentes aux plus anciennes'}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
          {criteres.tri === 'recentes'
            ? <ArrowDownWideNarrow className="w-4 h-4" />
            : <ArrowUpWideNarrow className="w-4 h-4" />}
          {criteres.tri === 'recentes' ? 'Plus recentes' : 'Plus anciennes'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {ETATS.map(e => {
          const actif = criteres.etat === e.valeur;
          return (
            <button key={e.valeur} type="button" onClick={() => onCriteres({ ...criteres, etat: e.valeur })}
              data-testid={`historique-etat-${e.valeur}`}
              className="px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
              style={actif
                ? { background: t.accent.solid, color: t.text.inverse, border: `1px solid ${t.accent.solid}` }
                : { background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}>
              {e.libelle} ({nombreEtat(e.valeur)})
            </button>
          );
        })}
        <span className="text-xs ml-auto" style={{ color: t.label.hint }} data-testid="historique-compte">
          {affiches === compteurs.total
            ? `${compteurs.total} notification${compteurs.total > 1 ? 's' : ''}`
            : `${affiches} sur ${compteurs.total}`}
        </span>
      </div>

      {/* Les categories ne se montrent que si elles existent vraiment dans l historique :
          proposer un filtre qui ne rendra jamais rien est une fausse piste. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CATEGORIES.filter(c => (compteurs.parCategorie[c] ?? 0) > 0).map(c => {
          const actif = criteres.categories.includes(c);
          return (
            <button key={c} type="button" onClick={() => basculerCategorie(c)}
              data-testid={`historique-categorie-${c}`}
              aria-pressed={actif}
              className="px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
              style={actif
                ? { background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }
                : { background: t.surface.secondary, color: t.text.tertiary, border: `1px solid ${t.surface.border}` }}>
              {LIBELLES[c]} ({compteurs.parCategorie[c]})
            </button>
          );
        })}
        {criteres.categories.length > 0 && (
          <button type="button" onClick={() => onCriteres({ ...criteres, categories: [] })}
            data-testid="historique-categories-effacer"
            aria-label="Afficher toutes les categories"
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'transparent', color: t.text.link, border: `1px solid ${t.surface.border}` }}>
            Toutes les categories
          </button>
        )}
      </div>
    </div>
  );
}
