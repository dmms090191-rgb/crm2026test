import { Eye, Trash2, Archive, ArchiveRestore, CheckCheck } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { LIBELLES, type EntreeHistorique } from '../../../../lib/notificationHistory';
import { destinationDe } from './notificationDestinations';
import { etatDe, LIBELLE_ETAT, formatDateHeure } from './historiqueFormat';

/**
 * La liste MOBILE de l'historique des notifications.
 *
 * `md:hidden` : au-dessus de 768 px ce composant n'existe pas a l'ecran, c'est
 * HistoriqueTable qui prend le relais.
 *
 * Une carte montre tout ce que le tableau montre, mais empile : la date et l'heure sur
 * une ligne, le type et l'etat sur une autre, puis le titre et le message. Les quatre
 * boutons font 44 px de cote minimum — `max-md:p-[15px]` sur une icone de 14 px — parce
 * qu'en dessous le doigt rate la cible, et qu'ils sont ici cote a cote.
 */

interface Props {
  entrees: EntreeHistorique[];
  chargement: boolean;
  onVoir: (e: EntreeHistorique) => void;
  onTraiter: (e: EntreeHistorique) => void;
  onArchiver: (e: EntreeHistorique, archiver: boolean) => void;
  onSupprimer: (e: EntreeHistorique) => void;
}

export default function HistoriqueCards({
  entrees, chargement, onVoir, onTraiter, onArchiver, onSupprimer,
}: Props) {
  const t = useThemeTokens();
  const bouton = 'rounded-lg p-1.5 max-md:p-[15px] inline-flex items-center justify-center shrink-0';

  if (chargement) {
    return (
      <p className="md:hidden px-3 py-8 text-center text-sm" style={{ color: t.text.tertiary }}
        data-testid="historique-cards-chargement">
        Chargement de l'historique…
      </p>
    );
  }

  if (entrees.length === 0) {
    return (
      <p className="md:hidden px-3 py-10 text-center text-sm" style={{ color: t.text.tertiary }}
        data-testid="historique-cards-vide">
        Aucune notification ne correspond a ces criteres.
      </p>
    );
  }

  return (
    <div className="md:hidden flex flex-col gap-3" data-testid="historique-cards">
      {entrees.map(e => {
        const etat = etatDe(e);
        const nouvelle = etat === 'nouvelle';
        const dest = destinationDe(e);
        return (
          <article key={e.id} data-testid="historique-carte"
            className="rounded-xl p-3 flex flex-col gap-2"
            style={{ background: t.card.bg, border: `1px solid ${t.surface.border}` }}>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs" style={{ color: t.label.hint }}>
                {formatDateHeure(e.occurred_at)}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                style={nouvelle
                  ? { background: t.warning.bg, color: t.warning.text, border: `1px solid ${t.warning.border}` }
                  : { background: t.surface.secondary, color: t.text.tertiary, border: `1px solid ${t.surface.border}` }}>
                {LIBELLE_ETAT[etat]}
              </span>
            </div>

            <span className="self-start px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}>
              {LIBELLES[e.category]}
            </span>

            {/* `break-words` : un email ou un nom tres long deborderait a droite, et la
                page entiere se mettrait a defiler lateralement a 375 px. */}
            <p className="text-sm break-words"
              style={{ color: t.text.primary, fontWeight: nouvelle ? 700 : 400 }}>
              {e.title}
            </p>
            {e.message && (
              <p className="text-xs break-words" style={{ color: t.text.tertiary }}>{e.message}</p>
            )}

            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              {dest && (
                <button type="button" onClick={() => onVoir(e)}
                  aria-label={`Ouvrir la donnee liee a « ${e.title} »`}
                  data-testid="historique-carte-voir" className={bouton}
                  style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
              {e.treated_at === null && (
                <button type="button" onClick={() => onTraiter(e)}
                  aria-label={`Marquer « ${e.title} » comme traitee`}
                  data-testid="historique-carte-traiter" className={bouton}
                  style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button type="button" onClick={() => onArchiver(e, e.archived_at === null)}
                aria-label={e.archived_at === null
                  ? `Archiver « ${e.title} »`
                  : `Sortir « ${e.title} » des archives`}
                data-testid="historique-carte-archiver" className={bouton}
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                {e.archived_at === null
                  ? <Archive className="w-3.5 h-3.5" />
                  : <ArchiveRestore className="w-3.5 h-3.5" />}
              </button>
              <button type="button" onClick={() => onSupprimer(e)}
                aria-label={`Supprimer « ${e.title} » de l'historique`}
                data-testid="historique-carte-supprimer" className={bouton}
                style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
