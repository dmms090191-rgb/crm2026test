import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { FiltreDossiers } from '../../../../lib/crmImmoRecherche';

/**
 * Recherche et filtres du tableau CRM Immo.
 *
 * Composant purement presentatif : il recoit les valeurs et leurs setters, l'etat reste
 * dans la vue. Ca le rend utilisable a l'identique au-dessus du tableau desktop et de la
 * liste mobile, sans dupliquer la logique.
 */

const FILTRES: { valeur: FiltreDossiers; libelle: string }[] = [
  { valeur: 'tous', libelle: 'Tous' },
  { valeur: 'fin-proche', libelle: 'Fin proche' },
  { valeur: 'avec-loyer', libelle: 'Avec loyer' },
  { valeur: 'sans-echeance', libelle: 'Sans échéance' },
];

interface Props {
  terme: string;
  onTerme: (v: string) => void;
  filtre: FiltreDossiers;
  onFiltre: (v: FiltreDossiers) => void;
  total: number;
  affiches: number;
  onOuvrirColonnes: () => void;
}

export default function CrmImmoFilters({
  terme, onTerme, filtre, onFiltre, total, affiches, onOuvrirColonnes,
}: Props) {
  const t = useThemeTokens();

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: t.input.placeholder }} />
          <input
            type="search"
            value={terme}
            onChange={e => onTerme(e.target.value)}
            placeholder="Rechercher un locataire, un propriétaire, un email…"
            data-testid="crm-immo-recherche"
            /* max-md:text-base : 16 px sous 768 px, le seuil en dessous duquel iOS Safari
               agrandit la page des qu on touche le champ — elle deborde alors a droite,
               precisement au moment ou le clavier monte.
               La regle avait ete appliquee aux huit fichiers de MODALE le 20 octobre ;
               ce champ-ci y avait echappe, parce qu il appartient a la PAGE et que la
               garde ne couvrait que les modales. */
            className="w-full pl-9 pr-9 py-2 rounded-lg text-sm max-md:text-base outline-none"
            style={{
              background: t.input.bg, border: `1px solid ${t.input.border}`,
              color: t.input.text,
            }}
          />
          {terme !== '' && (
            <button type="button" onClick={() => onTerme('')} title="Effacer"
              aria-label="Effacer la recherche"
              data-testid="crm-immo-recherche-effacer"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
              style={{ color: t.label.muted }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button type="button" onClick={onOuvrirColonnes}
          data-testid="crm-immo-ouvrir-colonnes"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0"
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
          <SlidersHorizontal className="w-4 h-4" />
          Colonnes
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTRES.map(f => {
          const actif = filtre === f.valeur;
          return (
            <button key={f.valeur} type="button" onClick={() => onFiltre(f.valeur)}
              data-testid={`crm-immo-filtre-${f.valeur}`}
              className="px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
              style={actif
                ? { background: t.accent.solid, color: t.text.inverse, border: `1px solid ${t.accent.solid}` }
                : { background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}>
              {f.libelle}
            </button>
          );
        })}
        <span className="text-xs ml-auto" style={{ color: t.label.hint }} data-testid="crm-immo-compte">
          {affiches === total ? `${total} dossier${total > 1 ? 's' : ''}` : `${affiches} sur ${total}`}
        </span>
      </div>
    </div>
  );
}
