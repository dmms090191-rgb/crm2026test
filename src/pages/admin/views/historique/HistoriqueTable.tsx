import { Eye, Trash2, Archive, ArchiveRestore, CheckCheck } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { LIBELLES, type EntreeHistorique } from '../../../../lib/notificationHistory';
import { destinationDe } from './notificationDestinations';
import { etatDe, LIBELLE_ETAT, formatDate, formatHeure } from './historiqueFormat';

/**
 * Le tableau DESKTOP de l'historique des notifications.
 *
 * `hidden md:block` : sous 768 px ce composant n'existe pas a l'ecran — c'est
 * HistoriqueCards qui prend le relais. Un tableau de sept colonnes comprime n'est pas
 * une version mobile.
 *
 * Toutes les couleurs viennent des jetons de theme. Le depot compte 16 themes dont 5
 * clairs : une couleur ecrite a la main passe le build, passe le typecheck, s'affiche
 * bien sur les sombres et devient illisible sur les clairs.
 */

interface Props {
  entrees: EntreeHistorique[];
  chargement: boolean;
  onVoir: (e: EntreeHistorique) => void;
  onTraiter: (e: EntreeHistorique) => void;
  onArchiver: (e: EntreeHistorique, archiver: boolean) => void;
  onSupprimer: (e: EntreeHistorique) => void;
}

export default function HistoriqueTable({
  entrees, chargement, onVoir, onTraiter, onArchiver, onSupprimer,
}: Props) {
  const t = useThemeTokens();

  const th = 'text-left px-3 py-2.5 font-semibold whitespace-nowrap';
  const td = 'px-3 py-2.5 align-top';

  return (
    <div className="hidden md:block h-full overflow-auto rounded-xl"
      style={{ border: `1px solid ${t.surface.border}`, background: t.card.bg }}
      data-testid="historique-table">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-20">
          <tr style={{ background: t.table.headerBg, color: t.table.headerText }}>
            <th className={th} style={{ borderBottom: `1px solid ${t.table.headerBorder}` }}>Date</th>
            <th className={th} style={{ borderBottom: `1px solid ${t.table.headerBorder}` }}>Heure</th>
            <th className={th} style={{ borderBottom: `1px solid ${t.table.headerBorder}` }}>Type</th>
            <th className={th} style={{ borderBottom: `1px solid ${t.table.headerBorder}` }}>Titre</th>
            <th className={th} style={{ borderBottom: `1px solid ${t.table.headerBorder}` }}>Message</th>
            <th className={th} style={{ borderBottom: `1px solid ${t.table.headerBorder}` }}>Etat</th>
            <th className={th} style={{ borderBottom: `1px solid ${t.table.headerBorder}` }}>Source</th>
            {/*
             * La colonne Actions est EPINGLEE a droite, comme dans CRM Immo : avec sept
             * colonnes, un ecran de portable fait sortir les boutons du cadre et il faut
             * faire defiler a l'aveugle pour les retrouver.
             */}
            <th className={`${th} sticky right-0 z-10 text-right`}
              style={{
                background: `linear-gradient(${t.table.headerBg}, ${t.table.headerBg}), ${t.main.bg}`,
                borderBottom: `1px solid ${t.table.headerBorder}`,
                borderLeft: `1px solid ${t.table.headerBorder}`,
                boxShadow: `-8px 0 12px -8px ${t.table.headerBorder}`,
              }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {chargement && (
            <tr><td colSpan={8} className="px-3 py-8 text-center text-sm"
              style={{ color: t.text.tertiary }} data-testid="historique-chargement">
              Chargement de l'historique…
            </td></tr>
          )}

          {!chargement && entrees.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-10 text-center text-sm"
              style={{ color: t.text.tertiary }} data-testid="historique-vide">
              Aucune notification ne correspond a ces criteres.
            </td></tr>
          )}

          {!chargement && entrees.map(e => {
            const etat = etatDe(e);
            const nouvelle = etat === 'nouvelle';
            const dest = destinationDe(e);
            return (
              <tr key={e.id} data-testid="historique-ligne"
                style={{ borderBottom: `1px solid ${t.table.rowBorder}` }}>
                <td className={td} style={{ color: t.table.cellText, whiteSpace: 'nowrap' }}>
                  {formatDate(e.occurred_at)}
                </td>
                <td className={td} style={{ color: t.table.cellTextMuted, whiteSpace: 'nowrap' }}>
                  {formatHeure(e.occurred_at)}
                </td>
                <td className={td}>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                    style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}>
                    {LIBELLES[e.category]}
                  </span>
                </td>
                <td className={td}
                  style={{ color: t.table.cellText, fontWeight: nouvelle ? 700 : 400 }}>
                  {e.title}
                </td>
                <td className={td} style={{ color: t.table.cellTextMuted, maxWidth: 360 }}>
                  {e.message ?? '—'}
                </td>
                <td className={td}>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                    style={nouvelle
                      ? { background: t.warning.bg, color: t.warning.text, border: `1px solid ${t.warning.border}` }
                      : { background: t.surface.secondary, color: t.text.tertiary, border: `1px solid ${t.surface.border}` }}>
                    {LIBELLE_ETAT[etat]}
                  </span>
                </td>
                <td className={td} style={{ color: t.table.cellTextMuted, whiteSpace: 'nowrap' }}>
                  {e.source_type}
                </td>
                <td className={`${td} sticky right-0 z-10 text-right`}
                  style={{
                    background: `linear-gradient(${t.card.bg}, ${t.card.bg}), ${t.main.bg}`,
                    borderLeft: `1px solid ${t.table.rowBorder}`,
                    boxShadow: `-8px 0 12px -8px ${t.table.rowBorder}`,
                  }}>
                  <div className="inline-flex items-center gap-1">
                    {dest && (
                      <button type="button" onClick={() => onVoir(e)}
                        title="Voir" aria-label={`Ouvrir la donnee liee a « ${e.title} »`}
                        data-testid="historique-voir"
                        className="p-1.5 rounded-lg"
                        style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {e.treated_at === null && (
                      <button type="button" onClick={() => onTraiter(e)}
                        title="Marquer traitee" aria-label={`Marquer « ${e.title} » comme traitee`}
                        data-testid="historique-traiter"
                        className="p-1.5 rounded-lg"
                        style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => onArchiver(e, e.archived_at === null)}
                      title={e.archived_at === null ? 'Archiver' : 'Desarchiver'}
                      aria-label={e.archived_at === null
                        ? `Archiver « ${e.title} »`
                        : `Sortir « ${e.title} » des archives`}
                      data-testid="historique-archiver"
                      className="p-1.5 rounded-lg"
                      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                      {e.archived_at === null
                        ? <Archive className="w-3.5 h-3.5" />
                        : <ArchiveRestore className="w-3.5 h-3.5" />}
                    </button>
                    <button type="button" onClick={() => onSupprimer(e)}
                      title="Supprimer" aria-label={`Supprimer « ${e.title} » de l'historique`}
                      data-testid="historique-supprimer"
                      className="p-1.5 rounded-lg"
                      style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
