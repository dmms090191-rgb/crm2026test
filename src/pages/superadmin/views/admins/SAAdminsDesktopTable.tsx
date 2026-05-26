import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, GripVertical, MoreHorizontal, User, Mail, Building2, Phone, Shield, CalendarDays, Lock, Settings, ExternalLink, Bot } from 'lucide-react';
import CopyButton from '../../../../components/CopyButton';
import SAAdminsAccessSwitch from './SAAdminsAccessSwitch';
import SAAdminsAiSwitch from './SAAdminsAiSwitch';
import type { AdminUser } from '../SAAdmins';
import type { ColumnDef } from '../../../../components/table/useColumnOrder';

interface Props {
  admins: AdminUser[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  currentUserId: string | null;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onMoveAdmin: (id: string, dir: 'up' | 'down') => void;
  onReorderDrop: (fromIdx: number, toIdx: number) => void;
  reorderMode: boolean;
  onOpenActions: (id: string) => void;
  onAccessToggled: () => void;
  formatDate: (d: string | null) => string;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
  actionsBtnRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  columnOrder: string[];
  customColumnDefs?: ColumnDef[];
  getCustomValues?: (adminId: string) => Record<string, string>;
  labelOverrides?: Record<string, string>;
}

const HEADER_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  prenom: User, nom: User, email: Mail, societe: Building2, telephone: Phone,
  role: Shield, cree_le: CalendarDays, acces: Lock, actions: Settings, ia: Bot,
};

const HEADER_LABELS: Record<string, string> = {
  prenom: 'Prenom', nom: 'Nom', email: 'Email', societe: 'Societe', telephone: 'Telephone',
  role: 'Role', cree_le: 'Cree le', acces: 'Acces', actions: 'Actions', ia: 'IA',
};

export default function SAAdminsDesktopTable({
  admins, selectionMode, selectedIds, currentUserId, allSelected,
  onToggleSelectAll, onToggleSelect, onMoveAdmin, onReorderDrop, reorderMode,
  onOpenActions, onAccessToggled, formatDate, tokens, actionsBtnRefs, columnOrder,
  customColumnDefs, getCustomValues, labelOverrides,
}: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragRef.current = idx;
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = dragRef.current;
    if (fromIdx !== null && fromIdx !== toIdx) onReorderDrop(fromIdx, toIdx);
    setDragIdx(null); setOverIdx(null); dragRef.current = null;
  };

  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); dragRef.current = null; };

  function renderCell(key: string, admin: AdminUser) {
    switch (key) {
      case 'prenom': return <span className="text-[13px] font-semibold" style={{ color: tokens.table.cellText }}>{admin.first_name || '\u2014'}</span>;
      case 'nom': return <span className="text-[13px] font-medium" style={{ color: tokens.table.cellText }}>{admin.last_name || '\u2014'}</span>;
      case 'email': return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: tokens.surface.secondary }}>
            <Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
            <span className="text-xs truncate max-w-[180px]" style={{ color: tokens.table.cellTextMuted }}>{admin.email || '\u2014'}</span>
          </div>
          {admin.email && <CopyButton value={admin.email} />}
        </div>
      );
      case 'societe': return <span className="text-[13px]" style={{ color: tokens.table.cellTextMuted }}>{admin.company || '\u2014'}</span>;
      case 'telephone': return admin.phone ? (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: tokens.surface.secondary }}>
          <Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
          <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{admin.phone}</span>
        </div>
      ) : <span className="text-xs" style={{ color: tokens.text.quaternary }}>{'\u2014'}</span>;
      case 'role': return (
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 rounded-full whitespace-nowrap tracking-wider"
          style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}`, boxShadow: `0 1px 3px ${tokens.accent.bg}` }}
        >
          <Shield className="w-2.5 h-2.5" />{admin.role}
        </span>
      );
      case 'cree_le': return <span className="text-xs tabular-nums font-medium whitespace-nowrap" style={{ color: tokens.table.cellTextMuted }}>{formatDate(admin.created_at)}</span>;
      case 'acces': return <SAAdminsAccessSwitch adminId={admin.id} enabled={admin.access_enabled} onToggled={onAccessToggled} />;
      case 'ia': return <SAAdminsAiSwitch companyId={admin.company_id} enabled={admin.ai_enabled} onToggled={onAccessToggled} />;
      case 'actions': return (
        <button
          ref={el => { actionsBtnRefs.current[admin.id] = el; }}
          onClick={() => onOpenActions(admin.id)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
          style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
          onMouseEnter={e => { e.currentTarget.style.background = tokens.accent.bgHover; e.currentTarget.style.boxShadow = `0 2px 8px ${tokens.accent.bg}`; }}
          onMouseLeave={e => { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />Actions
        </button>
      );
      default: {
        const customDef = customColumnDefs?.find(c => c.key === key);
        const vals = getCustomValues?.(admin.id);
        const val = vals?.[key] ?? '';
        if (customDef?.fieldType === 'url' && val) {
          const href = val.match(/^https?:\/\//) ? val : `https://${val}`;
          return (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200"
              style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}
              onMouseEnter={e => { e.currentTarget.style.background = tokens.accent.bgHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = tokens.accent.bg; }}
            >
              <ExternalLink className="w-3 h-3" />Lien
            </a>
          );
        }
        return <span className="text-xs" style={{ color: val ? tokens.table.cellTextMuted : tokens.text.quaternary }}>{val || '\u2014'}</span>;
      }
    }
  }

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr style={{ background: tokens.table.headerBg }}>
            {reorderMode && <th className="w-10 px-3 py-4" />}
            {selectionMode && (
              <th className="w-12 px-4 py-4">
                <input type="checkbox" data-testid="admins-select-all-checkbox" checked={allSelected} onChange={onToggleSelectAll} className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
              </th>
            )}
            {columnOrder.map(key => {
              const Icon = HEADER_ICONS[key];
              const label = labelOverrides?.[key] || (HEADER_LABELS[key] ?? key);
              return (
                <th key={key} className="px-5 py-4 text-left" style={{ borderBottom: `2px solid ${tokens.accent.solid}` }}>
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-3 h-3 flex-shrink-0" style={{ color: tokens.accent.text, opacity: 0.6 }} />}
                    <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: tokens.table.headerText }}>{label}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {admins.map((admin, idx) => {
            const isSelf = admin.id === currentUserId;
            const isDragging = dragIdx === idx;
            const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
            const isSelected = selectedIds.has(admin.id);
            const isEven = idx % 2 === 0;

            return (
              <tr
                key={admin.id}
                data-row-id={admin.id}
                data-testid="admin-row"
                draggable={reorderMode}
                onDragStart={reorderMode ? e => handleDragStart(e, idx) : undefined}
                onDragOver={reorderMode ? e => handleDragOver(e, idx) : undefined}
                onDrop={reorderMode ? e => handleDrop(e, idx) : undefined}
                onDragEnd={reorderMode ? handleDragEnd : undefined}
                className="group transition-all duration-200"
                style={{
                  opacity: isDragging ? 0.35 : 1,
                  borderTop: isOver ? `2px solid ${tokens.accent.solid}` : undefined,
                  background: isSelected ? tokens.table.rowSelected : isEven ? 'transparent' : tokens.surface.secondary,
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = tokens.table.rowHover;
                    e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${tokens.surface.border}`;
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isSelected ? tokens.table.rowSelected : isEven ? 'transparent' : tokens.surface.secondary;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {reorderMode && (
                  <td className="px-3 py-5" style={{ cursor: 'grab' }}>
                    <div className="flex items-center gap-1">
                      <GripVertical className="w-4 h-4" style={{ color: tokens.text.quaternary }} />
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => onMoveAdmin(admin.id, 'up')} disabled={idx === 0} className="w-5 h-5 rounded-md flex items-center justify-center transition-all disabled:opacity-20" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={() => onMoveAdmin(admin.id, 'down')} disabled={idx === admins.length - 1} className="w-5 h-5 rounded-md flex items-center justify-center transition-all disabled:opacity-20" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}><ChevronDown className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </td>
                )}
                {selectionMode && (
                  <td className="px-4 py-5">
                    {isSelf ? (
                      <span className="inline-flex items-center text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tokens.surface.tertiary, color: tokens.text.quaternary }}>vous</span>
                    ) : (
                      <input type="checkbox" data-testid="admin-row-checkbox" checked={isSelected} onChange={() => onToggleSelect(admin.id)} className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
                    )}
                  </td>
                )}
                {columnOrder.map(key => (
                  <td key={key} className="px-5 py-5 whitespace-nowrap">
                    {renderCell(key, admin)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
