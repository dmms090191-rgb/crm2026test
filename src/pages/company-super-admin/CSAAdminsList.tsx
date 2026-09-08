import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, RefreshCw, AlertCircle, RotateCcw } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { supabase } from '../../lib/supabase';
import { useCsaStatuts } from './useCsaStatuts';
import { useCsaCompanies } from './useCsaCompanies';
import type { CSAAdminUser } from './useCsaCompanies';
import ListFilters, { EMPTY_FIELDS } from '../../components/filters/ListFilters';
import type { FieldFilters } from '../../components/filters/ListFilters';
import { CSAAdminsDesktopTable, CSAAdminsMobileList } from './CSAAdminsTables';
import type { SortKey } from './CSAAdminsTables';
import CSAAdminsHeader from './CSAAdminsHeader';
import CSAAdminsModals from './CSAAdminsModals';
import { useSyncedFromList } from '../../hooks/useSyncedFromList';

// L'annuaire vient de useCsaCompanies : source unique, partagee avec le chat
// du Groupe. Type re-exporte ici pour les imports existants.
export type { CSAAdminUser } from './useCsaCompanies';

export default function CSAAdminsList({ companyId, csaAuthId = null, canHideTabs = false, onConnectAsAdmin, onMessageAdmin }: {
  companyId: string;
  csaAuthId?: string | null;   // Id Auth du Groupe : proprietaire de l'ordre des actions.
  canHideTabs?: boolean;       // Talvex en Visu : seul a pouvoir masquer des actions.
  onConnectAsAdmin?: (admin: CSAAdminUser) => void;
  /** Ouvre le fil « Chat Sociétés » sur CETTE Société. */
  onMessageAdmin?: (admin: CSAAdminUser) => void;
}) {
  const t = useThemeTokens();
  // Source UNIQUE de l'annuaire, partagee avec le chat du Groupe.
  const { admins, loading, error, refresh: fetchAdmins } = useCsaCompanies(companyId);
  const [showCreate, setShowCreate] = useState(false);
  const [actionsAdmin, setActionsAdmin] = useState<CSAAdminUser | null>(null);
  const [detailAdmin, setDetailAdmin] = useState<CSAAdminUser | null>(null);
  useSyncedFromList(admins, setActionsAdmin, setDetailAdmin);
  // Ouvrir Actions recharge l annuaire : si la Societe a modifie son profil de
  // son cote, le Detail part de donnees fraiches, pas du dernier fetch.
  const openActions = (a: CSAAdminUser | null) => { setActionsAdmin(a); if (a) fetchAdmins(); };

  // Statuts du GROUPE courant (csa_statuts) + affectations par societe.
  const { statuts } = useCsaStatuts(companyId);
  const [statutsMap, setStatutsMap] = useState<Record<string, string>>({});
  const [statutFor, setStatutFor] = useState<string | null>(null);
  const [statutRect, setStatutRect] = useState<{ top: number; left: number } | null>(null);
  const loadStatutsMap = useCallback(async () => {
    const { data } = await supabase.from('csa_company_statuts').select('company_id, statut');
    const map: Record<string, string> = {};
    (data ?? []).forEach((r: { company_id: string; statut: string }) => {
      if (r.company_id) map[r.company_id] = r.statut;
    });
    setStatutsMap(map);
  }, []);

  useEffect(() => { loadStatutsMap(); }, [loadStatutsMap]);

  const assignStatut = useCallback(async (societeCompanyId: string, nom: string) => {
    if (!societeCompanyId) return;
    setStatutsMap(prev => ({ ...prev, [societeCompanyId]: nom }));
    await supabase
      .from('csa_company_statuts')
      .upsert({ company_id: societeCompanyId, statut: nom, updated_at: new Date().toISOString() }, { onConflict: 'company_id' });
  }, []);

  const closeStatut = () => { setStatutFor(null); setStatutRect(null); };

  // --- Selection et suppression de Societes ---
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());   // company_id des Societes
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [openJobs, setOpenJobs] = useState<{ id: string; group_label: string | null }[]>([]);
  const [resuming, setResuming] = useState(false);

  // Une company RACINE (sans parent) n'est pas une vraie Societe : jamais supprimable.
  const [rootCompanies, setRootCompanies] = useState<Set<string>>(new Set());

  const loadGuards = useCallback(async () => {
    const [{ data: roots }, { data: jobs }] = await Promise.all([
      supabase.from('companies').select('id').is('parent_company_id', null),
      supabase.from('group_deletion_jobs').select('id, group_label')
        .or('auth_status.neq.done,storage_status.neq.done'),
    ]);
    setRootCompanies(new Set((roots ?? []).map((r: { id: string }) => r.id)));
    setOpenJobs(jobs ?? []);
  }, []);

  useEffect(() => { loadGuards(); }, [loadGuards]);

  const isDeletable = (a: CSAAdminUser) => !!a.company_id && !rootCompanies.has(a.company_id);

  const toggleSelect = (companyId: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(companyId)) next.delete(companyId); else next.add(companyId);
    return next;
  });

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  const resumeCleanup = async () => {
    setResuming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-groups`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ mode: 'resume' }),
      });
    } finally {
      setResuming(false); loadGuards(); fetchAdmins();
    }
  };

  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  const [fields, setFields] = useState<FieldFilters>(EMPTY_FIELDS);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Filtrage et tri purement visuels, sur la liste deja chargee. Aucune requete, aucune ecriture.
  const filtered = useMemo(() => {
    const norm = (v?: string) => (v ?? '').toLowerCase().trim();
    const digits = (v?: string) => (v ?? '').replace(/D/g, '');
    const q = norm(search);
    const f = {
      firstName: norm(fields.firstName), lastName: norm(fields.lastName),
      company: norm(fields.company), email: norm(fields.email), phone: digits(fields.phone),
    };
    return admins.filter(a => {
      const st = a.company_id ? (statutsMap[a.company_id] ?? '') : '';
      if (statutFilter === 'none' && st) return false;
      if (statutFilter !== 'all' && statutFilter !== 'none' && st !== statutFilter) return false;
      if (f.firstName && !norm(a.first_name).includes(f.firstName)) return false;
      if (f.lastName && !norm(a.last_name).includes(f.lastName)) return false;
      if (f.company && !norm(a.company).includes(f.company)) return false;
      if (f.email && !norm(a.email).includes(f.email)) return false;
      if (f.phone && !digits(a.phone).includes(f.phone)) return false;
      if (q && ![a.first_name, a.last_name, a.company, a.email, a.phone].map(norm).join(' ').includes(q)) return false;
      return true;
    });
  }, [admins, statutsMap, search, statutFilter, fields]);

  const shown = useMemo(() => {
    if (!sortKey) return filtered;
    const val = (a: CSAAdminUser) =>
      sortKey === 'statut' ? (a.company_id ? (statutsMap[a.company_id] ?? '') : '') : (a[sortKey] ?? '');
    return [...filtered].sort((x, y) => {
      const r = String(val(x)).localeCompare(String(val(y)), 'fr', { sensitivity: 'base' });
      return sortDir === 'asc' ? r : -r;
    });
  }, [filtered, sortKey, sortDir, statutsMap]);

  // croissant -> decroissant -> tri par defaut
  const handleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(null); setSortDir('asc');
  };

  const deletableShown = shown.filter(isDeletable);
  const selectedTargets = admins.filter(a => a.company_id && selected.has(a.company_id));
  const allShownSelected = deletableShown.length > 0 && deletableShown.every(a => selected.has(a.company_id));
  const toggleAllShown = () => setSelected(prev => {
    const next = new Set(prev);
    if (allShownSelected) deletableShown.forEach(a => next.delete(a.company_id));
    else deletableShown.forEach(a => next.add(a.company_id));
    return next;
  });

  const activeFieldCount = Object.values(fields).filter(Boolean).length;
  const hasAnyFilter = !!search || statutFilter !== 'all' || activeFieldCount > 0 || sortKey !== null;
  const resetAll = () => {
    setSearch(''); setStatutFilter('all'); setFields(EMPTY_FIELDS);
    setSortKey(null); setSortDir('asc');
  };


  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-5">
      <CSAAdminsHeader
        total={admins.length} shownCount={shown.length} loading={loading}
        selectMode={selectMode} selectedCount={selected.size} t={t}
        setDeleteOpen={setDeleteOpen}
        onToggleSelectMode={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
        setShowCreate={setShowCreate} fetchAdmins={fetchAdmins}
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: t.danger.text }} />
          <p className="text-xs font-medium" style={{ color: t.danger.text }}>{error}</p>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        border: `1px solid ${t.surface.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        {openJobs.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl mb-3"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
              <p className="text-xs truncate" style={{ color: '#f59e0b' }}>
                {openJobs.length} nettoyage{openJobs.length > 1 ? 's' : ''} incomplet{openJobs.length > 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={resumeCleanup} disabled={resuming}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex-shrink-0 disabled:opacity-50"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <RotateCcw className={`w-3.5 h-3.5 ${resuming ? 'animate-spin' : ''}`} />
              Reprendre le nettoyage
            </button>
          </div>
        )}

        {selectMode && shown.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
            style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
            <input type="checkbox" checked={allShownSelected} onChange={toggleAllShown}
              disabled={deletableShown.length === 0}
              className="w-4 h-4 cursor-pointer accent-red-500 disabled:opacity-30" />
            <span className="text-xs" style={{ color: t.text.secondary }}>
              Tout sélectionner{deletableShown.length !== shown.length ? ` (${deletableShown.length} sur ${shown.length} supprimables)` : ''}
            </span>
            {selected.size > 0 && (
              <span className="text-xs font-semibold ml-auto" style={{ color: '#ef4444' }}>
                {selected.size} sélectionnée{selected.size > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {admins.length > 0 && (
          <ListFilters
            search={search}
            onSearchChange={setSearch}
            statut={statutFilter}
            onStatutChange={setStatutFilter}
            saStatuts={statuts}
            fields={fields}
            onFieldChange={(k, v) => setFields(prev => ({ ...prev, [k]: v }))}
            activeCount={activeFieldCount}
            hasAnyFilter={hasAnyFilter}
            onReset={resetAll}
            tokens={t}
            searchPlaceholder="Rechercher une société..."
            companyLabel="Société"
          />
        )}

        {loading && admins.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: t.text.tertiary }} />
          </div>
        ) : admins.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
              <Users className="w-5 h-5" style={{ color: t.accent.text }} />
            </div>
            <p className="text-sm font-medium" style={{ color: t.text.tertiary }}>Aucune société — cliquez sur "Ajouter une société" pour commencer</p>
          </div>
        ) : (
          <>
            {shown.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <p className="text-sm font-semibold" style={{ color: t.text.primary }}>Aucune société ne correspond</p>
                <p className="text-xs" style={{ color: t.text.tertiary }}>Aucune société ne correspond aux filtres appliqués.</p>
                <button
                  onClick={resetAll}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <>
                <CSAAdminsDesktopTable admins={shown} t={t} onActions={openActions} statuts={statuts} statutsMap={statutsMap} onStatutClick={(cid, rect) => { setStatutFor(cid); setStatutRect(rect); }} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} selectMode={selectMode} selected={selected} onToggleSelect={toggleSelect} isDeletable={isDeletable} />
                <CSAAdminsMobileList admins={shown} t={t} onActions={openActions} selectMode={selectMode} selected={selected} onToggleSelect={toggleSelect} isDeletable={isDeletable} />
              </>
            )}
          </>
        )}
      </div>
      <CSAAdminsModals
        t={t} companyId={companyId} csaAuthId={csaAuthId} canHideTabs={canHideTabs}
        showCreate={showCreate} setShowCreate={setShowCreate} fetchAdmins={fetchAdmins} statutFor={statutFor}
        statutRect={statutRect} statutsMap={statutsMap} statuts={statuts} assignStatut={assignStatut} closeStatut={closeStatut}
        deleteOpen={deleteOpen} setDeleteOpen={setDeleteOpen} selectedTargets={selectedTargets} loadGuards={loadGuards}
        exitSelectMode={exitSelectMode} actionsAdmin={actionsAdmin} setActionsAdmin={setActionsAdmin}
        setDetailAdmin={setDetailAdmin} onConnectAsAdmin={onConnectAsAdmin} onMessageAdmin={onMessageAdmin} detailAdmin={detailAdmin}
      />
    </div>
  );
}
