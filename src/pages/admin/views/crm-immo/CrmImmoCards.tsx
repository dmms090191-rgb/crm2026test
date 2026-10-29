import { Pencil, Trash2, CalendarClock, Coins, Eye, MessageSquare } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { cleColonne, type Colonne } from '../../../../lib/crmImmoColonnes';
import { valeurAffichee } from '../../../../lib/crmImmoRecherche';
import { formatDateImmo, type DossierImmo } from './crmImmoTypes';
import CrmImmoChoixCellule from './CrmImmoChoixCellule';
import { nomCanonique } from '../../../../lib/crmImmoIdentite';

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
  /** Ouvre la modale Details sur l onglet demande. La MEME que sur desktop. */
  onDetails: (d: DossierImmo, onglet: 'informations' | 'commentaires') => void;
  nombreCommentaires: Record<string, number>;
  /** Ecrit la valeur d une colonne a choix. Rend l erreur, ou null. */
  onChoisir: (d: DossierImmo, cle: string, valeur: string) => Promise<{ error: string | null }>;
}

export default function CrmImmoCards({
  dossiers, colonnes, loading, onModifier, onSupprimer, onDetails, nombreCommentaires, onChoisir,
}: Props) {
  const t = useThemeTokens();

  /*
   * Le nom tient l'entete ; les deux echeances tiennent le bandeau. Le reste va dans la
   * grille, SANS LES REPETER.
   *
   * ---------- CE SET A MENTI PENDANT CINQ JOURS ----------
   *
   * Il contenait 'nom' et 'prenom'. Or le 23/10/2026, ces deux cles ont disparu de
   * COLONNES_SYSTEME : elles ont ete fusionnees en la colonne composee 'np_locataire'.
   * L'exclusion ne correspondait donc plus a rien, et elle echouait EN SILENCE — aucun
   * type ne verifie le contenu d'un Set de chaines face a des cles qui ont change.
   *
   * Resultat mesure le 27/10 : sur telephone, LE NOM DU LOCATAIRE S'AFFICHAIT DEUX FOIS
   * par fiche — une fois en titre (ligne du dessous, `titre`), une fois dans la grille
   * libelle/valeur. Les deux autres litteraux etant toujours valides, le defaut est passe
   * inapercu.
   *
   * LA LECON : un renommage de cles laisse des litteraux derriere lui, et ceux-la ne
   * levent pas. Chercher les anciens noms par grep fait partie du renommage.
   */
  const DANS_L_ENTETE = new Set(['np_locataire', 'date_fin_contrat', 'jour_encaissement']);

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
        const titre = nomCanonique(d.nom_complet_locataire, d.nom, d.prenom);
        /*
         * Le commentaire sort des paires libelle/valeur, comme il sort des cellules du
         * tableau : plusieurs lignes de texte dans une demi-colonne de 170 px rendaient
         * la fiche illisible. Il a son bouton, en bas.
         */
        const reste = colonnes.filter(c =>
          !(c.famille === 'systeme' && (DANS_L_ENTETE.has(c.cle) || c.cle === 'commentaire')));
        const commentaireVisible = colonnes.some(c => c.famille === 'systeme' && c.cle === 'commentaire');
        const nbCommentaires = nombreCommentaires[d.id] ?? 0;
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
                  aria-label={`Modifier le dossier de ${titre}`}
                  data-testid={`crm-immo-carte-modifier-${d.id}`}
                  className="p-2 rounded-lg" style={{ color: t.table.cellIcon, background: t.surface.secondary }}>
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => onSupprimer(d)} title="Supprimer"
                  aria-label={`Supprimer le dossier de ${titre}`}
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
                  <div key={cleColonne(c)} className={"min-w-0" + (c.famille === "systeme" && c.choix !== undefined ? " col-span-2" : "")}>
                    <dt className="text-[11px] uppercase tracking-wide" style={{ color: t.label.hint }}>{c.nom}</dt>
                    {/* Une colonne A CHOIX se touche. Elle prend les DEUX colonnes de la
                        grille : une demi-largeur de 170 px a 375 px laisserait un bouton
                        trop etroit pour son libelle et son chevron. */}
                    {c.famille === "systeme" && c.choix !== undefined ? (
                      <dd className="mt-1">
                        <CrmImmoChoixCellule
                          valeur={(d as unknown as Record<string, string | null>)[c.cle] ?? null}
                          choix={c.choix} libelleColonne={c.nom}
                          nomDossier={titre}
                          testid={"crm-immo-carte-choix-" + c.cle + "-" + d.id}
                          onChoisir={v => onChoisir(d, c.cle, v)} />
                      </dd>
                    ) : (
                      <dd className="text-sm break-words" style={{ color: t.text.primary }}>{valeur(d, c)}</dd>
                    )}
                  </div>
                ))}
              </dl>
            )}

            {/*
              Les deux boutons en PIED de fiche, pleine largeur, et non en haut a droite
              avec le crayon et la poubelle. A 375 px, quatre cibles de 44 px dans l en-tete
              ne laisseraient plus de place au nom — et ce sont les deux actions qu on vient
              chercher le plus souvent. py-2.5 : 44 px de haut au doigt.
            */}
            <div className="flex items-stretch gap-2 mt-3 pt-3"
              style={{ borderTop: `1px solid ${t.surface.borderLight}` }}>
              <button type="button" onClick={() => onDetails(d, 'informations')}
                data-testid={`crm-immo-carte-details-${d.id}`}
                className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                <Eye className="w-4 h-4 shrink-0" />
                Détails
              </button>
              {commentaireVisible && (
                <button type="button" onClick={() => onDetails(d, 'commentaires')}
                  data-testid={`crm-immo-carte-commentaires-${d.id}`}
                  aria-label={nbCommentaires > 0
                    ? `Voir les ${nbCommentaires} commentaires du dossier de ${titre}`
                    : `Ajouter un commentaire au dossier de ${titre}`}
                  className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold"
                  style={nbCommentaires > 0
                    ? { background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }
                    : { background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.label.muted }}>
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="truncate">Commentaires{nbCommentaires > 0 ? ` (${nbCommentaires})` : ''}</span>
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
