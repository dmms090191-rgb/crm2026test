import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { FiltreDossiers } from '../../../../lib/crmImmoRecherche';
import { CATEGORIES_IMMO, type CategorieImmo } from '../../../../lib/crmImmoEcheancier';

/**
 * Recherche et filtres du tableau CRM Immo.
 *
 * Composant purement presentatif : il recoit les valeurs et leurs setters, l'etat reste
 * dans la vue. Ca le rend utilisable a l'identique au-dessus du tableau desktop et de la
 * liste mobile, sans dupliquer la logique.
 */

/*
 * HUIT FILTRES : « Tous », plus les sept categories du tableau de bord.
 *
 * David, le 22 octobre 2026 : « Je ne veux pas qu'une carte ouvre simplement Tous si un
 * filtre precis peut etre applique. » Chaque carte du dashboard a donc son filtre ici,
 * et le libelle du bouton est celui de la carte, mot pour mot.
 *
 * ---------- LE VOCABULAIRE N'EST PAS RECOPIE ----------
 *
 * Les cles viennent de CategorieImmo. Le typage de LIBELLES en Record<CategorieImmo, …>
 * fait que le compilateur reclame un libelle des qu'une categorie est ajoutee au
 * calcul : il devient impossible d'avoir une carte sans son filtre.
 *
 * ---------- CE QUI A DISPARU ----------
 *
 * « Fin proche » n'existe plus. Il recouvrait exactement deux des nouveaux filtres
 * (« Contrats a renouveler » et « Baux expires ») sans distinguer l'un de l'autre, et
 * refaisait son propre calcul de preavis avec l'horloge de la page — gelee au montage.
 * Mesure du 22 octobre : la carte « Contrats a renouveler » affichait 0 et ce filtre
 * ouvrait une liste d'UNE ligne. Rien n'est perdu cote donnees : un filtre est un etat
 * d'ecran, jamais enregistre.
 *
 * (« Avec loyer » et « Sans échéance » avaient ete retires le meme jour, plus tot.)
 */
const LIBELLES: Record<CategorieImmo, string> = {
  'loyers-en-retard': 'Loyers en retard',
  'loyers-a-encaisser': 'Loyers à encaisser',
  'encaisses-ce-mois': 'Encaissés ce mois',
  'contrats-a-renouveler': 'Contrats à renouveler',
  'baux-expires': 'Baux expirés',
  'dossiers-en-cours': 'Dossiers en cours',
  'baux-a-venir': 'Baux à venir',
};

const FILTRES: { valeur: FiltreDossiers; libelle: string }[] = [
  { valeur: 'tous', libelle: 'Tous' },
  ...CATEGORIES_IMMO.map(c => ({ valeur: c as FiltreDossiers, libelle: LIBELLES[c] })),
];

/* Les trois categories ou le compteur de la carte et le nombre de lignes n'ont PAS la
   meme unite : la carte compte des echeances, la liste montre des dossiers. */
const CATEGORIES_EN_ECHEANCES = new Set<string>([
  'loyers-en-retard', 'loyers-a-encaisser', 'encaisses-ce-mois',
]);

interface Props {
  terme: string;
  onTerme: (v: string) => void;
  filtre: FiltreDossiers;
  onFiltre: (v: FiltreDossiers) => void;
  total: number;
  affiches: number;
  onOuvrirColonnes: () => void;
  /** Le compteur de la carte correspondante, quand le filtre actif en a un. */
  compteurCategorie?: number | null;
}

export default function CrmImmoFilters({
  terme, onTerme, filtre, onFiltre, total, affiches, onOuvrirColonnes,
  compteurCategorie = null,
}: Props) {
  const t = useThemeTokens();

  /*
   * L'ECART ENTRE LA CARTE ET LA LISTE, DIT A VOIX HAUTE.
   *
   * Neuf loyers en retard peuvent n'appartenir qu'a un seul dossier. La carte affiche
   * 9, la liste montre 1 ligne, et sans explication l'utilisateur lit un bug. On
   * affiche donc les deux nombres, et seulement quand ils different.
   */
  const ecartUnite =
    filtre !== 'tous' && CATEGORIES_EN_ECHEANCES.has(filtre) &&
    compteurCategorie !== null && compteurCategorie !== affiches
      ? `${compteurCategorie} ${compteurCategorie > 1 ? 'échéances' : 'échéance'} sur ${affiches} dossier${affiches > 1 ? 's' : ''}`
      : null;

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

      {/*
        * HUIT PILULES SUR UNE SEULE RANGEE QUI DEFILE.
        *
        * En `flex-wrap`, huit libelles longs font trois a quatre rangees a 375 px : la
        * liste est repoussee hors de l'ecran avant d'avoir commence. Une rangee qui
        * defile horizontalement garde la hauteur constante et laisse voir qu'il y a
        * autre chose a droite.
        *
        * `overflow-x-auto` est borne a CE conteneur : il ne cree aucun debordement de
        * page — la mesure par element le verifie, `scrollWidth` du document etant
        * aveugle sous `overflow-x: hidden`.
        *
        * `min-h-[44px]` sous 768 px : les pilules faisaient 26 px de haut, sous le
        * minimum tactile que scripts/crm-immo/cibleTactile.test.ts impose deja aux
        * douze autres cibles du module. Passer de deux a huit boutons rendait ce defaut
        * huit fois plus present.
        */}
      <div className="flex items-stretch gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
        {FILTRES.map(f => {
          const actif = filtre === f.valeur;
          return (
            <button key={f.valeur} type="button" onClick={() => onFiltre(f.valeur)}
              data-testid={`crm-immo-filtre-${f.valeur}`}
              aria-pressed={actif}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 max-md:min-h-[44px] max-md:px-4"
              style={actif
                ? { background: t.accent.solid, color: t.text.inverse, border: `1px solid ${t.accent.solid}` }
                : { background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}>
              {f.libelle}
            </button>
          );
        })}
      </div>

      {/* Le compte, SOUS la rangee et non dedans : en `ml-auto` dans un conteneur qui
          defile, il partait a droite du dernier bouton, donc hors de l'ecran. */}
      <div className="flex items-center justify-between gap-2 text-xs" style={{ color: t.label.hint }}>
        <span data-testid="crm-immo-compte">
          {affiches === total ? `${total} dossier${total > 1 ? 's' : ''}` : `${affiches} sur ${total}`}
        </span>
        {ecartUnite && (
          <span data-testid="crm-immo-ecart-unite" className="text-right">{ecartUnite}</span>
        )}
      </div>
    </div>
  );
}
