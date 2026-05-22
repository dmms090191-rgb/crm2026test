import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { List, ChevronDown, ChevronUp, LogIn, Plus, RefreshCw, MessageSquare, Trash2, X, Megaphone, MoreHorizontal, Eye } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import CopyButton from '../../../components/CopyButton';
import AdminDetailModal from './admins/AdminDetailModal';
import SAAdminsCreateModal from './admins/SAAdminsCreateModal';
import SAAdminsAccessSwitch from './admins/SAAdminsAccessSwitch';
import SAAdminsBulkDeleteModal from './admins/SAAdminsBulkDeleteModal';
import AdminHomePageModal from './admins/AdminHomePageModal';
import SAAdminMobileCard from './admins/SAAdminMobileCard';
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
  const [orderMap, setOrderMap] = useState<Record<string, number>>({});
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const actionsBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const rawAdmins = cachedAdmins || [];
  const loading = refreshing ?? false;
  const error = cachedError || '';

  const admins = useMemo(() => {
    const sorted = [...rawAdmins].sort((a, b) => {
      const pa = orderMap[a.id] ?? Number.MAX_SAFE_INTEGER;
      const pb = orderMap[b.id] ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    return sorted;
  }, [rawAdmins, orderMap]);

  const loadOrder = useCallback(async () => {
    const { data } = await supabase.from('sa_admin_order').select('admin_id, position');
    if (data) {
      const map: Record<string, number> = {};
      data.forEach(r => { map[r.admin_id] = r.position; });
      setOrderMap(map);
    }
  }, []);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const fetchAdmins = useCallback(() => { onRefresh?.(); }, [onRefresh]);
  const handleUpdate = useCallback(() => { fetchAdmins(); }, [fetchAdmins]);

  const moveAdmin = useCallback(async (adminId: string, direction: 'up' | 'down') => {
    const idx = admins.findIndex(a => a.id === adminId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= admins.length) return;

    const currentAdmin = admins[idx];
    const swapAdmin = admins[swapIdx];
    const currentPos = orderMap[currentAdmin.id] ?? idx;
    const swapPos = orderMap[swapAdmin.id] ?? swapIdx;

    const newMap = { ...orderMap, [currentAdmin.id]: swapPos, [swapAdmin.id]: currentPos };
    setOrderMap(newMap);

    await supabase.from('sa_admin_order').upsert([
      { admin_id: currentAdmin.id, position: swapPos, updated_at: new Date().toISOString() },
      { admin_id: swapAdmin.id, position: currentPos, updated_at: new Date().toISOString() },
    ]);
  }, [admins, orderMap]);

  const openActionsPopover = useCallback((adminId: string) => {
    setActionsOpenId(prev => prev === adminId ? null : adminId);
  }, []);

  useEffect(() => {
    if (!actionsOpenId) { setPopoverPos(null); return; }
    const btn = actionsBtnRefs.current[actionsOpenId];
    if (!btn) { setPopoverPos(null); return; }
    const rect = btn.getBoundingClientRect();
    const popW = 220;
    const popH = 260;
    let top = rect.bottom + 6;
    let left = rect.left + rect.width / 2 - popW / 2;
    if (left < 8) left = 8;
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - 8 - popW;
    if (top + popH > window.innerHeight - 8) top = rect.top - popH - 6;
    setPopoverPos({ top, left });
  }, [actionsOpenId]);

  const selectableAdmins = admins.filter(a => a.id !== currentUserId);
  const allSelected = selectableAdmins.length > 0 && selectableAdmins.every(a => selectedIds.has(a.id));

  const enterSelectionMode = () => { setSelectionMode(true); setSelectedIds(new Set()); };
  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); };
  const toggleSelectAll = () => { setSelectedIds(allSelected ? new Set() : new Set(selectableAdmins.map(a => a.id))); };
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-admins`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ admin_ids: Array.from(selectedIds) }),
      });
      if (res.ok) { setSelectedIds(new Set()); setSelectionMode(false); fetchAdmins(); }
    } finally { setDeleting(false); setShowDeleteModal(false); }
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
                            <div className="flex flex-col gap-0.5 mr-1">
                              <button onClick={() => moveAdmin(admin.id, 'up')} disabled={idx === 0} className="w-5 h-5 rounded flex items-center justify-center transition-all disabled:opacity-20" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }} title="Monter"><ChevronUp className="w-3 h-3" /></button>
                              <button onClick={() => moveAdmin(admin.id, 'down')} disabled={idx === admins.length - 1} className="w-5 h-5 rounded flex items-center justify-center transition-all disabled:opacity-20" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }} title="Descendre"><ChevronDown className="w-3 h-3" /></button>
                            </div>
                            <button
                              ref={el => { actionsBtnRefs.current[admin.id] = el; }}
                              onClick={() => openActionsPopover(admin.id)}
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

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: tokens.table.rowBorder }}>
              {admins.map((admin, idx) => (
                <SAAdminMobileCard
                  key={admin.id}
                  admin={admin}
                  idx={idx}
                  total={admins.length}
                  isSelf={admin.id === currentUserId}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(admin.id)}
                  onToggleSelect={toggleSelect}
                  onMove={moveAdmin}
                  onDetail={setSelectedAdmin}
                  onHomePage={setHomePageAdmin}
                  onChat={a => onOpenChat?.(a)}
                  onConnect={a => onConnectAsAdmin?.(a)}
                  onAccessToggled={fetchAdmins}
                  formatDate={formatDate}
                  tokens={tokens}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {actionsOpenId && (() => {
        const admin = admins.find(a => a.id === actionsOpenId);
        if (!admin) return null;
        return createPortal(
          <div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={() => setActionsOpenId(null)}>
            {popoverPos && (
              <div
                className="absolute rounded-xl p-3 w-[220px]"
                style={{
                  top: popoverPos.top, left: popoverPos.left, zIndex: 99999,
                  background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(12px)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-bold truncate" style={{ color: tokens.heading.primary }}>
                    {admin.first_name || admin.last_name ? `${admin.first_name} ${admin.last_name}`.trim() : admin.email}
                  </p>
                  <button onClick={() => setActionsOpenId(null)} className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => { setActionsOpenId(null); setSelectedAdmin(admin); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}>
                    <Eye className="w-3.5 h-3.5" />Detail
                  </button>
                  <button onClick={() => { setActionsOpenId(null); setHomePageAdmin(admin); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                    <Megaphone className="w-3.5 h-3.5" />Annonce
                  </button>
                  <button onClick={() => { setActionsOpenId(null); onOpenChat?.(admin); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                    <MessageSquare className="w-3.5 h-3.5" />MSG
                  </button>
                  <button onClick={() => { setActionsOpenId(null); onConnectAsAdmin?.(admin); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]" style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}>
                    <LogIn className="w-3.5 h-3.5" />Connecter
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body
        );
      })()}

      {selectedAdmin && <AdminDetailModal admin={selectedAdmin} mode="detail" onClose={() => setSelectedAdmin(null)} onUpdate={handleUpdate} onSwitchMode={() => {}} />}
      {showCreateModal && <SAAdminsCreateModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); fetchAdmins(); }} tokens={tokens} />}
      {showDeleteModal && <SAAdminsBulkDeleteModal count={selectedIds.size} loading={deleting} onConfirm={handleBulkDelete} onCancel={() => setShowDeleteModal(false)} />}
      {homePageAdmin && <AdminHomePageModal admin={homePageAdmin} onClose={() => setHomePageAdmin(null)} />}
    </div>
  );
}
