import { Briefcase, DoorOpen, MoreHorizontal } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { cabinetTemplateLabel, formatCabinetDate } from './cabinetTypes';
import type { Cabinet } from './cabinetTypes';
import CheckBox from '../crm/CheckBox';

interface Props {
  cabinets: Cabinet[];
  loading: boolean;
  /**
   * Ouvre l'espace du cabinet. Contrairement a la boutique, le bouton ne depend PAS de
   * l'existence d'une scene 3D : un cabinet s'ouvre toujours, et c'est l'espace ouvert qui
   * montre sa scene quand elle existe, ou l'annonce a venir quand elle n'existe pas encore.
   */
  onOuvrir?: (cabinet: Cabinet) => void;
  /**
   * Selection multiple. La colonne de cases n'apparait que si `onBasculer` est fourni :
   * un tableau rendu sans ces props reste exactement celui d'avant.
   */
  selection?: Set<string>;
  onBasculer?: (id: string) => void;
  onBasculerTout?: () => void;
}

const COLUMNS = ['Nom du cabinet', 'Modèle', 'Date de création', 'Statut', 'Actions'];

export default function CabinetsTable({ cabinets, loading, onOuvrir, selection, onBasculer, onBasculerTout }: Props) {
  const t = useThemeTokens();
  const selectionnable = Boolean(onBasculer);
  const choisis = selection ?? new Set<string>();
  const toutCoche = cabinets.length > 0 && choisis.size === cabinets.length;
  const partiel = choisis.size > 0 && choisis.size < cabinets.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: t.accent.border, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (cabinets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}>
        <Briefcase className="w-8 h-8" style={{ color: t.text.quaternary }} />
        <p className="text-sm font-semibold" style={{ color: t.text.secondary }}>Aucun cabinet pour le moment</p>
        <p className="text-xs" style={{ color: t.text.tertiary }}>
          Utilisez « Ajouter un cabinet » pour créer le premier.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.table.headerBorder}`, background: t.table.headerBg }}>
              {selectionnable && (
                <th className="px-3 py-3 w-10" data-testid="cabinets-tout-selectionner">
                  <CheckBox checked={toutCoche} indeterminate={partiel} onChange={() => onBasculerTout?.()} />
                </th>
              )}
              {COLUMNS.map(col => (
                <th key={col}
                  className="px-5 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase whitespace-nowrap"
                  style={{ color: t.table.headerText }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cabinets.map(c => (
              <tr key={c.id} data-row-id={c.id} className="group transition-all duration-150"
                style={{
                  borderBottom: `1px solid ${t.table.rowBorder}`,
                  background: choisis.has(c.id) ? t.accent.bg : undefined,
                }}>
                {selectionnable && (
                  <td className="px-3 py-4 w-10" data-testid={`cabinet-case-${c.id}`}>
                    <CheckBox checked={choisis.has(c.id)} onChange={() => onBasculer?.(c.id)} />
                  </td>
                )}
                <td className="px-5 py-4 text-sm font-semibold whitespace-nowrap" style={{ color: t.table.cellText }}>
                  {c.name}
                </td>
                <td className="px-5 py-4 text-sm whitespace-nowrap" style={{ color: t.table.cellTextMuted }}>
                  {cabinetTemplateLabel(c.template_key)}
                </td>
                <td className="px-5 py-4 text-sm whitespace-nowrap" style={{ color: t.table.cellTextMuted }}>
                  {formatCabinetDate(c.created_at)}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize"
                    style={{ background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }}>
                    {c.status === 'active' ? 'Actif' : c.status}
                  </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {onOuvrir && (
                      <button type="button" onClick={() => onOuvrir(c)}
                        data-testid={`ouvrir-cabinet-${c.id}`}
                        title={`Ouvrir ${c.name}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                        style={{ background: t.accent.solid, color: t.text.inverse }}>
                        <DoorOpen className="w-3.5 h-3.5" />
                        Ouvrir le cabinet
                      </button>
                    )}
                    {/*
                      Bouton « Actions » sans menu, A L'IDENTIQUE de celui du module Boutique
                      (BoutiquesTable.tsx) : la demande etait « les memes fonctions que boutique ».
                      Le jour ou il recevra un menu, les deux modules devront le recevoir ensemble,
                      sans quoi ils divergeraient.
                    */}
                    <button type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                      style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}>
                      <MoreHorizontal className="w-3.5 h-3.5" />
                      Actions
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
