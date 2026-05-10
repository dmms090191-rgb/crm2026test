import { Mail, Phone, ChevronDown, LogIn, MessageCircle, CalendarClock, Undo2, Redo2, CheckCircle2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getStatutCfg, FALLBACK_COLOR, getInitials, gradients } from './utils';
import CheckBox from './CheckBox';
import type { ImportedLead, StatutDef, Vendor, ImpersonatedClient, ChatLead } from './types';

interface Props {
  lead: ImportedLead;
  index: number;
  statutDefs: StatutDef[];
  vendors: Vendor[];
  isSelected: boolean;
  workModeEnabled: boolean;
  workModeActiveId: string | null;
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
  onDetail: (lead: ImportedLead, index: number) => void;
  onOpenChat?: (lead: ChatLead) => void;
  onOpenRdv?: (lead: ChatLead) => void;
  onConnectAsClient?: (client: ImpersonatedClient) => void;
  cardRef: (el: HTMLDivElement | null) => void;
}

export default function CrmMobileLeadCard({
  lead, index, statutDefs, vendors, isSelected, workModeEnabled, workModeActiveId,
  workHistoryLength, workHistoryPosition, canUndo, canRedo,
  onWorkSelect, onWorkUndo, onWorkRedo, onToggle, onStatutChange,
  onToggleActif, onDetail, onOpenChat, onOpenRdv, onConnectAsClient, cardRef,
}: Props) {
  const tokens = useThemeTokens();
  const nom = lead.data['Nom'] ?? '';
  const prenom = lead.data['Prenom'] ?? '';
  const email = lead.data['Email'] ?? '';
  const tel = lead.data['Telephone'] ?? '';
  const statut = lead.statut ?? '';
  const statutDef = statutDefs.find(s => s.nom === statut);
  const cfg = getStatutCfg(statutDef?.couleur ?? FALLBACK_COLOR);
  const initials = getInitials(nom, prenom);
  const grad = gradients[index % gradients.length];
  const assignedVendor = lead.vendor_id ? vendors.find(v => v.id === lead.vendor_id) : null;
  const actif = lead.actif !== false;
  const isWorkActive = workModeEnabled && workModeActiveId === lead.id;

  return (
    <div ref={cardRef} data-row-id={lead.id} className="px-3 py-3" style={{ borderColor: tokens.table.rowBorder, background: isSelected ? tokens.table.rowSelected : isWorkActive ? 'rgba(249,115,22,0.04)' : 'transparent' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {workModeEnabled ? (
            <>
              <button
                onClick={() => onWorkSelect(lead.id)}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0"
                style={isWorkActive
                  ? { background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)' }
                  : { background: tokens.input.bg, border: `1px solid ${tokens.input.border}` }
                }
              >
                {isWorkActive && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#f97316' }} />}
              </button>
              {isWorkActive && workHistoryLength > 0 && (
                <div className="flex items-center gap-0.5">
                  <button onClick={onWorkUndo} disabled={!canUndo} className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30" style={{ color: '#f97316' }}><Undo2 className="w-3 h-3" /></button>
                  <span className="text-[9px] font-semibold tabular-nums" style={{ color: '#f97316' }}>{workHistoryPosition}/{workHistoryLength}</span>
                  <button onClick={onWorkRedo} disabled={!canRedo} className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30" style={{ color: '#f97316' }}><Redo2 className="w-3 h-3" /></button>
                </div>
              )}
            </>
          ) : (
            <CheckBox checked={isSelected} onChange={() => onToggle(lead.id)} />
          )}
        </div>
        <span className="text-[10px] tabular-nums font-medium" style={{ color: tokens.table.indexText }}>#{index + 1}</span>
      </div>
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: grad, boxShadow: '0 2px 6px rgba(0,0,0,0.3)', color: tokens.text.primary }}>{initials || '?'}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: tokens.table.cellText }}>{prenom} {nom}</p>
          {email && (
            <div className="flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
              <span className="text-[11px] truncate" style={{ color: tokens.table.cellTextMuted }}>{email}</span>
            </div>
          )}
          {tel && (
            <div className="flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
              <span className="text-[11px]" style={{ color: tokens.table.cellTextMuted }}>{tel}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2 text-[11px]" style={{ color: tokens.text.quaternary }}>
        <div className="flex items-center gap-1.5">
          <span>Statut</span>
          <div className="relative inline-flex items-center">
            <span className="pointer-events-none absolute left-1.5 w-1.5 h-1.5 rounded-full z-10" style={{ background: statut ? cfg.dot : 'rgba(148,163,184,0.5)', boxShadow: statut ? `0 0 4px ${cfg.dot}` : 'none' }} />
            <select
              value={statut}
              onChange={e => onStatutChange(lead.id, e.target.value)}
              className="rounded-md text-[11px] font-semibold pl-4 pr-5 py-0.5 focus:outline-none cursor-pointer appearance-none"
              style={{ background: statut ? cfg.bg : 'rgba(148,163,184,0.08)', color: statut ? cfg.color : 'rgba(148,163,184,0.7)', border: `1px solid ${statut ? cfg.border : 'rgba(148,163,184,0.18)'}` }}
            >
              <option value="" style={{ background: tokens.selectBg }}>Sans statut</option>
              {statutDefs.map(s => (<option key={s.id} value={s.nom} style={{ background: tokens.selectBg }}>{s.nom}</option>))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 w-2.5 h-2.5" style={{ color: statut ? cfg.color : 'rgba(148,163,184,0.5)' }} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Vendeur</span>
          <span style={{ color: tokens.text.secondary }}>{assignedVendor ? `${assignedVendor.first_name} ${assignedVendor.last_name}` : 'Admin'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Acces</span>
          <button
            onClick={() => onToggleActif(lead.id, actif)}
            className="relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none"
            style={{ width: 32, height: 18, background: actif ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)', border: actif ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.1)' }}
            title={actif ? 'Desactiver' : 'Activer'}
          >
            <span className="absolute rounded-full transition-all duration-300" style={{ width: 10, height: 10, left: actif ? 18 : 3, background: actif ? tokens.success.text : 'rgba(255,255,255,0.3)', boxShadow: actif ? '0 0 6px rgba(52,211,153,0.8)' : 'none' }} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => onDetail(lead, index)} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}>
          <ChevronDown className="w-3 h-3" />Details
        </button>
        <button onClick={() => onOpenChat?.({ id: lead.id, nom, prenom, email, tel })} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ background: tokens.warning.bg, border: `1px solid ${tokens.warning.border}`, color: tokens.warning.text }}>
          <MessageCircle className="w-3 h-3" />Msg
        </button>
        <button onClick={() => onOpenRdv?.({ id: lead.id, nom, prenom, email, tel })} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', color: '#22d3ee' }}>
          <CalendarClock className="w-3 h-3" />RDV
        </button>
        <button onClick={() => onConnectAsClient?.({ id: lead.id, nom, prenom, email })} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}>
          <LogIn className="w-3 h-3" />Connect
        </button>
      </div>
    </div>
  );
}