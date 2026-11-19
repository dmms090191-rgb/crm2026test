import { Users, Trash2, ArrowRightLeft, FolderInput, FolderMinus } from 'lucide-react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface CrmActionBarProps {
  totalLeads: number;
  selectedCount: number;
  deleting: boolean;
  tokens: ThemeTokens;
  onTransfer: () => void;
  onDelete: () => void;
  /** Vrai tant que la base n'a pas repondu : le compte n'est pas encore CONNU. */
  loading?: boolean;
  /** Ranger la selection dans un onglet de colonnes (sans dupliquer les leads). */
  onAjouterOnglet?: () => void;
  /** Retirer la selection de l'onglet ouvert : les leads restent dans Principal. */
  onRetirerOnglet?: () => void;
}

export default function CrmActionBar({ totalLeads, selectedCount, deleting, tokens, onTransfer, onDelete, loading, onAjouterOnglet, onRetirerOnglet }: CrmActionBarProps) {
  /*
   * « 0 lead » n'est affiche que si la base a REELLEMENT repondu zero.
   *
   * Avant la reponse, le compte n'est pas zero : il est inconnu. Les deux se ressemblent a
   * l'ecran et ne veulent pas du tout dire la meme chose — l'un annonce un CRM vide, l'autre
   * une requete en cours. Un point de suspension dit la seconde chose sans mentir, et la
   * pastille garde exactement la meme place : rien ne saute quand le chiffre arrive.
   */
  const compte = loading ? '…' : `${totalLeads} lead${totalLeads !== 1 ? 's' : ''}`;
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>CRM</h2>
        <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>Gestion de la relation client</p>
      </div>
      {selectedCount > 0 ? (
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-3">
          <button
            onClick={onTransfer}
            className="flex items-center justify-center gap-1.5 px-2 py-2 md:px-3 md:py-1.5 rounded-xl text-[11px] md:text-xs font-semibold transition-all"
            style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Transferer {selectedCount}</span>
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center justify-center gap-1.5 px-2 py-2 md:px-3 md:py-1.5 rounded-xl text-[11px] md:text-xs font-semibold transition-all"
            style={{ background: tokens.danger.bg, color: tokens.danger.text, border: `1px solid ${tokens.danger.border}`, opacity: deleting ? 0.6 : 1 }}
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Supprimer {selectedCount}</span>
          </button>
          {onAjouterOnglet && (
            <button
              onClick={onAjouterOnglet}
              className="flex items-center justify-center gap-1.5 px-2 py-2 md:px-3 md:py-1.5 rounded-xl text-[11px] md:text-xs font-semibold transition-all"
              style={{ background: tokens.surface.secondary, color: tokens.text.secondary, border: `1px solid ${tokens.surface.border}` }}
            >
              <FolderInput className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Ajouter à un onglet</span>
            </button>
          )}
          {onRetirerOnglet && (
            <button
              onClick={onRetirerOnglet}
              className="flex items-center justify-center gap-1.5 px-2 py-2 md:px-3 md:py-1.5 rounded-xl text-[11px] md:text-xs font-semibold transition-all"
              style={{ background: tokens.surface.secondary, color: tokens.text.secondary, border: `1px solid ${tokens.surface.border}` }}
              title="Les leads restent dans Principal et dans leurs autres onglets"
            >
              <FolderMinus className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Retirer de l'onglet</span>
            </button>
          )}
          <div className="col-span-2 md:col-span-1 flex items-center justify-center gap-1.5 px-2 py-2 md:px-3 md:py-1.5 rounded-xl text-[11px] md:text-xs font-semibold" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            {compte}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold self-start md:self-auto" style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}>
          <Users className="w-3.5 h-3.5" />
          {compte}
        </div>
      )}
    </div>
  );
}
