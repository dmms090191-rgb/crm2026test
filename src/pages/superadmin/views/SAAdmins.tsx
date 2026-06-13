import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { List, Plus, RefreshCw, Trash2, X, ArrowUpDown, Columns3 } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import AdminDetailModal from './admins/AdminDetailModal';
import SAAdminsCreateModal from './admins/SAAdminsCreateModal';
import SAAdminsBulkDeleteModal from './admins/SAAdminsBulkDeleteModal';
import AdminHomePageModal from './admins/AdminHomePageModal';
import SAAdminMobileCard from './admins/SAAdminMobileCard';
import SAAdminsDesktopTable from './admins/SAAdminsDesktopTable';
import SAAdminsActionsPopover from './admins/SAAdminsActionsPopover';
import { supabase } from '../../../lib/supabase';
import SiteManagerModal from './site-builder/SiteManagerModal';
import DomainManagementModal from './admins/DomainManagementModal';
import useColumnOrder from '../../../components/table/useColumnOrder';
import useColumnOrderMobile from '../../../components/table/useColumnOrderMobile';
import ColumnOrganizerModal from '../../../components/table/ColumnOrganizerModal';
import { useCustomColumns } from '../../../hooks/useCustomColumns';

const SA_ADMINS_COLUMNS = [
  { key: 'prenom', label: 'Prenom' },
  { key: 'nom', label: 'Nom' },
  { key: 'email', label: 'Email' },
  { key: 'societe', label: 'Societe' },
  { key: 'telephone', label: 'Telephone' },
  { key: 'role', label: 'Role' },
  { key: 'cree_le', label: 'Cree le' },
  { key: 'acces', label: 'Acces', required: true },
  { key: 'actions', label: 'Actions', required: true },
  { key: 'ia', label: 'IA', required: true },
];

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
  ai_enabled: boolean;
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
  const [siteAdmin, setSiteAdmin] = useState<AdminUser | null>(null);
  const [domainAdmin, setDomainAdmin] = useState<AdminUser | null>(null);
  const [actionsSourceAdmin, setActionsSourceAdmin] = useState<AdminUser | null>(null);
  const [orderMap, setOrderMap] = useState<Record<string, number>>({});
  const [reorderMode, setReorderMode] = useState(false);
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);
  const actionsBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cc = useCustomColumns('sa_liste_admins');
  const allColumns = useMemo(() => [...SA_ADMINS_COLUMNS, ...cc.customDefs], [cc.customDefs]);
  const colOrder = useColumnOrder('talvex_columns_sa_liste_admins', allColumns);
  const colMobile = useColumnOrderMobile('talvex_columns_sa_liste_admins', allColumns);
  const [showColModal, setShowColModal] = useState(false);
  const displayColumns = useMemo(() => allColumns.map(c => colOrder.labelOverrides[c.key] ? { ...c, label: colOrder.labelOverrides[c.key] } : c), [allColumns, colOrder.labelOverrides]);

  const rawAdmins = cachedAdmins || [];
  const loading = refreshing ?? false;
  const error = cachedError || '';

  const admins = useMemo(() => {
    return [...rawAdmins].sort((a, b) => {
      const pa = orderMap[a.id] ?? Number.MAX_SAFE_INTEGER;
      const pb = orderMap[b.id] ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
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
  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => { if (user) setCurrentUserId(user.id); }); }, []);

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
    setOrderMap(prev => ({ ...prev, [currentAdmin.id]: swapPos, [swapAdmin.id]: currentPos }));
    await supabase.from('sa_admin_order').upsert([
      { admin_id: currentAdmin.id, position: swapPos, updated_at: new Date().toISOString() },
      { admin_id: swapAdmin.id, position: currentPos, updated_at: new Date().toISOString() },
    ]);
  }, [admins, orderMap]);

  const reorderDrop = useCallback(async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const reordered = [...admins];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const newMap: Record<string, number> = {};
    const upserts: { admin_id: string; position: number; updated_at: string }[] = [];
    const now = new Date().toISOString();
    reordered.forEach((a, i) => {
      newMap[a.id] = i;
      upserts.push({ admin_id: a.id, position: i, updated_at: now });
    });
    setOrderMap(newMap);
    await supabase.from('sa_admin_order').upsert(upserts);
  }, [admins]);

  const openActionsPopover = useCallback((adminId: string) => {
    setActionsOpenId(prev => prev === adminId ? null : adminId);
  }, []);


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

  const actionsAdmin = actionsOpenId ? admins.find(a => a.id === actionsOpenId) : null;

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: tokens.text.primary }}>Liste admins</h2>
          <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: tokens.input.placeholder }}>{admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectionMode ? (
            <>
              <button data-testid="admins-cancel-selection-button" onClick={exitSelectionMode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}><X className="w-3.5 h-3.5" />Annuler</button>
              <button data-testid="admins-select-all-button" onClick={toggleSelectAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}>{allSelected ? 'Tout deselectionner' : 'Tout'}</button>
              {selectedIds.size > 0 && (
                <button data-testid="admins-delete-selected-button" onClick={() => setShowDeleteModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 text-white" style={{ background: '#ef4444', boxShadow: '0 2px 12px rgba(239,68,68,0.3)' }}><Trash2 className="w-3.5 h-3.5" />Supprimer selection ({selectedIds.size})</button>
              )}
            </>
          ) : (
            <>
              <button data-testid="admins-delete-mode-button" onClick={enterSelectionMode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}><Trash2 className="w-3.5 h-3.5" />Selection</button>
              <button onClick={() => setShowColModal(true)} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}><Columns3 className="w-3.5 h-3.5" />Colonnes</button>
              <button onClick={() => setReorderMode(prev => !prev)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={reorderMode ? { background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text } : { background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}><ArrowUpDown className="w-3.5 h-3.5" />{reorderMode ? 'Terminer' : 'Reorganiser'}</button>
              <button onClick={fetchAdmins} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Actualiser</button>
              <button onClick={() => setShowCreateModal(true)} data-testid="create-admin-button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 text-white" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 2px 12px rgba(245,158,11,0.3)' }}><Plus className="w-3.5 h-3.5" />Creer un admin</button>
            </>
          )}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: tokens.accent.bg, boxShadow: `0 0 16px ${tokens.accent.border}` }}><List className="w-4 h-4" style={{ color: tokens.accent.text }} /></div>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</div>}

      <div
        className="rounded-2xl overflow-hidden"
        data-testid="admins-list"
        style={{
          background: `linear-gradient(135deg, ${tokens.surface.secondary}, ${tokens.surface.secondary}80)`,
          border: `1px solid ${tokens.surface.border}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
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
            <SAAdminsDesktopTable
              admins={admins} selectionMode={selectionMode} selectedIds={selectedIds}
              currentUserId={currentUserId} allSelected={allSelected}
              onToggleSelectAll={toggleSelectAll} onToggleSelect={toggleSelect}
              onMoveAdmin={moveAdmin} onReorderDrop={reorderDrop} reorderMode={reorderMode}
              onOpenActions={openActionsPopover} onAccessToggled={fetchAdmins}
              formatDate={formatDate} tokens={tokens} actionsBtnRefs={actionsBtnRefs}
              columnOrder={colOrder.visibleOrderedKeys}
              customColumnDefs={cc.customDefs}
              getCustomValues={cc.getValuesForRow}
              labelOverrides={colOrder.labelOverrides}
            />
            <div className="md:hidden divide-y" style={{ borderColor: tokens.table.rowBorder }}>
              {admins.map((admin, idx) => (
                <SAAdminMobileCard key={admin.id} admin={admin} idx={idx} total={admins.length} isSelf={admin.id === currentUserId}
                  selectionMode={selectionMode} selected={selectedIds.has(admin.id)} onToggleSelect={toggleSelect}
                  onMove={moveAdmin} reorderMode={reorderMode}
                  onDetail={a => { setActionsSourceAdmin(a); setSelectedAdmin(a); }}
                  onHomePage={a => { setActionsSourceAdmin(a); setHomePageAdmin(a); }}
                  onChat={a => onOpenChat?.(a)} onConnect={a => onConnectAsAdmin?.(a)}
                  onSite={a => { setActionsSourceAdmin(a); setSiteAdmin(a); }}
                  onDomain={a => { setActionsSourceAdmin(a); setDomainAdmin(a); }}
                  onAccessToggled={fetchAdmins} formatDate={formatDate} tokens={tokens} />
              ))}
            </div>
          </>
        )}
      </div>

      {actionsAdmin && <SAAdminsActionsPopover admin={actionsAdmin} onClose={() => setActionsOpenId(null)} onDetail={a => { setActionsSourceAdmin(a); setSelectedAdmin(a); }} onHomePage={a => { setActionsSourceAdmin(a); setHomePageAdmin(a); }} onChat={a => onOpenChat?.(a)} onConnect={a => onConnectAsAdmin?.(a)} onSite={a => { setActionsSourceAdmin(a); setSiteAdmin(a); }} onDomain={a => { setActionsSourceAdmin(a); setDomainAdmin(a); }} tokens={tokens} />}
      {selectedAdmin && <AdminDetailModal admin={selectedAdmin} mode="detail" onClose={() => { setSelectedAdmin(null); setActionsSourceAdmin(null); }} onUpdate={handleUpdate} onSwitchMode={() => {}} onBack={actionsSourceAdmin ? () => { setSelectedAdmin(null); setActionsOpenId(actionsSourceAdmin.id); } : undefined} />}
      {showCreateModal && <SAAdminsCreateModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); fetchAdmins(); }} tokens={tokens} />}
      {showDeleteModal && <SAAdminsBulkDeleteModal count={selectedIds.size} loading={deleting} onConfirm={handleBulkDelete} onCancel={() => setShowDeleteModal(false)} />}
      {homePageAdmin && <AdminHomePageModal admin={homePageAdmin} onClose={() => { setHomePageAdmin(null); setActionsSourceAdmin(null); }} onBack={actionsSourceAdmin ? () => { setHomePageAdmin(null); setActionsOpenId(actionsSourceAdmin.id); } : undefined} />}
      {siteAdmin && <SiteManagerModal ownerType="admin_company" title={`Site de ${siteAdmin.company || siteAdmin.first_name + ' ' + siteAdmin.last_name}`} subtitle={`Gestion du site pour la societe ${siteAdmin.company || siteAdmin.email}`} companyId={siteAdmin.company_id} hideDomainTab onClose={() => { setSiteAdmin(null); setActionsSourceAdmin(null); }} onBack={actionsSourceAdmin ? () => { setSiteAdmin(null); setActionsOpenId(actionsSourceAdmin.id); } : undefined} />}
      {domainAdmin && <DomainManagementModal companyId={domainAdmin.company_id} companyName={domainAdmin.company || `${domainAdmin.first_name} ${domainAdmin.last_name}`.trim() || domainAdmin.email} onClose={() => { setDomainAdmin(null); setActionsSourceAdmin(null); }} onUpdate={() => { fetchAdmins(); }} onBack={actionsSourceAdmin ? () => { setDomainAdmin(null); setActionsOpenId(actionsSourceAdmin.id); } : undefined} />}
      {showColModal && <ColumnOrganizerModal columns={displayColumns} orderedKeys={colOrder.orderedKeys} hiddenDesktopKeys={colOrder.hiddenDesktopKeys} tableKey="sa_liste_admins" onSave={colOrder.saveAll} onReset={colOrder.resetAll} onClose={() => setShowColModal(false)} onCreateCustomColumn={cc.createColumn} onDeleteCustomColumn={cc.deleteColumn} onRenameCustomColumn={cc.renameColumn} onRenameLabel={colOrder.renameLabel} mobileOrder={colMobile.mobileOrder} mobileCardStyle={colMobile.cardStyle} onSaveMobile={colMobile.saveMobile} onResetMobile={colMobile.resetMobile} />}
    </div>
  );
}
