import { forwardRef } from 'react';
import { Phone, Mail, ChevronDown, LogIn, MessageCircle, CalendarClock, CheckCircle2, Undo2, Redo2 } from 'lucide-react';
import type { ImportedLead, Vendor, StatutDef, ImpersonatedClient, ChatLead } from './types';
import type { ThemeTokens } from '../../../../lib/themeTokens';
import { getStatutCfg, FALLBACK_COLOR, getInitials, gradients } from './utils';
import CheckBox from './CheckBox';

interface Props {
  lead: ImportedLead;
  index: number;
  isSelected: boolean;
  statutDefs: StatutDef[];
  vendors: Vendor[];
  tokens: ThemeTokens;
  colSep: React.CSSProperties;
  onToggle: (id: string) => void;
  onStatutChange: (id: string, statut: string) => void;
  onToggleActif: (id: string, current: boolean) => void;
  onDetail: (lead: ImportedLead, index: number) => void;
  onConnectAsClient?: (client: ImpersonatedClient) => void;
  onOpenChat?: (lead: ChatLead) => void;
  onOpenRdv?: (lead: ChatLead) => void;
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

const CrmTableRow = forwardRef<HTMLTableRowElement, Props>(function CrmTableRow({ lead, index, isSelected, statutDefs, vendors, tokens, colSep, onToggle, onStatutChange, onToggleActif, onDetail, onConnectAsClient, onOpenChat, onOpenRdv, workModeEnabled, isWorkActive, onWorkSelect, onWorkUndo, onWorkRedo, canWorkUndo, canWorkRedo, workHistoryPosition, workHistoryLength }, ref) {
  const nom = lead.data['Nom'] ?? '';
  const prenom = lead.data['Prenom'] ?? '';
  const email = lead.data['Email'] ?? '';
  const tel = lead.data['Telephone'] ?? '';
  const statut = lead.statut ?? '';
  const statutDef = statutDefs.find(s => s.nom === statut);
  const cfg = getStatutCfg(statutDef?.couleur ?? FALLBACK_COLOR);
  const initials = getInitials(nom, prenom);
  const grad = gradients[index % gradients.length];
  const actif = lead.actif !== false;
  const assignedVendor = lead.vendor_id ? vendors.find(v => v.id === lead.vendor_id) : null;

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
      <td className="px-3 py-3.5 w-28" style={colSep}>
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
      <td className="px-5 py-3.5 text-xs tabular-nums" style={{ ...colSep, color: tokens.table.indexText }}>{index + 1}</td>
      <td className="px-5 py-3.5" style={colSep}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: grad, boxShadow: '0 2px 6px rgba(0,0,0,0.3)', color: tokens.text.primary }}>{initials || '?'}</div>
          <span className="text-sm font-semibold" style={{ color: tokens.table.cellText }}>{nom || '\u2014'}</span>
        </div>
      </td>
      <td className="px-5 py-3.5" style={colSep}><span className="text-sm" style={{ color: tokens.text.secondary }}>{prenom || '\u2014'}</span></td>
      <td className="px-5 py-3.5" style={colSep}>
        <div className="flex items-center gap-1.5">
          <Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
          <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{email || '\u2014'}</span>
        </div>
      </td>
      <td className="px-5 py-3.5" style={colSep}>
        <div className="flex items-center gap-1.5">
          <Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
          <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{tel || '\u2014'}</span>
        </div>
      </td>
      <td className="px-5 py-3.5" style={colSep}>
        <div className="relative inline-flex items-center">
          <span className="pointer-events-none absolute left-2 w-1.5 h-1.5 rounded-full flex-shrink-0 z-10" style={{ background: statut ? cfg.dot : 'rgba(148,163,184,0.5)', boxShadow: statut ? `0 0 4px ${cfg.dot}` : 'none' }} />
          <select
            value={statut}
            onChange={e => onStatutChange(lead.id, e.target.value)}
            className="rounded-lg text-xs font-semibold pl-5 pr-6 py-1 focus:outline-none cursor-pointer appearance-none"
            style={{ background: statut ? cfg.bg : 'rgba(148,163,184,0.08)', color: statut ? cfg.color : 'rgba(148,163,184,0.7)', border: `1px solid ${statut ? cfg.border : 'rgba(148,163,184,0.18)'}` }}
          >
            <option value="" style={{ background: tokens.selectBg }}>Sans statut</option>
            {statutDefs.map(s => (<option key={s.id} value={s.nom} style={{ background: tokens.selectBg }}>{s.nom}</option>))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 w-3 h-3" style={{ color: statut ? cfg.color : 'rgba(148,163,184,0.5)' }} />
        </div>
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
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)', color: tokens.text.primary }}>
              {`${assignedVendor.first_name?.[0] ?? ''}${assignedVendor.last_name?.[0] ?? ''}`.toUpperCase() || '?'}
            </div>
            <span className="text-xs truncate max-w-[100px]" style={{ color: tokens.text.secondary }}>{assignedVendor.first_name} {assignedVendor.last_name}</span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: tokens.text.quaternary }}>Admin</span>
        )}
      </td>
    </tr>
  );
});

export default CrmTableRow;
