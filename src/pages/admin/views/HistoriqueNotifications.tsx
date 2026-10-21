import { useMemo, useState } from 'react';
import { History, AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import {
  appliquerCriteres, compter, CRITERES_PAR_DEFAUT,
  type Criteres, type EntreeHistorique,
} from '../../../lib/notificationHistory';
import { destinationDe, type Destination } from './historique/notificationDestinations';
import HistoriqueFilters from './historique/HistoriqueFilters';
import HistoriqueTable from './historique/HistoriqueTable';
import HistoriqueCards from './historique/HistoriqueCards';
/*
 * Importe depuis crm-immo plutot que recopie : son commentaire explique qu'il a ete
 * garde dans son module pour ne pas unifier de force les facons de fermer une modale du
 * depot. Le reutiliser ici ne touche aucun autre ecran, alors qu'une cinquieme copie
 * garantirait qu'une des copies divergera.
 */
import { useFermetureModale } from './crm-immo/useFermetureModale';

/**
 * HISTORIQUE NOTIFICATIONS — la page.
 *
 * ---------- CE QUE CETTE PAGE N'EST PAS ----------
 *
 * Ce n'est pas la cloche. La cloche montre le NEUF : ce qui n'a pas encore ete vu, et
 * son compteur ne compte que cela. Cette page montre TOUT ce qui a ete notifie, lu ou
 * non. Cliquer une notification dans la cloche la fait disparaitre de la cloche et
 * baisser le compteur ; elle reste ici.
 *
 * ---------- ET CE N'EST PAS UN PASSAGE OBLIGE ----------
 *
 * Le bouton Voir ouvre la DONNEE METIER — le dossier, le rendez-vous, la conversation —
 * pas une fiche de notification. L'historique ne s'interpose pas entre la notification
 * et sa destination : c'est la regle tranchee par David, et notificationDestinations.ts
 * la porte.
 *
 * ---------- SUPPRIMER ICI NE SUPPRIME RIEN LA-BAS ----------
 *
 * Supprimer une entree n'enleve ni dossier, ni contrat, ni rendez-vous, ni conversation,
 * ni proposition. Ce n'est pas une precaution de code : `source_id` ne porte AUCUNE cle
 * etrangere en base — il designe six tables differentes — donc il n'existe aucun chemin,
 * meme accidentel, de l'historique vers le metier.
 *
 * La suppression pose une pierre tombale : la ligne survit vide, pour que la contrainte
 * d'unicite empeche l'alimentation de la recreer au prochain chargement. Un vrai DELETE
 * la ferait revenir ; le declencheur en base le refuse d'ailleurs.
 */

interface Props {
  entrees: EntreeHistorique[];
  chargement: boolean;
  erreur: string | null;
  /** Vrai en Visu et pour le Groupe : on consulte, on n'ecrit pas. */
  lectureSeule?: boolean;
  onVoir: (d: Destination, e: EntreeHistorique) => void;
  onTraiter: (id: string) => void;
  onArchiver: (id: string, archiver: boolean) => void;
  onSupprimer: (id: string) => void;
}

export default function HistoriqueNotifications({
  entrees, chargement, erreur, lectureSeule = false,
  onVoir, onTraiter, onArchiver, onSupprimer,
}: Props) {
  const t = useThemeTokens();
  const [criteres, setCriteres] = useState<Criteres>(CRITERES_PAR_DEFAUT);
  const [aSupprimer, setASupprimer] = useState<EntreeHistorique | null>(null);

  const compteurs = useMemo(() => compter(entrees), [entrees]);
  const affichees = useMemo(() => appliquerCriteres(entrees, criteres), [entrees, criteres]);

  /*
   * `aPerdre` est vrai : la suppression est definitive. Il faut donc DEUX gestes pour
   * refermer cette modale par Echap ou par le fond — sans quoi un pouce qui effleure la
   * bande de fond, en haut d'un telephone, annulerait ou validerait au hasard.
   */
  const fermeture = useFermetureModale({
    onFermer: () => setASupprimer(null),
    aPerdre: aSupprimer !== null,
  });

  const voir = (e: EntreeHistorique) => {
    const d = destinationDe(e);
    /* Le clic VAUT lecture : c'est la regle de la cloche, et elle vaut aussi ici. */
    if (d) onVoir(d, e);
  };

  return (
    <div className="flex flex-col gap-3 h-full min-h-0" data-testid="historique-notifications">
      <div className="flex items-center gap-2 flex-wrap">
        <History className="w-5 h-5 shrink-0" style={{ color: t.accent.text }} />
        <h2 className="text-base font-bold" style={{ color: t.heading.primary }}>
          Historique Notifications
        </h2>
        {compteurs.nouvelles > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: t.warning.bg, color: t.warning.text, border: `1px solid ${t.warning.border}` }}
            data-testid="historique-compteur-nouvelles">
            {compteurs.nouvelles} nouvelle{compteurs.nouvelles > 1 ? 's' : ''}
          </span>
        )}
        {lectureSeule && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: t.surface.secondary, color: t.text.tertiary, border: `1px solid ${t.surface.border}` }}
            data-testid="historique-lecture-seule">
            Consultation seule
          </span>
        )}
      </div>

      <HistoriqueFilters
        criteres={criteres} onCriteres={setCriteres}
        compteurs={compteurs} affiches={affichees.length}
      />

      {erreur !== null && (
        <p className="text-xs px-3 py-2 rounded-lg" data-testid="historique-erreur"
          style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
          {erreur}
        </p>
      )}

      <div className="flex-1 min-h-0">
        <HistoriqueTable
          entrees={affichees} chargement={chargement}
          onVoir={voir}
          onTraiter={e => onTraiter(e.id)}
          onArchiver={(e, a) => onArchiver(e.id, a)}
          onSupprimer={e => setASupprimer(e)}
        />
        <HistoriqueCards
          entrees={affichees} chargement={chargement}
          onVoir={voir}
          onTraiter={e => onTraiter(e.id)}
          onArchiver={(e, a) => onArchiver(e.id, a)}
          onSupprimer={e => setASupprimer(e)}
        />
      </div>

      {aSupprimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: t.surface.overlay }}
          data-testid="historique-supprimer-modal"
          {...fermeture.proprietesDuFond}>
          {/* `max-h-[90dvh]` et non `vh` : `vh` ne rapetisse pas quand le clavier mobile
              monte, et la modale se retrouve coupee. */}
          <div className="w-full max-w-md rounded-2xl p-4 flex flex-col gap-3 max-h-[90dvh] overflow-auto"
            style={{ background: t.card.bg, border: `1px solid ${t.surface.border}` }}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: t.danger.text }} />
              <div className="min-w-0">
                <h3 className="text-sm font-bold" style={{ color: t.heading.primary }}>
                  Supprimer cette notification de l'historique ?
                </h3>
                <p className="text-xs mt-1 break-words" style={{ color: t.text.tertiary }}>
                  {aSupprimer.title}
                </p>
              </div>
            </div>

            <p className="text-xs" style={{ color: t.text.tertiary }}>
              La suppression est definitive : le contenu de cette notification est efface et
              elle ne reviendra pas. Rien d'autre n'est touche — ni le dossier, ni le
              contrat, ni le rendez-vous, ni la conversation d'ou elle venait.
            </p>

            {fermeture.confirmationDemandee && (
              <p className="text-xs px-2.5 py-1.5 rounded-lg"
                style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}`, color: t.warning.text }}
                data-testid="historique-supprimer-rearme">
                Refaites le meme geste pour fermer sans supprimer.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 flex-wrap">
              <button type="button" onClick={() => setASupprimer(null)}
                data-testid="historique-supprimer-annuler"
                aria-label="Annuler la suppression"
                className="px-3 py-2 max-md:px-4 max-md:py-3 rounded-lg text-sm font-semibold"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                Annuler
              </button>
              <button type="button"
                onClick={() => { onSupprimer(aSupprimer.id); setASupprimer(null); }}
                data-testid="historique-supprimer-confirmer"
                aria-label={`Supprimer definitivement « ${aSupprimer.title} » de l'historique`}
                className="px-3 py-2 max-md:px-4 max-md:py-3 rounded-lg text-sm font-semibold"
                style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
