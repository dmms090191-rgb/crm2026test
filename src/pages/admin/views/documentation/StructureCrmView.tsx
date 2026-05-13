import { FolderOpen, FolderTree, Layers, ChevronDown, RefreshCw, Copy, CheckCircle } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { PROJECT_TREE, FOLDER_SECTIONS } from './structureCrmData';
import { TreeNodeView, FolderCard } from './StructureCrmComponents';
import { buildStructureCrmText } from './structureCrmTextExport';
import { syncStructure, buildSyncedStructureText, type SyncResult } from './structureCrmSync';
export { buildStructureCrmText };

export default function StructureCrmView() {
  const tokens = useThemeTokens();
  const [treeOpen, setTreeOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState(false);
  const [syncData, setSyncData] = useState<SyncResult | null>(null);

  const displayTree = syncData ? syncData.tree : PROJECT_TREE;
  const displayFolders = syncData ? syncData.folders : FOLDER_SECTIONS;

  const handleSync = useCallback(() => {
    const result = syncStructure();
    setSyncData(result);
    setSynced(true);
    setTimeout(() => setSynced(false), 2500);
  }, []);

  const handleCopy = useCallback(async () => {
    let text: string;
    if (syncData) {
      text = buildSyncedStructureText(syncData);
    } else {
      const result = syncStructure();
      setSyncData(result);
      text = buildSyncedStructureText(result);
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [syncData]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(251,146,60,0.10)',
              border: '1px solid rgba(251,146,60,0.20)',
            }}
          >
            <FolderTree className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#fb923c' }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-bold" style={{ color: tokens.text.primary, letterSpacing: '-0.02em' }}>
              Structure du CRM
            </h2>
            <p className="text-[11px] md:text-xs mt-0.5 break-words" style={{ color: tokens.text.quaternary }}>
              Architecture et organisation du code
              {syncData && (
                <span className="block md:inline" style={{ color: tokens.success.text }}>
                  {' '}{syncData.stats.totalFiles} fichiers, {syncData.stats.totalFolders} dossiers, {syncData.stats.migrations} migrations, {syncData.stats.edgeFunctions} edge functions
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
          <button
            onClick={handleSync}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
            style={
              synced
                ? { background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }
                : { background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }
            }
            onMouseEnter={(e) => {
              if (!synced) {
                e.currentTarget.style.background = 'rgba(56,189,248,0.14)';
                e.currentTarget.style.borderColor = 'rgba(56,189,248,0.35)';
              }
            }}
            onMouseLeave={(e) => {
              if (!synced) {
                e.currentTarget.style.background = tokens.accent.bg;
                e.currentTarget.style.borderColor = tokens.accent.border;
              }
            }}
          >
            {synced ? <CheckCircle className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {synced ? 'Synchronise !' : 'Synchroniser'}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
            style={
              copied
                ? { background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }
                : { background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }
            }
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.background = 'rgba(34,211,238,0.14)';
                e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)';
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.background = tokens.accent.bg;
                e.currentTarget.style.borderColor = tokens.accent.border;
              }
            }}
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copie !' : 'Copier'}
          </button>
        </div>
      </div>

      {/* Arborescence */}
      <div
        className="rounded-xl overflow-hidden mb-6"
        style={{
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          boxShadow: tokens.card.shadow,
        }}
      >
        <button
          type="button"
          onClick={() => setTreeOpen(!treeOpen)}
          className="w-full px-4 md:px-6 py-3 md:py-4 text-left cursor-pointer flex items-center gap-2.5 md:gap-3"
          style={{ borderBottom: treeOpen ? `1px solid ${tokens.surface.borderLight}` : 'none' }}
        >
          <FolderTree className="w-4 h-4 flex-shrink-0" style={{ color: '#fb923c' }} />
          <span className="text-xs md:text-sm font-bold flex-1" style={{ color: tokens.text.primary }}>
            Arborescence du projet
          </span>
          <ChevronDown
            className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
            style={{
              color: tokens.text.quaternary,
              transform: treeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        <div
          className="transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden"
          style={{
            maxHeight: treeOpen ? '8000px' : '0px',
            opacity: treeOpen ? 1 : 0,
          }}
        >
          <div className="px-3 py-3 md:px-6 md:py-5">
            <div
              className="rounded-lg p-3 md:p-4 overflow-x-auto"
              style={{
                background: tokens.surface.tertiary,
                border: `1px solid ${tokens.surface.borderLight}`,
              }}
            >
              {displayTree.map((root, idx) => (
                <TreeNodeView key={`${root.name}-${idx}`} node={root} depth={0} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Organisation du code */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(52,211,153,0.10)',
              border: '1px solid rgba(52,211,153,0.20)',
            }}
          >
            <Layers className="w-4 h-4" style={{ color: '#34d399' }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: tokens.text.primary }}>
            Organisation du code
          </h3>
        </div>

        <div
          className="rounded-xl p-3 md:p-5 mb-6"
          style={{
            background: tokens.card.bg,
            border: `1px solid ${tokens.card.border}`,
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-4">
            {[
              { label: 'UI / Composants', path: 'src/components/ + src/pages/*/views/', color: '#38bdf8' },
              { label: 'Logique metier', path: 'src/lib/', color: '#34d399' },
              { label: 'Hooks', path: 'src/hooks/', color: '#f59e0b' },
              { label: 'Contextes', path: 'src/contexts/', color: '#8b5cf6' },
              { label: 'Pages par role', path: 'src/pages/admin/ | vendor/ | client/', color: '#fb923c' },
              { label: 'Backend / BDD', path: `supabase/ (${syncData?.stats.migrations ?? '?'} migrations, ${syncData?.stats.edgeFunctions ?? '?'} functions)`, color: '#4ade80' },
              { label: 'Scripts', path: 'scripts/', color: '#06b6d4' },
              { label: 'Configuration', path: 'vite.config.ts + tailwind.config.js + tsconfig.*', color: '#94a3b8' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-2.5 md:gap-3 p-2.5 md:p-3 rounded-lg"
                style={{ background: tokens.surface.tertiary }}
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: item.color }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: tokens.text.primary }}>
                    {item.label}
                  </p>
                  <p
                    className="text-[10px] md:text-[11px] mt-0.5 font-mono break-words"
                    style={{ color: tokens.text.quaternary }}
                  >
                    {item.path}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail des dossiers */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(251,146,60,0.10)',
              border: '1px solid rgba(251,146,60,0.20)',
            }}
          >
            <FolderOpen className="w-4 h-4" style={{ color: '#fb923c' }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: tokens.text.primary }}>
            Detail des dossiers
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          {displayFolders.map((section) => (
            <FolderCard key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
