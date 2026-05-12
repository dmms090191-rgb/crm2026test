import { Mail, Phone, ChevronDown, LogIn, MessageCircle, CalendarClock, Undo2, Redo2, CheckCircle2, Calendar } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { getInitials, gradients } from '../../../admin/views/crm/utils';
import CheckBox from '../../../admin/views/crm/CheckBox';
import StatutSelect from '../../../admin/views/crm/StatutSelect';
import type { ImportedLead, StatutDef } from '../vendorLeadsTypes';

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
  onToggle: (id: string) => void;
  onStatutChange: (id: string, statut: string) => void;
  onToggleActif: (id: string, current: boolean) => void;
  onDetail: (lead: ImportedLead, index: number) => void;
  onOpenChat?: (ref: { id: string; nom: string; prenom: string; email: string; tel: string }) => void;
  onOpenRdv?: (ref: { id: string; nom: string; prenom: string; email: string; tel: string }) => void;
  onConnectAsClient?: (ref: { id: string; nom: string; prenom: string; email: string }) => void;
  selectMode?: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
}

export default function VendorLeadMobileCard({
  lead, index, statutDefs, timezone, isSelected, workModeEnabled, workModeActiveId,
  workHistoryLength, workHistoryPosition, canUndo, canRedo,
  onWorkSelect, onWorkUndo, onWorkRedo, onToggle, onStatutChange,
  onToggleActif, onDetail, onOpenChat, onOpenRdv, onConnectAsClient, selectMode, cardRef,
}: Props) {
  const tokens = useThemeTokens();
  const nom = lead.data['Nom'] ?? '';
  const prenom = lead.data['Prenom'] ?? '';
  const email = lead.data['Email'] ?? '';
  const tel = lead.data['Telephone'] ?? '';
  const statut = lead.statut || 'Nouveau';
  const initials = getInitials(nom, prenom);
  const grad = gradients[index % gradients.length];
  const actif = lead.actif !== false;
  const isWorkActive = workModeEnabled && workModeActiveId === lead.id;

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
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
            <span className="text-xs truncate" style={{ color: tokens.table.cellTextMuted }}>{email}</span>
          </div>
        )}
        {tel && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
            <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{tel}</span>
          </div>
        )}
      </div>

      {/* Metadata: Statut, Date, Acces */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-[11px]" style={{ color: tokens.text.quaternary }}>
        <div className="flex items-center gap-1.5">
          <StatutSelect value={statut} statutDefs={statutDefs} onChange={v => onStatutChange(lead.id, v)} size="sm" tokens={tokens} />
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
            style={{ width: 34, height: 18, background: actif ? tokens.success.bg : tokens.surface.hover, border: actif ? `1px solid ${tokens.success.border}` : `1px solid ${tokens.surface.borderLight}` }}
            title={actif ? 'Desactiver' : 'Activer'}
          >
            <span className="absolute rounded-full transition-all duration-300" style={{ width: 10, height: 10, left: actif ? 20 : 3, background: actif ? tokens.success.text : tokens.text.quaternary, boxShadow: actif ? `0 0 6px ${tokens.success.text}` : 'none' }} />
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
    </div>
  );
}
