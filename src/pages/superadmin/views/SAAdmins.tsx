import { useState, useCallback, useEffect } from 'react';
import { List, ChevronDown, LogIn, Mail, Phone, Calendar, Plus, RefreshCw, MessageSquare, Trash2, X, Home } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import CopyButton from '../../../components/CopyButton';
import AdminDetailModal from './admins/AdminDetailModal';
import SAAdminsCreateModal from './admins/SAAdminsCreateModal';
import SAAdminsAccessSwitch from './admins/SAAdminsAccessSwitch';
import SAAdminsBulkDeleteModal from './admins/SAAdminsBulkDeleteModal';
import AdminHomePageModal from './admins/AdminHomePageModal';
import { supabase } from '../../../lib/supabase';

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  pin: string;
  company: string;
  company_id: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  access_enabled: boolean;
}

interface SAAdminsProps {
  onConnectAsAdmin?: (admin: AdminUser) => void;
  onOpenChat?: (admin: AdminUser) => void;
  cachedAdmins?: AdminUser[];
  refreshing?: boolean;
  cachedError?: string;
  onRefresh?: () => void;
}

export default function SAAdmins({ onConnectAsAdmin, onOpenChat, cachedAdmins, refreshing, cachedError, onRefresh }: SAAdminsProps) {
  const tokens = useThemeTokens();
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [homePageAdmin, setHomePageAdmin] = useState<AdminUser | null>(null);

  const admins = cachedAdmins || [];
  const loading = refreshing ?? false;
  const error = cachedError || '';

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const fetchAdmins = useCallback(() => { onRefresh?.(); }, [onRefresh]);
  const handleUpdate = useCallback(() => { fetchAdmins(); }, [fetchAdmins]);

  const selectableAdmins = admins.filter(a => a.id !== currentUserId);
  const allSelected = selectableAdmins.length > 0 && selectableAdmins.every(a => selectedIds.has(a.id));

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (allSelected) { setSelectedIds(new Set()); }
    else { setSelectedIds(new Set(selectableAdmins.map(a => a.id))); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-admins`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ admin_ids: Array.from(selectedIds) }),
        }
      );
      if (res.ok) {
        setSelectedIds(new Set());
        setSelectionMode(false);
        fetchAdmins();
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }, [selectedIds, fetchAdmins]);

  const formatDate = (d: string | null) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const TABLE_COLS = selectionMode
    ? ['', 'Prenom', 'Nom', 'Email', 'Societe', 'Telephone', 'Role', 'Cree le', 'Acces', 'Actions']
    : ['Prenom', 'Nom', 'Email', 'Societe', 'Telephone', 'Role', 'Cree le', 'Acces', 'Actions'];

  return (
    <div className="p-4 md:p-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>Liste admins</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.input.placeholder }}>{admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectionMode ? (
            <>
              <button data-testid="admins-cancel-selection-button" onClick={exitSelectionMode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}>
                <X className="w-3.5 h-3.5" />Annuler
              </button>
              <button data-testid="admins-select-all-button" onClick={toggleSelectAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}>
                {allSelected ? 'Tout deselectionner' : 'Tout'}
              </button>
              {selectedIds.size > 0 && (
                <button data-testid="admins-delete-selected-button" onClick={() => setShowDeleteModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 text-white" style={{ background: '#ef4444', boxShadow: '0 2px 12px rgba(239,68,68,0.3)' }}>
                  <Trash2 className="w-3.5 h-3.5" />Supprimer selection ({selectedIds.size})
                </button>
              )}
            </>
          ) : (
            <>
              <button data-testid="admins-delete-mode-button" onClick={enterSelectionMode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}>
                <Trash2 className="w-3.5 h-3.5" />Selection
              </button>
              <button onClick={fetchAdmins} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Actualiser
              </button>
              <button onClick={() => setShowCreateModal(true)} data-testid="create-admin-button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 2px 12px rgba(245,158,11,0.3)' }}>
                <Plus className="w-3.5 h-3.5" />Creer un admin
              </button>
            </>
          )}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: tokens.accent.bg, boxShadow: `0 0 16px ${tokens.accent.border}` }}>
            <List className="w-4 h-4" style={{ color: tokens.accent.text }} />
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</div>
      )}

      <div className="rounded-2xl overflow-hidden" data-testid="admins-list" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
        {admins.length === 0 && loading ? (
          <div className="hidden md:block overflow-x-hidden">
            <table className="w-full table-auto" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead><tr style={{ borderBottom: `1px solid ${tokens.table.headerBorder}` }}>{TABLE_COLS.map((col, ci) => (<th key={ci} className="px-3 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.table.headerText, borderRight: ci < TABLE_COLS.length - 1 ? `1px solid ${tokens.table.rowBorder}` : 'none' }}>{col}</th>))}</tr></thead>
              <tbody>{[1, 2, 3].map(i => (<tr key={i} style={{ borderBottom: `1px solid ${tokens.table.rowBorder}` }}>{Array.from({ length: TABLE_COLS.length }).map((_, j) => (<td key={j} className="px-3 py-3.5" style={{ borderRight: j < TABLE_COLS.length - 1 ? `1px solid ${tokens.table.rowBorder}` : 'none' }}><div className="h-4 rounded animate-pulse" style={{ background: tokens.surface.hover, width: '70px' }} /></td>))}</tr>))}</tbody>
            </table>
          </div>
        ) : admins.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}` }}><List className="w-5 h-5" style={{ color: tokens.accent.text }} /></div>
            <p className="text-sm" style={{ color: tokens.input.placeholder }}>Aucun admin enregistre</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full table-auto" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tokens.table.headerBorder}` }}>
                    {selectionMode && (
                      <th className="px-3 py-3 w-10" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}>
                        <input type="checkbox" data-testid="admins-select-all-checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
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
                              <input type="checkbox" data-testid="admin-row-checkbox" checked={selectedIds.has(admin.id)} onChange={() => toggleSelect(admin.id)} className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
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
                        <td className="px-3 py-3.5 whitespace-nowrap" style={{ borderRight: `1px solid ${tokens.table.rowBorder}` }}><SAAdminsAccessSwitch adminId={admin.id} enabled={admin.access_enabled} onToggled={fetchAdmins} /></td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setSelectedAdmin(admin)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}><ChevronDown className="w-3 h-3" />Detail</button>
                            <button onClick={() => setHomePageAdmin(admin)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#0ea5e9' }}><Home className="w-3 h-3" />Accueil</button>
                            <button onClick={() => onOpenChat?.(admin)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}><MessageSquare className="w-3 h-3" />MSG</button>
                            <button onClick={() => onConnectAsAdmin?.(admin)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}><LogIn className="w-3 h-3" />Connecter</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: tokens.table.rowBorder }}>
              {admins.map((admin) => {
                const initials = `${(admin.first_name?.[0] ?? '').toUpperCase()}${(admin.last_name?.[0] ?? '').toUpperCase()}`;
                const isSelf = admin.id === currentUserId;
                return (
                  <div key={admin.id} data-row-id={admin.id} data-testid="admin-row" className="px-4 py-4" style={{ borderColor: tokens.table.rowBorder }}>
                    <div className="flex items-start gap-3 mb-3">
                      {selectionMode && !isSelf && <input type="checkbox" data-testid="admin-row-checkbox" checked={selectedIds.has(admin.id)} onChange={() => toggleSelect(admin.id)} className="w-4 h-4 rounded accent-amber-500 cursor-pointer mt-3" />}
                      {selectionMode && isSelf && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded mt-3" style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8' }}>vous</span>}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', color: '#fff' }}>{initials || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate" style={{ color: tokens.table.cellText }}>{admin.first_name || admin.last_name ? `${admin.first_name} ${admin.last_name}`.trim() : '\u2014'}</p>
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{admin.role}</span>
                        </div>
                        {admin.email && (<div className="flex items-center gap-1 mt-1"><Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} /><span className="text-xs truncate flex-1 min-w-0" style={{ color: tokens.table.cellTextMuted }}>{admin.email}</span><CopyButton value={admin.email} /></div>)}
                        {admin.phone && (<div className="flex items-center gap-1.5 mt-0.5"><Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} /><span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{admin.phone}</span></div>)}
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1"><Calendar className="w-3 h-3" style={{ color: tokens.table.cellIcon }} /><span className="text-[11px]" style={{ color: tokens.table.cellTextMuted }}>{formatDate(admin.created_at)}</span></div>
                          <SAAdminsAccessSwitch adminId={admin.id} enabled={admin.access_enabled} onToggled={fetchAdmins} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => setSelectedAdmin(admin)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}><ChevronDown className="w-3 h-3" />Detail</button>
                      <button onClick={() => setHomePageAdmin(admin)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#0ea5e9' }}><Home className="w-3 h-3" />Accueil</button>
                      <button onClick={() => onOpenChat?.(admin)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}><MessageSquare className="w-3 h-3" />MSG</button>
                      <button onClick={() => onConnectAsAdmin?.(admin)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}><LogIn className="w-3 h-3" />Connecter</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedAdmin && <AdminDetailModal admin={selectedAdmin} mode="detail" onClose={() => setSelectedAdmin(null)} onUpdate={handleUpdate} onSwitchMode={() => {}} />}
      {showCreateModal && <SAAdminsCreateModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); fetchAdmins(); }} tokens={tokens} />}
      {showDeleteModal && <SAAdminsBulkDeleteModal count={selectedIds.size} loading={deleting} onConfirm={handleBulkDelete} onCancel={() => setShowDeleteModal(false)} />}
      {homePageAdmin && <AdminHomePageModal admin={homePageAdmin} onClose={() => setHomePageAdmin(null)} />}
    </div>
  );
}
