import { useState } from 'react';
import { Mail, Phone, ChevronDown, LogIn, MessageCircle, CalendarClock, Undo2, Redo2, CheckCircle2, Calendar, User, RotateCcw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getInitials, gradients, getStatutCfg, FALLBACK_COLOR } from './utils';
import CheckBox from './CheckBox';
import MobileStatutModal from './MobileStatutModal';
import CopyButton from '../../../../components/CopyButton';
import type { ImportedLead, StatutDef, Vendor, ImpersonatedClient, ChatLead } from './types';

function formatImportedAtShort(isoDate: string, tz: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: tz });
  } catch { return isoDate.slice(0, 10); }
}

interface Props {
  lead: ImportedLead;
  index: number;
  statutDefs: StatutDef[];
  vendors: Vendor[];
  timezone: string;
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
  onWorkReset: () => void;
  onToggle: (id: string) => void;
  onStatutChange: (id: string, statut: string) => void;
  onToggleActif: (id: string, current: boolean) => void;
  onDetail: (lead: ImportedLead, index: number) => void;
  onOpenChat?: (lead: ChatLead) => void;
  onOpenRdv?: (lead: ChatLead) => void;
  onConnectAsClient?: (client: ImpersonatedClient) => void;
  selectMode?: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
}

export default function CrmMobileLeadCard({
  lead, index, statutDefs, vendors, timezone, isSelected, workModeEnabled, workModeActiveId,
  workHistoryLength, workHistoryPosition, canUndo, canRedo,
  onWorkSelect, onWorkUndo, onWorkRedo, onWorkReset, onToggle, onStatutChange,
  onToggleActif, onDetail, onOpenChat, onOpenRdv, onConnectAsClient, selectMode, cardRef,
}: Props) {
  const tokens = useThemeTokens();
  const [statutModalOpen, setStatutModalOpen] = useState(false);
  const nom = lead.data['Nom'] ?? '';
  const prenom = lead.data['Prenom'] ?? '';
  const email = lead.data['Email'] ?? '';
  const tel = lead.data['Telephone'] ?? '';
  const statut = lead.statut || 'Nouveau';
  const initials = getInitials(nom, prenom);
  const grad = gradients[index % gradients.length];
  const assignedVendor = lead.vendor_id ? vendors.find(v => v.id === lead.vendor_id) : null;
  const actif = lead.actif !== false;
  const isWorkActive = workModeEnabled && workModeActiveId === lead.id;
  const isNeutral = statut === 'Nouveau';
  const statutDef = statutDefs.find(s => s.nom === statut);
  const statutCfg = getStatutCfg(statutDef?.couleur ?? FALLBACK_COLOR, isNeutral);
  const statutLabel = statut === 'Nouveau' ? 'Sans statut' : statut;

  return (
    <div
      ref={cardRef}
      data-row-id={lead.id}
      className="px-4 py-4"
      style={{
        borderColor: tokens.table.rowBorder,
        background: isSelected ? tokens.table.rowSelected : isWorkActive ? 'rgba(249,115,22,0.04)' : 'transparent',
      }}
    >
      {/* Header: Avatar + Name + Index + Work mode */}
      <div className="flex items-center gap-3 mb-3">
        {workModeEnabled ? (
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
        ) : selectMode ? (
          <CheckBox checked={isSelected} onChange={() => onToggle(lead.id)} />
        ) : null}

        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: grad, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', color: '#fff' }}>
          {initials || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: tokens.table.cellText }}>{prenom} {nom}</p>
          {isWorkActive && workHistoryLength > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <button onClick={onWorkUndo} disabled={!canUndo} className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30" style={{ color: '#f97316' }}><Undo2 className="w-3 h-3" /></button>
              <span className="text-[9px] font-semibold tabular-nums" style={{ color: '#f97316' }}>{workHistoryPosition}/{workHistoryLength}</span>
              <button onClick={onWorkRedo} disabled={!canRedo} className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-30" style={{ color: '#f97316' }}><Redo2 className="w-3 h-3" /></button>
              <button onClick={onWorkReset} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: '#f97316' }} title="Reinitialiser"><RotateCcw className="w-2.5 h-2.5" /></button>
            </div>
          )}
        </div>

        <span
          className="text-[11px] tabular-nums font-bold self-start px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{ color: tokens.accent.text, background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}` }}
        >#{index + 1}</span>
      </div>

      {/* Contact info */}
      <div className="rounded-xl px-3 py-2.5 mb-3 space-y-1.5" style={{ background: tokens.surface.hover }}>
        {email && (
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
            <span className="text-xs truncate flex-1 min-w-0" style={{ color: tokens.table.cellTextMuted }}>{email}</span>
            <CopyButton value={email} />
          </div>
        )}
        {tel && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
            <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{tel}</span>
          </div>
        )}
      </div>

      {/* Metadata: Statut, Vendeur, Date, Acces */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-[11px]" style={{ color: tokens.text.quaternary }}>
        <button
          type="button"
          onClick={() => setStatutModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
          style={{ background: statutCfg.bg, border: `1px solid ${statutCfg.border}`, color: statutCfg.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statutCfg.dot, boxShadow: `0 0 4px ${statutCfg.dot}` }} />
          {statutLabel}
          <ChevronDown className="w-2.5 h-2.5" />
        </button>

        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3" style={{ color: tokens.text.quaternary }} />
          <span style={{ color: tokens.text.secondary }}>{assignedVendor ? `${assignedVendor.first_name} ${assignedVendor.last_name}` : 'Admin'}</span>
        </div>

        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span className="tabular-nums" style={{ color: tokens.text.secondary }}>{formatImportedAtShort(lead.imported_at, timezone)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span>Acces</span>
          <button
            onClick={() => onToggleActif(lead.id, actif)}
            className="relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none"
            style={{ width: 34, height: 18, background: actif ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)', border: actif ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.1)' }}
            title={actif ? 'Desactiver' : 'Activer'}
          >
            <span className="absolute rounded-full transition-all duration-300" style={{ width: 10, height: 10, left: actif ? 20 : 3, background: actif ? tokens.success.text : 'rgba(255,255,255,0.3)', boxShadow: actif ? '0 0 6px rgba(52,211,153,0.8)' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => onDetail(lead, index)} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}>
          <ChevronDown className="w-3 h-3" />Detail
        </button>
        <button onClick={() => onOpenChat?.({ id: lead.id, nom, prenom, email, tel })} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95" style={{ background: tokens.warning.bg, border: `1px solid ${tokens.warning.border}`, color: tokens.warning.text }}>
          <MessageCircle className="w-3 h-3" />Msg
        </button>
        <button onClick={() => onOpenRdv?.({ id: lead.id, nom, prenom, email, tel })} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', color: '#22d3ee' }}>
          <CalendarClock className="w-3 h-3" />RDV
        </button>
        <button onClick={() => onConnectAsClient?.({ id: lead.id, nom, prenom, email })} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95" style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}>
          <LogIn className="w-3 h-3" />Connect
        </button>
      </div>

      {statutModalOpen && (
        <MobileStatutModal
          currentStatut={statut}
          statutDefs={statutDefs}
          onSelect={v => onStatutChange(lead.id, v)}
          onClose={() => setStatutModalOpen(false)}
        />
      )}
    </div>
  );
}
