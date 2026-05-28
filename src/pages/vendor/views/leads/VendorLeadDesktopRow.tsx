import { forwardRef, useState } from 'react';
import { Mail, Phone, ChevronDown, Undo2, Redo2, CheckCircle2, ExternalLink, Bot, MoreHorizontal } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getStatutCfg, FALLBACK_COLOR } from '../../../admin/views/crm/utils';
import MobileStatutModal from '../../../admin/views/crm/MobileStatutModal';
import CheckBox from '../../../admin/views/crm/CheckBox';
import CopyButton from '../../../../components/CopyButton';
import VendorLeadActionModal from './VendorLeadActionModal';
import type { ImportedLead, StatutDef } from '../vendorLeadsTypes';
import type { ColumnDef } from '../../../../components/table/useColumnOrder';

function formatImportedAt(isoDate: string, tz: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: tz })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: tz });
  } catch { return isoDate.slice(0, 10); }
}

interface Props {
  lead: ImportedLead;
  index: number;
  statutDefs: StatutDef[];
  isSelected: boolean;
  timezone: string;
  colSep: React.CSSProperties;
  selectMode?: boolean;
  workModeEnabled: boolean;
  isWorkActive: boolean;
  workHistoryLength: number;
  workHistoryPosition: number;
  canUndo: boolean;
  canRedo: boolean;
  onWorkSelect: (id: string) => void;
  onWorkUndo: () => void;
  onWorkRedo: () => void;
  onToggle: (id: string) => void;
  onStatutChange: (id: string, statut: string) => void;
  onToggleActif: (id: string, current: boolean) => void;
  onToggleAi: (id: string, current: boolean) => void;
  onDetail: (lead: ImportedLead, index: number) => void;
  onOpenChat?: (ref: { id: string; nom: string; prenom: string; email: string; tel: string }) => void;
  onOpenRdv?: (ref: { id: string; nom: string; prenom: string; email: string; tel: string }) => void;
  onConnectAsClient?: (ref: { id: string; nom: string; prenom: string; email: string }) => void;
  columnOrder?: string[];
  customColumnDefs?: ColumnDef[];
  customColumnValues?: Record<string, string>;
}

const DEFAULT_VENDOR_COLUMN_ORDER = ['hash', 'nom', 'prenom', 'email', 'telephone', 'date_ajout', 'statut', 'actions', 'acces', 'ia'];

const VendorLeadDesktopRow = forwardRef<HTMLTableRowElement, Props>(({
  lead, index, statutDefs, isSelected, timezone, selectMode, workModeEnabled, isWorkActive,
  workHistoryLength, workHistoryPosition, canUndo, canRedo,
  onWorkSelect, onWorkUndo, onWorkRedo, onToggle, onStatutChange,
  onToggleActif, onToggleAi, onDetail, onOpenChat, onOpenRdv, onConnectAsClient, columnOrder,
  customColumnDefs, customColumnValues,
}, ref) => {
  const cols = columnOrder ?? DEFAULT_VENDOR_COLUMN_ORDER;
  const tokens = useThemeTokens();
  const [statutModalOpen, setStatutModalOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const nom = lead.data['Nom'] ?? '';
  const prenom = lead.data['Prenom'] ?? '';
  const email = lead.data['Email'] ?? '';
  const tel = lead.data['Telephone'] ?? '';
  const statut = lead.statut || 'Nouveau';
  const isNeutral = statut === 'Nouveau';
  const statutDef = statutDefs.find(s => s.nom === statut);
  const cfg = getStatutCfg(statutDef?.couleur ?? FALLBACK_COLOR, isNeutral);
  const actif = lead.actif !== false;
  const aiEnabled = lead.ai_enabled === true;
  const statutLabel = statut === 'Nouveau' ? 'Sans statut' : statut;
  const isEven = index % 2 === 0;
  const baseBg = isEven ? 'transparent' : tokens.surface.secondary;
  const rowBg = isWorkActive ? tokens.table.rowSelected : isSelected ? tokens.table.rowSelected : baseBg;

  return (
    <tr
      ref={ref}
      data-row-id={lead.id}
      className="group transition-all duration-200"
      style={{
        background: rowBg,
        borderLeft: isWorkActive ? `4px solid ${tokens.accent.solid}` : '4px solid transparent',
        boxShadow: isWorkActive ? `inset 0 0 20px ${tokens.accent.bg}` : 'none',
      }}
      onMouseEnter={e => {
        if (!isSelected && !isWorkActive) {
          e.currentTarget.style.background = tokens.table.rowHover;
          e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${tokens.surface.border}`;
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = rowBg;
        e.currentTarget.style.boxShadow = isWorkActive ? `inset 0 0 20px ${tokens.accent.bg}` : 'none';
      }}
    >
      {(selectMode || workModeEnabled) && (
        <td className="px-3 py-5 w-12">
          {workModeEnabled ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onWorkSelect(lead.id)}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                style={isWorkActive
                  ? { background: tokens.accent.bg, border: `1.5px solid ${tokens.accent.border}`, boxShadow: `0 0 8px ${tokens.accent.bg}` }
                  : { background: tokens.input.bg, border: `1.5px solid ${tokens.input.border}` }
                }
              >
                {isWorkActive && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: tokens.accent.text }} />}
              </button>
              {isWorkActive && workHistoryLength > 0 && (
                <div className="flex items-center gap-0.5 ml-1">
                  <button onClick={onWorkUndo} disabled={!canUndo} className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30" style={{ color: tokens.accent.text }}><Undo2 className="w-3 h-3" /></button>
                  <span className="text-[9px] font-bold tabular-nums" style={{ color: tokens.accent.text }}>{workHistoryPosition}/{workHistoryLength}</span>
                  <button onClick={onWorkRedo} disabled={!canRedo} className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30" style={{ color: tokens.accent.text }}><Redo2 className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          ) : (
            <CheckBox checked={isSelected} onChange={() => onToggle(lead.id)} />
          )}
        </td>
      )}
      {cols.map(key => {
        switch (key) {
          case 'hash': return <td key={key} className="px-5 py-5 text-xs tabular-nums font-medium" style={{ color: tokens.table.indexText }}>{index + 1}</td>;
          case 'nom': return <td key={key} className="px-5 py-5"><span className="text-[13px] font-semibold" style={{ color: tokens.table.cellText }}>{nom || '\u2014'}</span></td>;
          case 'prenom': return <td key={key} className="px-5 py-5"><span className="text-[13px]" style={{ color: tokens.text.secondary }}>{prenom || '\u2014'}</span></td>;
          case 'email': return (
            <td key={key} className="px-5 py-5">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: tokens.surface.secondary }}>
                  <Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                  <span className="text-xs truncate max-w-[160px]" style={{ color: tokens.table.cellTextMuted }}>{email || '\u2014'}</span>
                </div>
                {email && <CopyButton value={email} />}
              </div>
            </td>
          );
          case 'telephone': return (
            <td key={key} className="px-5 py-5">
              {tel ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: tokens.surface.secondary }}>
                  <Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                  <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{tel}</span>
                </div>
              ) : (
                <span className="text-xs" style={{ color: tokens.text.quaternary }}>{'\u2014'}</span>
              )}
            </td>
          );
          case 'date_ajout': return <td key={key} className="px-5 py-5"><span className="text-xs whitespace-nowrap tabular-nums font-medium" style={{ color: tokens.table.cellTextMuted }}>{formatImportedAt(lead.imported_at, timezone)}</span></td>;
          case 'statut': return (
            <td key={key} className="px-5 py-5">
              <button
                type="button"
                onClick={() => setStatutModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[11px] font-bold transition-all duration-200 hover:shadow-md cursor-pointer"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
                {statutLabel}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
              {statutModalOpen && (
                <MobileStatutModal currentStatut={statut} statutDefs={statutDefs} onSelect={v => onStatutChange(lead.id, v)} onClose={() => setStatutModalOpen(false)} />
              )}
            </td>
          );
          case 'actions': return (
            <td key={key} className="px-5 py-5">
              <button
                onClick={() => setActionsOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
                onMouseEnter={e => { e.currentTarget.style.background = tokens.accent.bgHover; e.currentTarget.style.boxShadow = `0 2px 8px ${tokens.accent.bg}`; }}
                onMouseLeave={e => { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />Actions
              </button>
              {actionsOpen && (
                <VendorLeadActionModal
                  lead={{ nom, prenom, email, tel }}
                  tokens={tokens}
                  onClose={() => setActionsOpen(false)}
                  onDetail={() => onDetail(lead, index)}
                  onConnect={() => onConnectAsClient?.({ id: lead.id, nom, prenom, email })}
                  onChat={() => onOpenChat?.({ id: lead.id, nom, prenom, email, tel })}
                  onRdv={() => onOpenRdv?.({ id: lead.id, nom, prenom, email, tel })}
                />
              )}
            </td>
          );
          case 'acces': return (
            <td key={key} className="px-5 py-5">
              <button
                onClick={() => onToggleActif(lead.id, actif)}
                className="relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none"
                style={{ width: 40, height: 22, background: actif ? tokens.success.bg : tokens.surface.tertiary, border: actif ? `1.5px solid ${tokens.success.border}` : `1.5px solid ${tokens.surface.border}`, boxShadow: actif ? `0 0 8px ${tokens.success.bg}` : 'none' }}
                title={actif ? 'Desactiver' : 'Activer'}
              >
                <span className="absolute rounded-full transition-all duration-300" style={{ width: 14, height: 14, left: actif ? 22 : 3, top: 3, background: actif ? tokens.success.text : tokens.text.quaternary, boxShadow: actif ? `0 0 6px ${tokens.success.text}` : 'none' }} />
              </button>
            </td>
          );
          case 'ia': return (
            <td key={key} className="px-5 py-5">
              <div className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 flex-shrink-0" style={{ color: aiEnabled ? '#3b82f6' : tokens.text.quaternary, transition: 'color 0.3s' }} />
                <button
                  onClick={() => onToggleAi(lead.id, aiEnabled)}
                  className="relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none"
                  style={{ width: 40, height: 22, background: aiEnabled ? 'rgba(59,130,246,0.15)' : tokens.surface.tertiary, border: aiEnabled ? '1.5px solid rgba(59,130,246,0.3)' : `1.5px solid ${tokens.surface.border}`, boxShadow: aiEnabled ? '0 0 8px rgba(59,130,246,0.2)' : 'none' }}
                  title={aiEnabled ? 'Desactiver IA' : 'Activer IA'}
                >
                  <span className="absolute rounded-full transition-all duration-300" style={{ width: 14, height: 14, left: aiEnabled ? 22 : 3, top: 3, background: aiEnabled ? '#3b82f6' : tokens.text.quaternary, boxShadow: aiEnabled ? '0 0 6px rgba(59,130,246,0.5)' : 'none' }} />
                </button>
              </div>
            </td>
          );
          default: {
            const customDef = customColumnDefs?.find(c => c.key === key);
            const val = customColumnValues?.[key] ?? '';
            if (customDef?.fieldType === 'url' && val) {
              const href = val.match(/^https?:\/\//) ? val : `https://${val}`;
              return (
                <td key={key} className="px-5 py-5 whitespace-nowrap">
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200"
                    style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}
                    onMouseEnter={e => { e.currentTarget.style.background = tokens.accent.bgHover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = tokens.accent.bg; }}
                  >
                    <ExternalLink className="w-3 h-3" />Lien
                  </a>
                </td>
              );
            }
            return (
              <td key={key} className="px-5 py-5 whitespace-nowrap">
                <span className="text-xs" style={{ color: val ? tokens.table.cellTextMuted : tokens.text.quaternary }}>{val || '\u2014'}</span>
              </td>
            );
          }
        }
      })}
    </tr>
  );
});

VendorLeadDesktopRow.displayName = 'VendorLeadDesktopRow';
export default VendorLeadDesktopRow;
