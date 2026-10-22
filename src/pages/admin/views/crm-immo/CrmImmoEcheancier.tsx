import { useState } from 'react';
import { CheckCircle2, Undo2, CalendarClock, RefreshCw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { enDateFrancaise } from '../../../../lib/crmImmoAlertes';
import { LIBELLE_STATUT, rangDuLoyer, type StatutLoyer } from '../../../../lib/crmImmoEcheancier';
import type { LigneEcheancier, PeriodeDossier, EncaissementDossier } from './useCrmImmoEcheancier';

/**
 * L'ONGLET ECHEANCIER LOYERS.
 *
 * ---------- IL NE CALCULE RIEN ----------
 *
 * Les echeances, leur numero, leur total, leur statut et le loyer actuel arrivent tout
 * calcules par `crmImmoEcheancier` — la meme fonction que lisent les notifications. Ce
 * composant dessine, et c'est tout. C'est ce qui garantit qu'un << 4e loyer sur 12 >> ne
 * puisse pas dire une chose ici et une autre dans la cloche.
 *
 * ---------- LE SURLIGNAGE ET LE STATUT SONT DEUX CHOSES ----------
 *
 * Le surlignage dit QUEL loyer — celui du mois en cours. Le statut dit OU IL EN EST. Un
 * loyer peut donc etre surligne ET << A venir >> : nous sommes le 5, il tombe le 20. Les
 * deux informations sont justes, et differentes.
 *
 * Et s'il n'existe aucune echeance dans le mois courant — bail pas commence, bail
 * termine, mois sans echeance — RIEN n'est surligne. Surligner la prochaine ou la
 * precedente a la place fabriquerait un loyer actuel qui n'en est pas un.
 */

interface Props {
  echeancier: LigneEcheancier[];
  periodeAffichee: PeriodeDossier | null;
  periodeActive: PeriodeDossier | null;
  historique: PeriodeDossier[];
  encaissements: EncaissementDossier[];
  compteurs: Record<StatutLoyer, number>;
  chargement: boolean;
  enCours: boolean;
  lectureSeule?: boolean;
  onEncaisser: (echeance: string) => void;
  onAnnuler: (encaissement: EncaissementDossier) => void;
  onRenouveler: () => void;
  echeancierDe: (p: PeriodeDossier) => { numero: number; total: number; date: string }[];
}

/** La couleur d'un statut. Jamais une valeur en dur : le depot a 16 themes. */
function couleursStatut(statut: StatutLoyer, t: ReturnType<typeof useThemeTokens>) {
  if (statut === 'encaisse') return { background: t.success.bg, color: t.success.text, border: `1px solid ${t.success.border}` };
  if (statut === 'en-retard') return { background: t.danger.bg, color: t.danger.text, border: `1px solid ${t.danger.border}` };
  if (statut === 'a-encaisser') return { background: t.warning.bg, color: t.warning.text, border: `1px solid ${t.warning.border}` };
  return { background: t.surface.secondary, color: t.text.tertiary, border: `1px solid ${t.surface.border}` };
}

export default function CrmImmoEcheancier({
  echeancier, periodeAffichee, periodeActive, historique, encaissements, compteurs,
  chargement, enCours, lectureSeule, onEncaisser, onAnnuler, onRenouveler, echeancierDe,
}: Props) {
  const t = useThemeTokens();
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);

  /* 44 px de cote minimum sur telephone : une icone de 14 px plus 15 px de marge
     interieure de chaque cote. En dessous, le doigt rate la cible. */
  const bouton = 'rounded-lg px-2.5 py-1.5 max-md:px-3 max-md:py-[13px] inline-flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0';

  if (chargement) {
    return <p className="text-sm py-8 text-center" style={{ color: t.text.tertiary }}
      data-testid="crm-immo-echeancier-chargement">Chargement de l'échéancier…</p>;
  }

  if (!periodeAffichee) {
    return (
      <div className="py-8 text-center flex flex-col items-center gap-3" data-testid="crm-immo-echeancier-vide">
        <CalendarClock className="w-8 h-8" style={{ color: t.label.muted }} />
        <p className="text-sm" style={{ color: t.text.tertiary }}>
          Aucune période de contrat. Renseignez la date d'entrée, la fin de contrat et
          l'encaissement du loyer pour que l'échéancier se calcule.
        </p>
      </div>
    );
  }

  const Statut = ({ s }: { s: StatutLoyer }) => (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={couleursStatut(s, t)}>{LIBELLE_STATUT[s]}</span>
  );

  const Actions = ({ l }: { l: LigneEcheancier }) => {
    if (lectureSeule) return null;
    return l.encaissement
      ? (
        <button type="button" onClick={() => onAnnuler(l.encaissement!)} disabled={enCours}
          data-testid={`crm-immo-annuler-${l.date}`}
          aria-label={`Annuler l'encaissement du loyer du ${enDateFrancaise(l.date)}`}
          className={bouton}
          style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
          <Undo2 className="w-3.5 h-3.5" /> Annuler
        </button>
      )
      : (
        <button type="button" onClick={() => onEncaisser(l.date)} disabled={enCours}
          data-testid={`crm-immo-encaisser-${l.date}`}
          aria-label={`Marquer encaissé le loyer du ${enDateFrancaise(l.date)}`}
          className={bouton}
          style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Marquer encaissé
        </button>
      );
  };

  return (
    <div className="flex flex-col gap-3" data-testid="crm-immo-echeancier">

      {/* ---- L EN-TETE : la periode, le nombre de loyers, les compteurs ---- */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold break-words" style={{ color: t.heading.primary }}
            data-testid="crm-immo-echeancier-periode">
            Du {enDateFrancaise(periodeAffichee.debut)} au {enDateFrancaise(periodeAffichee.fin)}
            {' · '}
            {/* Le nombre de loyers n'est JAMAIS saisi : il tombe de la periode. */}
            <span data-testid="crm-immo-echeancier-total">
              {echeancier.length} loyer{echeancier.length > 1 ? 's' : ''}
            </span>
            {periodeActive === null && ' · période terminée'}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: t.label.hint }}>
            Encaissement le {periodeAffichee.jour_encaissement} de chaque mois.
          </p>
        </div>

        {!lectureSeule && (
          <button type="button" onClick={onRenouveler} disabled={enCours}
            data-testid="crm-immo-renouveler"
            aria-label="Renouveler le contrat de ce dossier"
            className={bouton}
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
            <RefreshCw className="w-3.5 h-3.5" /> Renouveler le contrat
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5" data-testid="crm-immo-echeancier-compteurs">
        {(['encaisse', 'a-encaisser', 'en-retard', 'a-venir'] as StatutLoyer[])
          .filter(s => compteurs[s] > 0)
          .map(s => (
            <span key={s} className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={couleursStatut(s, t)}>{LIBELLE_STATUT[s]} : {compteurs[s]}</span>
          ))}
      </div>

      {/* ---- LE TABLEAU DESKTOP ---- */}
      {/* `hidden md:block` : sous 768 px ce tableau n'existe pas, les cartes prennent le
          relais. Un tableau de quatre colonnes comprime n'est pas une version mobile. */}
      <div className="hidden md:block rounded-xl overflow-auto"
        style={{ border: `1px solid ${t.surface.border}` }} data-testid="crm-immo-echeancier-table">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: t.table.headerBg, color: t.table.headerText }}>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">N°</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Date</th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Statut</th>
              <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {echeancier.map(l => (
              <tr key={l.date} data-testid="crm-immo-echeance-ligne"
                data-actuel={l.actuel ? 'oui' : 'non'}
                style={{
                  borderBottom: `1px solid ${t.table.rowBorder}`,
                  /* LE SURLIGNAGE. Un fond ET une bordure a gauche : sur les themes
                     clairs, un fond seul se distingue mal d'une ligne survolee. */
                  background: l.actuel ? t.table.rowSelected : undefined,
                  boxShadow: l.actuel ? `inset 3px 0 0 ${t.accent.solid}` : undefined,
                }}>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: t.table.cellTextMuted }}>
                  {l.numero} / {l.total}
                </td>
                <td className="px-3 py-2 whitespace-nowrap"
                  style={{ color: t.table.cellText, fontWeight: l.actuel ? 700 : 400 }}>
                  {enDateFrancaise(l.date)}
                  {l.actuel && (
                    <span className="ml-2 text-[11px] font-semibold" style={{ color: t.accent.text }}>
                      loyer actuel
                    </span>
                  )}
                </td>
                <td className="px-3 py-2"><Statut s={l.statut} /></td>
                <td className="px-3 py-2 text-right"><Actions l={l} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- LES CARTES MOBILE ---- */}
      <div className="md:hidden flex flex-col gap-2" data-testid="crm-immo-echeancier-cards">
        {echeancier.map(l => (
          <article key={l.date} data-testid="crm-immo-echeance-carte"
            data-actuel={l.actuel ? 'oui' : 'non'}
            className="rounded-xl p-3 flex flex-col gap-2"
            style={{
              background: l.actuel ? t.table.rowSelected : t.card.bg,
              border: `1px solid ${l.actuel ? t.accent.border : t.surface.border}`,
              boxShadow: l.actuel ? `inset 3px 0 0 ${t.accent.solid}` : undefined,
            }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold" style={{ color: t.text.primary }}>
                {rangDuLoyer(l)}
              </span>
              <Statut s={l.statut} />
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm" style={{ color: t.text.secondary, fontWeight: l.actuel ? 700 : 400 }}>
                {enDateFrancaise(l.date)}
                {l.actuel && (
                  <span className="ml-2 text-[11px] font-semibold" style={{ color: t.accent.text }}>
                    loyer actuel
                  </span>
                )}
              </span>
              <Actions l={l} />
            </div>
          </article>
        ))}
      </div>

      {/* ---- L HISTORIQUE DES PERIODES ---- */}
      {historique.length > 0 && (
        <div className="mt-2 pt-3" style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
          <button type="button" onClick={() => setHistoriqueOuvert(v => !v)}
            data-testid="crm-immo-historique-periodes-bascule"
            aria-expanded={historiqueOuvert}
            className="text-xs font-semibold" style={{ color: t.text.link }}>
            {historiqueOuvert ? 'Masquer' : 'Afficher'} les périodes précédentes ({historique.length})
          </button>

          {historiqueOuvert && (
            <ul className="mt-2 flex flex-col gap-2" data-testid="crm-immo-historique-periodes">
              {historique.map(p => {
                const e = echeancierDe(p);
                return (
                  <li key={p.id} className="rounded-lg p-2.5 text-xs break-words"
                    style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}>
                    Du {enDateFrancaise(p.debut)} au {enDateFrancaise(p.fin)} · {e.length} loyer{e.length > 1 ? 's' : ''}
                    {' · '}encaissement le {p.jour_encaissement}
                    {/* La periode close garde son propre echeancier, et sa propre
                        numerotation : la nouvelle periode recommence a 1. */}
                    {e.length > 0 && (
                      <span style={{ color: t.label.hint }}>
                        {' '}({enDateFrancaise(e[0].date)} → {enDateFrancaise(e[e.length - 1].date)})
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ---- LES CORRECTIONS CONSERVEES ---- */}
      {encaissements.some(e => e.annule_le !== null) && (
        <details className="mt-1" data-testid="crm-immo-annulations">
          <summary className="text-xs font-semibold cursor-pointer" style={{ color: t.text.link }}>
            Encaissements annulés ({encaissements.filter(e => e.annule_le !== null).length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {encaissements.filter(e => e.annule_le !== null).map(e => (
              <li key={e.id} className="text-[11px] break-words" style={{ color: t.label.hint }}>
                Loyer du {enDateFrancaise(e.echeance)} — encaissement annulé
                {e.motif_annulation ? ` : ${e.motif_annulation}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
