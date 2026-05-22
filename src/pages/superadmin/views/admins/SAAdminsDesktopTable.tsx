import { ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import CopyButton from '../../../../components/CopyButton';
import SAAdminsAccessSwitch from './SAAdminsAccessSwitch';
import type { AdminUser } from '../SAAdmins';

interface Props {
  admins: AdminUser[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  currentUserId: string | null;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onMoveAdmin: (id: string, dir: 'up' | 'down') => void;
  onOpenActions: (id: string) => void;
  onAccessToggled: () => void;
  formatDate: (d: string | null) => string;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
  actionsBtnRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
}

export default function SAAdminsDesktopTable({
  admins, selectionMode, selectedIds, currentUserId, allSelected,
  onToggleSelectAll, onToggleSelect, onMoveAdmin, onOpenActions, onAccessToggled,
  formatDate, tokens, actionsBtnRefs,
}: Props) {
  const TABLE_COLS = selectionMode
    ? ['', 'Prenom', 'Nom', 'Email', 'Societe', 'Telephone', 'Role', 'Cree le', 'Acces', 'Actions']
    : ['Prenom', 'Nom', 'Email', 'Societe', 'Telephone', 'Role', 'Cree le', 'Acces', 'Actions'];

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full table-auto" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${tokens.table.headerBorder}` }}>
            {selectionMode && (
              <th className="px-3 py-3 w-10" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}>
                <input type="checkbox" data-testid="admins-select-all-checkbox" checked={allSelected} onChange={onToggleSelectAll} className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
              </th>
            )}
            {TABLE_COLS.filter(c => c !== '').map((col, ci) => (
              <th key={col} className={`px-3 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase ${col === 'Actions' ? 'whitespace-nowrap' : ''}`} style={{ color: tokens.table.headerText, borderRight: ci < TABLE_COLS.filter(c => c !== '').length - 1 ? `1px solid ${tokens.table.rowBorder}` : 'none' }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {admins.map((admin, idx) => {
            const isSelf = admin.id === currentUserId;
            return (
              <tr key={admin.id} data-row-id={admin.id} data-testid="admin-row" className="group transition-all duration-150" style={{ borderBottom: idx < admins.length - 1 ? `1px solid ${tokens.table.rowBorder}` : 'none' }}>
                {selectionMode && (
                  <td className="px-3 py-3.5" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}>
                    {isSelf ? <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8' }}>vous</span> : (
                      <input type="checkbox" data-testid="admin-row-checkbox" checked={selectedIds.has(admin.id)} onChange={() => onToggleSelect(admin.id)} className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
                    )}
                  </td>
                )}
                <td className="px-3 py-3.5" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}><span className="text-sm font-medium" style={{ color: tokens.table.cellText }}>{admin.first_name || '\u2014'}</span></td>
                <td className="px-3 py-3.5" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}><span className="text-sm font-medium" style={{ color: tokens.table.cellText }}>{admin.last_name || '\u2014'}</span></td>
                <td className="px-3 py-3.5" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}>
                  <div className="flex items-center gap-1"><span className="text-sm truncate max-w-[180px]" style={{ color: tokens.table.cellTextMuted }}>{admin.email || '\u2014'}</span>{admin.email && <CopyButton value={admin.email} />}</div>
                </td>
                <td className="px-3 py-3.5" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}><span className="text-sm" style={{ color: tokens.table.cellTextMuted }}>{admin.company || '\u2014'}</span></td>
                <td className="px-3 py-3.5" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}><span className="text-sm" style={{ color: tokens.table.cellTextMuted }}>{admin.phone || '\u2014'}</span></td>
                <td className="px-3 py-3.5" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}><span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{admin.role}</span></td>
                <td className="px-3 py-3.5 whitespace-nowrap" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}><span className="text-sm" style={{ color: tokens.table.cellTextMuted }}>{formatDate(admin.created_at)}</span></td>
                <td className="px-3 py-3.5 whitespace-nowrap" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}><SAAdminsAccessSwitch adminId={admin.id} enabled={admin.access_enabled} onToggled={onAccessToggled} /></td>
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col gap-0.5 mr-1">
                      <button onClick={() => onMoveAdmin(admin.id, 'up')} disabled={idx === 0} className="w-5 h-5 rounded flex items-center justify-center transition-all disabled:opacity-20" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }} title="Monter"><ChevronUp className="w-3 h-3" /></button>
                      <button onClick={() => onMoveAdmin(admin.id, 'down')} disabled={idx === admins.length - 1} className="w-5 h-5 rounded flex items-center justify-center transition-all disabled:opacity-20" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }} title="Descendre"><ChevronDown className="w-3 h-3" /></button>
                    </div>
                    <button
                      ref={el => { actionsBtnRefs.current[admin.id] = el; }}
                      onClick={() => onOpenActions(admin.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                      style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                      Actions
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
