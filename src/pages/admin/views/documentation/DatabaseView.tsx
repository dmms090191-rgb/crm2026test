import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, Copy, CheckCircle } from 'lucide-react';
import DATABASE_DOC, { TableDoc } from './databaseDocumentation';
import DatabaseFooterPanels from './DatabaseFooterPanels';
import { loadDiscoveredTables, fetchTableSchema, saveDiscoveredTable } from '../../../../lib/fetchTableSchema';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { GROUP_COLORS, buildFullDatabaseDocText } from './databaseViewConstants';
import { GlobalSummary, MainRelations, TableCard } from './databaseViewPanels';
import SyncBanner from './databaseViewSyncBanner';

export default function DatabaseView() {
  const tokens = useThemeTokens();
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('Toutes');
  const [copied, setCopied] = useState(false);
  const [discoveredTables, setDiscoveredTables] = useState<TableDoc[]>([]);
  const [staticOverrides, setStaticOverrides] = useState<Map<string, TableDoc>>(new Map());
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ status: 'idle' | 'ok' | 'error'; message?: string }>({ status: 'idle' });

  useEffect(() => {
    loadDiscoveredTables().then(setDiscoveredTables).catch(() => {});
  }, []);

  const staticTableNames = useMemo(() => new Set(DATABASE_DOC.tables.map((t) => t.name)), []);

  const allTables = useMemo(() => {
    const nameSet = new Set<string>();
    const merged: TableDoc[] = [];
    for (const t of DATABASE_DOC.tables) {
      nameSet.add(t.name);
      const override = staticOverrides.get(t.name);
      if (override) {
        merged.push({ ...t, columns: override.columns, foreignKeys: override.foreignKeys, indexes: override.indexes, policies: override.policies, triggers: override.triggers });
      } else {
        merged.push(t);
      }
    }
    for (const t of discoveredTables) {
      if (!nameSet.has(t.name)) {
        nameSet.add(t.name);
        merged.push(t);
      }
    }
    return merged;
  }, [discoveredTables, staticOverrides]);

  const handleSyncAll = useCallback(async () => {
    setSyncing(true);
    setSyncResult({ status: 'idle' });
    try {
      const { data, error } = await supabase.rpc('get_public_table_names');
      if (error) throw error;
      const realNames = (data as Array<{ table_name: string }>).map((r) => r.table_name);

      const refreshed: TableDoc[] = [];
      const overrides = new Map<string, TableDoc>();
      for (const tableName of realNames) {
        try {
          const doc = await fetchTableSchema(tableName);
          if (staticTableNames.has(tableName)) {
            overrides.set(tableName, doc);
          } else {
            await saveDiscoveredTable(doc);
            refreshed.push(doc);
          }
        } catch {
          // skip tables that fail introspection
        }
      }
      setDiscoveredTables(refreshed);
      setStaticOverrides(overrides);
      setSyncResult({ status: 'ok', message: `Synchronise ! ${realNames.length} tables mises a jour.` });
    } catch {
      setSyncResult({ status: 'error', message: 'Erreur de synchronisation avec Supabase.' });
    }
    setSyncing(false);
  }, [staticTableNames]);

  const handleCopyDatabaseDoc = useCallback(async () => {
    // Always build from live data: sync all tables first then copy
    try {
      const { data, error } = await supabase.rpc('get_public_table_names');
      if (!error && data) {
        const realNames = (data as Array<{ table_name: string }>).map((r) => r.table_name);
        const liveTables: TableDoc[] = [];
        for (const tableName of realNames) {
          try {
            const doc = await fetchTableSchema(tableName);
            const staticEntry = DATABASE_DOC.tables.find((t) => t.name === tableName);
            if (staticEntry) {
              liveTables.push({ ...staticEntry, columns: doc.columns, foreignKeys: doc.foreignKeys, indexes: doc.indexes, policies: doc.policies, triggers: doc.triggers });
            } else {
              liveTables.push(doc);
            }
          } catch {
            const existing = allTables.find((t) => t.name === tableName);
            if (existing) liveTables.push(existing);
          }
        }
        await navigator.clipboard.writeText(buildFullDatabaseDocText(liveTables));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch { /* fallback to current data */ }
    await navigator.clipboard.writeText(buildFullDatabaseDocText(allTables));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [allTables]);

  const allGroups = useMemo(() => {
    const base = ['Toutes', ...DATABASE_DOC.groups.map((g) => g.id)];
    if (allTables.some((t) => t.group === 'Non classe') && !base.includes('Non classe')) {
      base.push('Non classe');
    }
    return base;
  }, [allTables]);

  const filtered = useMemo(() => {
    return allTables.filter((t) => {
      const matchSearch = search.trim() === '' || t.name.toLowerCase().includes(search.toLowerCase());
      const matchGroup = activeGroup === 'Toutes' || t.group === activeGroup;
      return matchSearch && matchGroup;
    });
  }, [search, activeGroup, allTables]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto md:overflow-y-visible">
      <div className="flex-shrink-0">
        <GlobalSummary tables={allTables} />
        <MainRelations />
        <SyncBanner syncing={syncing} syncResult={syncResult} onSync={handleSyncAll} />
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-4 flex-shrink-0">
        <div
          className="flex items-center gap-2 w-full md:w-auto md:flex-1 min-w-0 rounded-lg px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${tokens.card.border}` }}
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tokens.label.hint }} />
          <input
            type="text"
            placeholder="Rechercher une table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: tokens.text.secondary, caretColor: tokens.accent.text }}
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X className="w-3 h-3" style={{ color: tokens.label.hint }} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {allGroups.map((g) => {
            const color = g === 'Toutes' ? '#94a3b8' : GROUP_COLORS[g] ?? '#94a3b8';
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className="text-[11px] md:text-xs px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg font-medium transition-all duration-150"
                style={
                  activeGroup === g
                    ? { background: `${color}18`, color, border: `1px solid ${color}30` }
                    : { background: tokens.surface.tertiary, color: tokens.text.tertiary, border: `1px solid ${tokens.surface.border}` }
                }
                onMouseEnter={(e) => {
                  if (activeGroup !== g) e.currentTarget.style.color = tokens.text.secondary;
                }}
                onMouseLeave={(e) => {
                  if (activeGroup !== g) e.currentTarget.style.color = tokens.text.tertiary;
                }}
              >
                {g}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 justify-between md:justify-start">
          <span className="text-[11px] md:text-xs flex-shrink-0" style={{ color: tokens.label.hint }}>
            {filtered.length} / {allTables.length} tables
          </span>

          <button
            onClick={handleCopyDatabaseDoc}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex-shrink-0"
            style={
              copied
                ? { background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }
                : { background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }
            }
            onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.background = 'rgba(34,211,238,0.14)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)'; } }}
            onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.borderColor = tokens.accent.border; } }}
          >
            {copied
              ? <><CheckCircle className="w-3.5 h-3.5" />Copie !</>
              : <><Copy className="w-3.5 h-3.5" />Copier</>
            }
          </button>
        </div>
      </div>

      <div className="md:flex-1 md:min-h-0 md:overflow-y-auto md:pr-1">
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucune table correspondante</p>
            </div>
          ) : (
            filtered.map((table) => <TableCard key={table.name} table={table} />)
          )}
        </div>

        <DatabaseFooterPanels />
      </div>
    </div>
  );
}
