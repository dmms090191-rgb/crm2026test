import { Pencil, Trash2, CalendarClock, Coins } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { cleColonne, type Colonne } from '../../../../lib/crmImmoColonnes';
import { valeurAffichee } from '../../../../lib/crmImmoRecherche';
import { formatDateImmo, type DossierImmo } from './crmImmoTypes';

/**
 * LA PRESENTATION MOBILE : des fiches, pas un tableau comprime.
 *
 * David a ete explicite : « sur mobile, ne compresse pas simplement le tableau ». Un
 * tableau a dix colonnes dans 375 px de large est illisible, et le rendre scrollable
 * horizontalement cache la moitie de l'information derriere un geste que personne ne
 * devine.
 *
 * Une fiche par dossier : le nom en entete, les actions a droite, et le reste en paires
 * libelle/valeur sur deux colonnes. Les deux echeances — fin de contrat et jour
 * d'encaissement — sont remontees en bandeau, parce que ce sont elles qu'on vient voir.
 *
 * `md:hidden` : au-dessus de 768 px ce composant n'existe pas, c'est CrmImmoTable qui
 * prend le relais. Les deux ne sont jamais montes en meme temps.
 *
 * ---------- IL LIT LA CONFIGURATION DES COLONNES ----------
 *
 * Les champs ne sont PAS codes en dur : la fiche affiche les colonnes visibles, systeme
 * et personnalisees. Masquer une colonne la retire donc du tableau ET des fiches, et une
 * colonne ajoutee apparait aux deux. Sans ca, les deux presentations divergeraient des
 * la premiere colonne personnalisee.
 */

interface Props {
  dossiers: DossierImmo[];
  colonnes: Colonne[];
  loading: boolean;
  onModifier: (d: DossierImmo) => void;
  onSupprimer: (d: DossierImmo) => void;
}

export default function CrmImmoCards({ dossiers, colonnes, loading, onModifier, onSupprimer }: Props) {
  const t = useThemeTokens();

  /* Le nom tient l'entete ; les deux echeances tiennent le bandeau. Le reste va dans la
     grille, sans les repeter. */
  const DANS_L_ENTETE = new Set(['nom', 'prenom', 'date_fin_contrat', 'jour_encaissement']);

  function valeur(d: DossierImmo, c: Colonne): string {
    const brut = valeurAffichee(d, c);
    if (brut === '') return '—';
    if (c.type === 'date') return formatDateImmo(brut);
    return brut;
  }

  const visible = (cle: string) => colonnes.some(c => cleColonne(c) === cle);

  return (
    <div className="md:hidden flex flex-col gap-3" data-testid="crm-immo-cards">
      {loading && (
        <p className="text-sm py-8 text-center" style={{ color: t.label.muted }}>Chargement des dossiers…</p>
      )}
      {!loading && dossiers.length === 0 && (
        <p className="text-sm py-8 text-center" style={{ color: t.label.muted }} data-testid="crm-immo-vide-mobile">
          Aucun dossier ne correspond.
        </p>
      )}

      {!loading && dossiers.map(d => {
        const titre = [d.prenom, d.nom].filter(Boolean).join(' ').trim() || d.nom;
        const reste = colonnes.filter(c => !(c.famille === 'systeme' && DANS_L_ENTETE.has(c.cle)));
        return (
          <article key={d.id} data-testid={`crm-immo-carte-${d.id}`}
            className="rounded-xl p-3.5"
            style={{ background: t.card.bg, border: `1px solid ${t.card.border}`, boxShadow: t.card.shadow }}>

            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold leading-tight break-words min-w-0" style={{ color: t.heading.primary }}>
                {titre}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => onModifier(d)} title="Modifier"
                  data-testid={`crm-immo-carte-modifier-${d.id}`}
                  className="p-2 rounded-lg" style={{ color: t.table.cellIcon, background: t.surface.secondary }}>
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => onSupprimer(d)} title="Supprimer"
                  data-testid={`crm-immo-carte-supprimer-${d.id}`}
                  className="p-2 rounded-lg" style={{ color: t.danger.text, background: t.danger.bg }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Les deux echeances, remontees : c'est ce qu'on vient voir. */}
            {(visible('date_fin_contrat') || visible('jour_encaissement')) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                {visible('date_fin_contrat') && d.date_fin_contrat && (
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: t.label.text }}>
                    <CalendarClock className="w-3.5 h-3.5" style={{ color: t.warning.text }} />
                    Fin le {formatDateImmo(d.date_fin_contrat)}
                  </span>
                )}
                {visible('jour_encaissement') && typeof d.jour_encaissement === 'number' && (
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: t.label.text }}>
                    <Coins className="w-3.5 h-3.5" style={{ color: t.accent.text }} />
                    Loyer le {d.jour_encaissement} du mois
                  </span>
                )}
              </div>
            )}

            {reste.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 pt-3"
                style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
                {reste.map(c => (
                  <div key={cleColonne(c)} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide" style={{ color: t.label.hint }}>{c.nom}</dt>
                    <dd className="text-sm break-words" style={{ color: t.text.primary }}>{valeur(d, c)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </article>
        );
      })}
    </div>
  );
}
