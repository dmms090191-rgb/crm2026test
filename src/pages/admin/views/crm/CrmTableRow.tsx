import { forwardRef, useState } from 'react';
import { Phone, Mail, ChevronDown, LogIn, MessageCircle, CalendarClock, CheckCircle2, Undo2, Redo2 } from 'lucide-react';
import type { ImportedLead, Vendor, StatutDef, ImpersonatedClient, ChatLead } from './types';
import type { ThemeTokens } from '../../../../lib/themeTokens';
import { getStatutCfg, FALLBACK_COLOR } from './utils';
import CheckBox from './CheckBox';
import MobileStatutModal from './MobileStatutModal';
import CopyButton from '../../../../components/CopyButton';

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
  isSelected: boolean;
  statutDefs: StatutDef[];
  vendors: Vendor[];
  tokens: ThemeTokens;
  timezone: string;
  colSep: React.CSSProperties;
  onToggle: (id: string) => void;
  onStatutChange: (id: string, statut: string) => void;
  onToggleActif: (id: string, current: boolean) => void;
  onDetail: (lead: ImportedLead, index: number) => void;
  onConnectAsClient?: (client: ImpersonatedClient) => void;
  onOpenChat?: (lead: ChatLead) => void;
  onOpenRdv?: (lead: ChatLead) => void;
  selectMode?: boolean;
  workModeEnabled?: boolean;
  isWorkActive?: boolean;
  onWorkSelect?: (id: string) => void;
  onWorkUndo?: () => void;
  onWorkRedo?: () => void;
  canWorkUndo?: boolean;
  canWorkRedo?: boolean;
  workHistoryPosition?: number;
  workHistoryLength?: number;
}

const CrmTableRow = forwardRef<HTMLTableRowElement, Props>(function CrmTableRow({ lead, index, isSelected, statutDefs, vendors, tokens, timezone, colSep, onToggle, onStatutChange, onToggleActif, onDetail, onConnectAsClient, onOpenChat, onOpenRdv, selectMode, workModeEnabled, isWorkActive, onWorkSelect, onWorkUndo, onWorkRedo, canWorkUndo, canWorkRedo, workHistoryPosition, workHistoryLength }, ref) {
  const [statutModalOpen, setStatutModalOpen] = useState(false);
  const nom = lead.data['Nom'] ?? '';
  const prenom = lead.data['Prenom'] ?? '';
  const email = lead.data['Email'] ?? '';
  const tel = lead.data['Telephone'] ?? '';
  const statut = lead.statut || 'Nouveau';
  const isNeutral = statut === 'Nouveau';
  const statutDef = statutDefs.find(s => s.nom === statut);
  const cfg = getStatutCfg(statutDef?.couleur ?? FALLBACK_COLOR, isNeutral);
  const actif = lead.actif !== false;
  const assignedVendor = lead.vendor_id ? vendors.find(v => v.id === lead.vendor_id) : null;
  const statutLabel = statut === 'Nouveau' ? 'Sans statut' : statut;

  const rowBg = workModeEnabled && isWorkActive ? 'rgba(249,115,22,0.04)' : isSelected ? tokens.table.rowSelected : 'transparent';

  return (
    <tr
      ref={ref}
      data-row-id={lead.id}
      className="group transition-all duration-150"
      style={{ borderBottom: tokens.table.rowBorder, background: rowBg }}
      onMouseEnter={e => { if (!isSelected && !isWorkActive) e.currentTarget.style.background = tokens.table.rowHover; }}
      onMouseLeave={e => { e.currentTarget.style.background = workModeEnabled && isWorkActive ? 'rgba(249,115,22,0.04)' : isSelected ? tokens.table.rowSelected : 'transparent'; }}
    >
      {(selectMode || workModeEnabled) && (
        <td className="px-2 py-3.5 w-11" style={colSep}>
          {workModeEnabled ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onWorkSelect?.(lead.id)}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0"
                style={isWorkActive
                  ? { background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)' }
                  : { background: tokens.input.bg, border: `1px solid ${tokens.input.border}` }
                }
              >
                {isWorkActive && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#f97316' }} />}
              </button>
              {isWorkActive && (workHistoryLength ?? 0) > 0 && (
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={onWorkUndo}
                    disabled={!canWorkUndo}
                    className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30"
                    style={{ color: '#f97316' }}
                  >
                    <Undo2 className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] font-semibold tabular-nums" style={{ color: '#f97316' }}>
                    {workHistoryPosition}/{workHistoryLength}
                  </span>
                  <button
                    onClick={onWorkRedo}
                    disabled={!canWorkRedo}
                    className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30"
                    style={{ color: '#f97316' }}
                  >
                    <Redo2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <CheckBox checked={isSelected} onChange={() => onToggle(lead.id)} />
          )}
        </td>
      )}
      <td className="px-5 py-3.5 text-xs tabular-nums" style={{ ...colSep, color: tokens.table.indexText }}>{index + 1}</td>
      <td className="px-5 py-3.5" style={colSep}>
        <span className="text-sm font-semibold" style={{ color: tokens.table.cellText }}>{nom || '\u2014'}</span>
      </td>
      <td className="px-5 py-3.5" style={colSep}><span className="text-sm" style={{ color: tokens.text.secondary }}>{prenom || '\u2014'}</span></td>
      <td className="px-5 py-3.5" style={colSep}>
        <div className="flex items-center gap-1">
          <Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
          <span className="text-xs truncate" style={{ color: tokens.table.cellTextMuted }}>{email || '\u2014'}</span>
          {email && <CopyButton value={email} />}
        </div>
      </td>
      <td className="px-5 py-3.5" style={colSep}>
        <div className="flex items-center gap-1.5">
          <Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
          <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{tel || '\u2014'}</span>
        </div>
      </td>
      <td className="px-5 py-3.5" style={colSep}>
        <span className="text-xs whitespace-nowrap tabular-nums" style={{ color: tokens.table.cellTextMuted }}>{formatImportedAt(lead.imported_at, timezone)}</span>
      </td>
      <td className="px-5 py-3.5" style={colSep}>
        <button
          type="button"
          onClick={() => setStatutModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }} />
          {statutLabel}
          <ChevronDown className="w-3 h-3" />
        </button>
        {statutModalOpen && (
          <MobileStatutModal
            currentStatut={statut}
            statutDefs={statutDefs}
            onSelect={v => onStatutChange(lead.id, v)}
            onClose={() => setStatutModalOpen(false)}
          />
        )}
      </td>
      <td className="px-5 py-3.5" style={colSep}>
        <div className="flex items-center gap-2">
          <button onClick={() => onDetail(lead, index)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}>
            <ChevronDown className="w-3 h-3" />Detail
          </button>
          <button onClick={() => onConnectAsClient?.({ id: lead.id, nom, prenom, email })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}>
            <LogIn className="w-3 h-3" />Connect
          </button>
          <button onClick={() => onOpenChat?.({ id: lead.id, nom, prenom, email, tel })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.warning.bg, border: `1px solid ${tokens.warning.border}`, color: tokens.warning.text }}>
            <MessageCircle className="w-3 h-3" />Chat
          </button>
          <button onClick={() => onOpenRdv?.({ id: lead.id, nom, prenom, email, tel })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', color: '#22d3ee' }}>
            <CalendarClock className="w-3 h-3" />RDV
          </button>
        </div>
      </td>
      <td className="px-5 py-3.5" style={colSep}>
        <button
          onClick={() => onToggleActif(lead.id, actif)}
          className="relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none"
          style={{ width: 36, height: 20, background: actif ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)', border: actif ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.1)' }}
          title={actif ? 'Desactiver' : 'Activer'}
        >
          <span className="absolute rounded-full transition-all duration-300" style={{ width: 12, height: 12, left: actif ? 20 : 3, background: actif ? tokens.success.text : 'rgba(255,255,255,0.3)', boxShadow: actif ? '0 0 6px rgba(52,211,153,0.8)' : 'none' }} />
        </button>
      </td>
      <td className="px-5 py-3.5" style={colSep}>
        {assignedVendor ? (
          <span className="text-xs truncate max-w-[120px]" style={{ color: tokens.text.secondary }}>{assignedVendor.first_name} {assignedVendor.last_name}</span>
        ) : (
          <span className="text-xs" style={{ color: tokens.text.quaternary }}>Admin</span>
        )}
      </td>
    </tr>
  );
});

export default CrmTableRow;
