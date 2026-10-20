import { ArrowUp, ArrowDown, Pencil, Trash2, Eye, MessageSquare } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { cleColonne, type Colonne } from '../../../../lib/crmImmoColonnes';
import { valeurAffichee, type Sens } from '../../../../lib/crmImmoRecherche';
import { formatDateImmo, type DossierImmo } from './crmImmoTypes';

/**
 * Le tableau DESKTOP des dossiers CRM Immo.
 *
 * `hidden md:block` : sous 768 px ce composant n'existe pas du tout a l'ecran — c'est
 * CrmImmoCards qui prend le relais. Un tableau comprime n'est pas une version mobile,
 * et c'est explicitement ce que David a refuse.
 *
 * Toutes les couleurs viennent de `tokens.table.*` et de `tokens.text.*`. Aucune valeur
 * en dur : le depot a 16 themes, dont 5 clairs, et une couleur ecrite a la main passe le
 * build, passe le typecheck, s'affiche correctement sur les sombres et devient illisible
 * sur les clairs.
 */

interface Props {
  dossiers: DossierImmo[];
  colonnes: Colonne[];
  loading: boolean;
  triSur: string | null;
  sens: Sens;
  onTrier: (cle: string) => void;
  onModifier: (d: DossierImmo) => void;
  onSupprimer: (d: DossierImmo) => void;
  /** Ouvre la modale Details sur l onglet demande. UNE modale, deux portes d entree. */
  onDetails: (d: DossierImmo, onglet: 'informations' | 'commentaires') => void;
  /** Le nombre de commentaires par dossier, pour << Commentaires (3) >>. */
  nombreCommentaires: Record<string, number>;
}

/**
 * Le bouton qui remplace le texte du commentaire.
 *
 * Il porte le NOMBRE quand il y en a : << Commentaires (3) >>. Sans le chiffre, il
 * faudrait ouvrir la modale pour savoir s il y a quelque chose a lire — sur un tableau
 * de cent lignes, c est cent ouvertures pour trouver les trois dossiers annotes.
 */
function BoutonCommentaires({ dossier, nombre, onOuvrir }: {
  dossier: DossierImmo; nombre: number; onOuvrir: () => void;
}) {
  const t = useThemeTokens();
  const nom = [dossier.prenom, dossier.nom].filter(Boolean).join(' ').trim() || dossier.nom;
  return (
    <button type="button" onClick={onOuvrir}
      data-testid={`crm-immo-commentaires-${dossier.id}`}
      aria-label={nombre > 0
        ? `Voir les ${nombre} commentaires du dossier de ${nom}`
        : `Ajouter un commentaire au dossier de ${nom}`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
      style={nombre > 0
        ? { background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }
        : { background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.label.muted }}>
      <MessageSquare className="w-3.5 h-3.5" />
      {nombre > 0 ? `Commentaires (${nombre})` : 'Commentaires'}
    </button>
  );
}

export default function CrmImmoTable({
  dossiers, colonnes, loading, triSur, sens, onTrier, onModifier, onSupprimer,
  onDetails, nombreCommentaires,
}: Props) {
  const t = useThemeTokens();

  /** Une date s'affiche en jj/mm/aaaa ; un jour d'encaissement se lit « le 5 ». */
  function cellule(d: DossierImmo, c: Colonne): string {
    const brut = valeurAffichee(d, c);
    if (brut === '') return '—';
    if (c.type === 'date') return formatDateImmo(brut);
    if (c.famille === 'systeme' && c.cle === 'jour_encaissement') return `le ${brut}`;
    return brut;
  }

  return (
    <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.card.border}` }} data-testid="crm-immo-table">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: t.table.headerBg, borderBottom: `1px solid ${t.table.headerBorder}` }}>
              {colonnes.map(c => {
                const cle = cleColonne(c);
                const actif = triSur === cle;
                /*
                 * La colonne Commentaire ne se TRIE plus. Sa cellule affiche un bouton,
                 * pas un texte : trier dessus reordonnerait les lignes selon une valeur
                 * que personne ne voit — et selon l'ANCIEN champ unique, que l'interface
                 * n'alimente plus. Un en-tete cliquable qui produit un ordre
                 * incomprehensible est pire qu'un en-tete inerte.
                 */
                const triable = !(c.famille === 'systeme' && c.cle === 'commentaire');
                if (!triable) {
                  return (
                    <th key={cle} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap"
                      style={{ color: t.table.headerText, borderRight: `1px solid ${t.table.colSep}` }}>
                      {c.nom}
                    </th>
                  );
                }
                return (
                  <th key={cle} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap"
                    style={{ color: t.table.headerText, borderRight: `1px solid ${t.table.colSep}` }}>
                    <button type="button" onClick={() => onTrier(cle)}
                      data-testid={`crm-immo-trier-${cle}`}
                      className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                      style={{ color: 'inherit' }}>
                      {c.nom}
                      {actif && (sens === 'asc'
                        ? <ArrowUp className="w-3 h-3" />
                        : <ArrowDown className="w-3 h-3" />)}
                    </button>
                  </th>
                );
              })}
              <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: t.table.headerText }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={colonnes.length + 1} className="px-3 py-8 text-center text-sm" style={{ color: t.table.cellTextMuted }}>
                Chargement des dossiers…
              </td></tr>
            )}
            {!loading && dossiers.length === 0 && (
              <tr><td colSpan={colonnes.length + 1} className="px-3 py-8 text-center text-sm" style={{ color: t.table.cellTextMuted }}
                data-testid="crm-immo-vide">
                Aucun dossier ne correspond.
              </td></tr>
            )}
            {!loading && dossiers.map(d => (
              <tr key={d.id} data-testid={`crm-immo-ligne-${d.id}`}
                style={{ borderBottom: `1px solid ${t.table.rowBorder}` }}>
                {colonnes.map(c => (
                  <td key={cleColonne(c)} className="px-3 py-2.5 align-top"
                    style={{ color: t.table.cellText, borderRight: `1px solid ${t.table.colSep}` }}>
                    {/*
                      La colonne Commentaire n affiche plus son texte. Un commentaire de
                      CRM fait souvent plusieurs lignes : etale dans une cellule, il
                      ecrasait toutes les autres colonnes. Elle porte desormais un bouton
                      qui ouvre la MEME modale Details, sur son onglet.
                    */}
                    {c.famille === 'systeme' && c.cle === 'commentaire'
                      ? <BoutonCommentaires dossier={d} nombre={nombreCommentaires[d.id] ?? 0}
                          onOuvrir={() => onDetails(d, 'commentaires')} />
                      : cellule(d, c)}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    {/* En toutes lettres, pas une icone : c est l action principale de la
                        ligne, et un oeil seul ne dit pas qu on peut aussi MODIFIER
                        depuis la fiche. */}
                    <button type="button" onClick={() => onDetails(d, 'informations')}
                      data-testid={`crm-immo-details-${d.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                      <Eye className="w-3.5 h-3.5" />
                      Détails
                    </button>
                    <button type="button" onClick={() => onModifier(d)}
                      title="Modifier"
                      aria-label={`Modifier le dossier de ${[d.prenom, d.nom].filter(Boolean).join(' ').trim() || d.nom}`}
                      data-testid={`crm-immo-modifier-${d.id}`}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: t.table.cellIcon }}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => onSupprimer(d)}
                      title="Supprimer"
                      aria-label={`Supprimer le dossier de ${[d.prenom, d.nom].filter(Boolean).join(' ').trim() || d.nom}`}
                      data-testid={`crm-immo-supprimer-${d.id}`}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: t.danger.text }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
