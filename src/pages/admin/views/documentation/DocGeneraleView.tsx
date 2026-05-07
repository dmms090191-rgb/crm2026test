import { BookOpen, FileText } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import DATABASE_DOC from './databaseDocumentation';
import { loadDiscoveredTables } from '../../../../lib/fetchTableSchema';
import type { TableDoc } from './databaseDocumentation';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { buildStructureCrmText } from './StructureCrmView';
import type { Props, DocSection } from './docGeneraleTypes';
import { DOC_GROUP_COLOR } from './docGeneraleTypes';
import { getIconForTab, buildDatabaseSummaryText, buildContextCardsText, buildIdeasText, buildAmeliorationsText, buildAuditText, buildCopyText } from './docGeneraleHelpers';
import { SectionCard } from './docGeneraleCards';
import { ChatGptSectionCard } from './docGeneraleChatGptCard';
import { GroupHeader } from './docGeneraleSections';
import { DocGeneraleHeader } from './docGeneraleHeader';

const EXCLUDED_TABS = new Set(['documentation-generale']);

export default function DocGeneraleView({ tabs, contents, contextCards, ideas, ameliorations, ameliorationCategories }: Props) {
  const tokens = useThemeTokens();
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [discoveredTables, setDiscoveredTables] = useState<TableDoc[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    loadDiscoveredTables().then(setDiscoveredTables).catch(() => {});
  }, [refreshKey]);

  const allTables = useMemo(() => {
    const nameSet = new Set<string>();
    const merged: TableDoc[] = [];
    for (const t of DATABASE_DOC.tables) {
      nameSet.add(t.name);
      merged.push(t);
    }
    for (const t of discoveredTables) {
      if (!nameSet.has(t.name)) {
        nameSet.add(t.name);
        merged.push(t);
      }
    }
    return merged;
  }, [discoveredTables]);

  const sourceTabs = useMemo(
    () => tabs.filter((t) => !EXCLUDED_TABS.has(t.id)),
    [tabs]
  );

  const sections: DocSection[] = useMemo(() => {
    return sourceTabs.map((tab) => {
      let content = '';
      if (tab.id === 'contexte-chatgpt') {
        content = buildContextCardsText(contextCards);
      } else if (tab.id === 'base-de-donnees') {
        content = buildDatabaseSummaryText(allTables);
      } else if (tab.id === 'structure-crm') {
        content = buildStructureCrmText();
      } else if (tab.id === 'idees') {
        content = buildIdeasText(ideas);
      } else if (tab.id === 'ameliorations') {
        content = buildAmeliorationsText(ameliorations, ameliorationCategories);
      } else if (tab.id === 'audit-technique') {
        content = buildAuditText();
      } else {
        content = contents[tab.id] ?? '';
      }
      return {
        id: tab.id,
        label: tab.label,
        icon: getIconForTab(tab.id),
        content,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTabs, contents, contextCards, allTables, ideas, ameliorations, ameliorationCategories, refreshKey]);

  const handleCopy = useCallback(async () => {
    const text = buildCopyText(sections);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sections]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DocGeneraleHeader
        tokens={tokens}
        copied={copied}
        handleCopy={handleCopy}
        handleRefresh={handleRefresh}
        totalSections={sections.length}
      />

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {sections.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-20"
            style={{
              background: tokens.card.bg,
              border: `1px solid ${tokens.card.border}`,
              boxShadow: tokens.card.shadow,
              minHeight: '240px',
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.border}` }}
            >
              <FileText className="w-6 h-6" style={{ color: tokens.text.quaternary }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: tokens.text.tertiary }}>
              Aucun contenu disponible
            </p>
            <p className="text-xs mt-2 max-w-xs text-center" style={{ color: tokens.text.quaternary, lineHeight: '1.6' }}>
              Renseignez les sections sources dans les autres onglets pour generer automatiquement la documentation
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <div>
              <GroupHeader
                icon={<BookOpen className="w-4 h-4" />}
                title="Documentation interne"
                count={sections.length}
                color={DOC_GROUP_COLOR}
              />
              <div className="flex flex-col gap-5">
                {sections.map((section, sectionIndex) => {
                  const isOpen = openSections.has(section.id);

                  if (section.id === 'contexte-chatgpt') {
                    return (
                      <ChatGptSectionCard
                        key={section.id}
                        section={section}
                        sectionIndex={sectionIndex}
                        isOpen={isOpen}
                        onToggle={() => toggleSection(section.id)}
                        contextCards={contextCards}
                      />
                    );
                  }

                  return (
                    <SectionCard
                      key={section.id}
                      section={section}
                      index={sectionIndex}
                      isOpen={isOpen}
                      onToggle={() => toggleSection(section.id)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
