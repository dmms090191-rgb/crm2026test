import { useState, useMemo, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useSuperAdminsData } from './useSuperAdminsData';
import SASuperAdminsTable from './SASuperAdminsTable';
import type { SortKey } from './SASuperAdminsTable';
import ListFilters, { EMPTY_FIELDS } from '../../../../components/filters/ListFilters';
import type { FieldFilters } from '../../../../components/filters/ListFilters';
import SASuperAdminMobileCard from './SASuperAdminMobileCard';
import { supabase } from '../../../../lib/supabase';
import { useSaStatuts } from './useSaStatuts';
import type { CompanySuperAdmin } from './superAdminTypes';
import SASuperAdminsHeader from './SASuperAdminsHeader';
import SASuperAdminsNotices from './SASuperAdminsNotices';
import { SASuperAdminsEmpty, SASuperAdminsNoMatch } from './SASuperAdminsEmpty';
import SASuperAdminsModals from './SASuperAdminsModals';
import { useSyncedFromList } from '../../../../hooks/useSyncedFromList';

interface Props {
  onConnectAsCompanySuperAdmin?: (sa: CompanySuperAdmin) => void;
  onOpenChat?: (sa: CompanySuperAdmin) => void;
}

export default function SASuperAdmins({ onConnectAsCompanySuperAdmin, onOpenChat }: Props) {
  const t = useThemeTokens();
  const { list, loading, error, refresh, statuts, setGroupStatut } = useSuperAdminsData();
  const { saStatuts } = useSaStatuts();
  const [statutFor, setStatutFor] = useState<string | null>(null);
  const [statutRect, setStatutRect] = useState<{ top: number; left: number } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionsSa, setActionsSa] = useState<CompanySuperAdmin | null>(null);
  const [domainSa, setDomainSa] = useState<CompanySuperAdmin | null>(null);
  const [siteSa, setSiteSa] = useState<CompanySuperAdmin | null>(null);
  const [detailSa, setDetailSa] = useState<CompanySuperAdmin | null>(null);

  useSyncedFromList(list, setActionsSa, setDetailSa);
  // Ouvrir Actions recharge la liste : si le Groupe a modifie son profil de
  // son cote, le Detail part de donnees fraiches.
  const openActions = (sa: CompanySuperAdmin | null) => { setActionsSa(sa); if (sa) refresh(); };

  // --- Selection et suppression ---
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());   // ids Auth des Groupes
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [openJobs, setOpenJobs] = useState<{ id: string; group_label: string | null }[]>([]);
  const [resuming, setResuming] = useState(false);

  const loadOpenJobs = useCallback(async () => {
    const { data } = await supabase
      .from('group_deletion_jobs')
      .select('id, group_label')
      .or('auth_status.neq.done,storage_status.neq.done');
    setOpenJobs(data ?? []);
  }, []);

  useEffect(() => { loadOpenJobs(); }, [loadOpenJobs]);

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
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
      setResuming(false);
      loadOpenJobs();
      refresh();
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
    return list.filter(sa => {
      const st = sa.company_id ? (statuts[sa.company_id] ?? '') : '';
      if (statutFilter === 'none' && st) return false;
      if (statutFilter !== 'all' && statutFilter !== 'none' && st !== statutFilter) return false;
      if (f.firstName && !norm(sa.first_name).includes(f.firstName)) return false;
      if (f.lastName && !norm(sa.last_name).includes(f.lastName)) return false;
      if (f.company && !norm(sa.company).includes(f.company)) return false;
      if (f.email && !norm(sa.email).includes(f.email)) return false;
      if (f.phone && !digits(sa.phone).includes(f.phone)) return false;
      if (q && ![sa.first_name, sa.last_name, sa.company, sa.email, sa.phone].map(norm).join(' ').includes(q)) return false;
      return true;
    });
  }, [list, statuts, search, statutFilter, fields]);

  const shown = useMemo(() => {
    if (!sortKey) return filtered;
    const val = (sa: CompanySuperAdmin) =>
      sortKey === 'statut' ? (sa.company_id ? (statuts[sa.company_id] ?? '') : '') : (sa[sortKey] ?? '');
    return [...filtered].sort((a, b) => {
      const r = String(val(a)).localeCompare(String(val(b)), 'fr', { sensitivity: 'base' });
      return sortDir === 'asc' ? r : -r;
    });
  }, [filtered, sortKey, sortDir, statuts]);

  // croissant -> decroissant -> tri par defaut
  const handleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(null); setSortDir('asc');
  };

  const selectedGroups = list.filter(sa => selected.has(sa.id));
  const allShownSelected = shown.length > 0 && shown.every(sa => selected.has(sa.id));
  const toggleAllShown = () => setSelected(prev => {
    const next = new Set(prev);
    if (allShownSelected) shown.forEach(sa => next.delete(sa.id));
    else shown.forEach(sa => next.add(sa.id));
    return next;
  });

  const activeFieldCount = Object.values(fields).filter(Boolean).length;
  const hasAnyFilter = !!search || statutFilter !== 'all' || activeFieldCount > 0 || sortKey !== null;

  const resetAll = () => {
    setSearch('');
    setStatutFilter('all');
    setFields(EMPTY_FIELDS);
    setSortKey(null);
    setSortDir('asc');
  };

  const handleConnect = (sa: CompanySuperAdmin) => {
    setActionsSa(null);
    onConnectAsCompanySuperAdmin?.(sa);
  };

  const handleChat = (sa: CompanySuperAdmin) => {
    setActionsSa(null);
    onOpenChat?.(sa);
  };

  const openStatut = (companyId: string, rect: { top: number; left: number }) => {
    setStatutFor(companyId);
    setStatutRect(rect);
  };
  const closeStatut = () => { setStatutFor(null); setStatutRect(null); };

  const handleDomain = (sa: CompanySuperAdmin) => {
    setActionsSa(null);
    setDomainSa(sa);
  };

  const handleSite = (sa: CompanySuperAdmin) => {
    setActionsSa(null);
    setSiteSa(sa);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 flex flex-col h-full min-h-0">
      <SASuperAdminsHeader
        total={list.length} shownCount={shown.length} loading={loading}
        selectMode={selectMode} selectedCount={selected.size} tokens={t}
        onRefresh={refresh}
        onDelete={() => setDeleteOpen(true)}
        onToggleSelectMode={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
        onCreate={() => setShowCreate(true)}
      />

      <SASuperAdminsNotices
        error={error} openJobs={openJobs} resuming={resuming} onResume={resumeCleanup}
        selectMode={selectMode} shownCount={shown.length} totalCount={list.length}
        allShownSelected={allShownSelected} selectedCount={selected.size}
        onToggleAllShown={toggleAllShown} tokens={t}
      />

      {list.length > 0 && (
        <ListFilters
          search={search}
          onSearchChange={setSearch}
          statut={statutFilter}
          onStatutChange={setStatutFilter}
          saStatuts={saStatuts}
          fields={fields}
          onFieldChange={(k, v) => setFields(prev => ({ ...prev, [k]: v }))}
          activeCount={activeFieldCount}
          hasAnyFilter={hasAnyFilter}
          onReset={resetAll}
          tokens={t}
          searchPlaceholder="Rechercher un groupe..."
          companyLabel="Groupe"
        />
      )}

      {loading && list.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: t.text.tertiary }} />
        </div>
      ) : list.length === 0 && !error ? (
        <SASuperAdminsEmpty tokens={t} onCreate={() => setShowCreate(true)} />
      ) : shown.length === 0 ? (
        <SASuperAdminsNoMatch tokens={t} onReset={resetAll} />
      ) : (
        <>
          <div className="hidden md:block flex-1 min-h-0 overflow-y-auto">
            <SASuperAdminsTable list={shown} tokens={t} onActions={openActions} saStatuts={saStatuts} statuts={statuts} onStatutClick={openStatut} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} selectMode={selectMode} selected={selected} onToggleSelect={toggleSelect} />
          </div>
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-3">
            {shown.map(sa => (
              <SASuperAdminMobileCard key={sa.id} sa={sa} tokens={t} onActions={openActions} saStatuts={saStatuts} statut={sa.company_id ? (statuts[sa.company_id] ?? '') : ''} selectMode={selectMode} isSelected={selected.has(sa.id)} onToggleSelect={() => toggleSelect(sa.id)} />
            ))}
          </div>
        </>
      )}

      <SASuperAdminsModals
        tokens={t}
        showCreate={showCreate}
        onCloseCreate={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); refresh(); }}
        statutFor={statutFor} statutRect={statutRect} statuts={statuts} saStatuts={saStatuts}
        onSelectStatut={async nom => { if (statutFor) await setGroupStatut(statutFor, nom); closeStatut(); }}
        onCloseStatut={closeStatut}
        deleteOpen={deleteOpen} selectedGroups={selectedGroups}
        onCloseDelete={() => setDeleteOpen(false)}
        onDeleteDone={() => { refresh(); loadOpenJobs(); exitSelectMode(); }}
        actionsSa={actionsSa}
        onCloseActions={() => setActionsSa(null)}
        onConnect={handleConnect} onChat={handleChat} onDomain={handleDomain} onSite={handleSite}
        onDetail={setDetailSa} detailSa={detailSa} onCloseDetail={() => setDetailSa(null)} onDetailUpdate={refresh}
        domainSa={domainSa}
        onCloseDomain={() => setDomainSa(null)}
        onDomainUpdate={refresh}
        onDomainBack={() => { const sa = domainSa; setDomainSa(null); setActionsSa(sa); }}
        siteSa={siteSa}
        onCloseSite={() => setSiteSa(null)}
        onSiteBack={() => { const sa = siteSa; setSiteSa(null); setActionsSa(sa); }}
      />
    </div>
  );
}
