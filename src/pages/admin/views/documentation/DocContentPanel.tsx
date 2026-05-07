import { Loader2, Plus } from 'lucide-react';
import { ThemeTokens } from '../../../../lib/themeTokens';
import { Tab, TabId, ActiveSection, PLACEHOLDER } from './docCrmTypes';
import { Note } from '../notes/NotesList';
import NotesList from '../notes/NotesList';
import { Idea } from '../ideas/IdeasView';
import IdeasView from '../ideas/IdeasView';
import { ContextCard } from './ContextCardsView';
import ContextCardsView from './ContextCardsView';
import TechnologiesView from './TechnologiesView';
import DatabaseView from './DatabaseView';
import DocGeneraleView from './DocGeneraleView';
import StructureCrmView from './StructureCrmView';
import AuditTechniqueView from './AuditTechniqueView';
import AmeliorationsView, { Amelioration, AmeliorationCategory } from '../ameliorations/AmeliorationsView';

interface DocContentPanelProps {
  activeSection: ActiveSection;
  activeTab: TabId | null;
  currentTab: Tab | null;
  loading: boolean;
  contents: Record<TabId, string>;
  tabs: Tab[];
  notes: Note[];
  ideas: Idea[];
  ameliorations: Amelioration[];
  ameliorationCategories: AmeliorationCategory[];
  contextCards: ContextCard[];
  onCardsChange: (cards: ContextCard[]) => void;
  onIdeasChange: (ideas: Idea[]) => void;
  onAmeliorationsChange: (ameliorations: Amelioration[]) => void;
  onAmeliorationCategoriesChange: (categories: AmeliorationCategory[]) => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onOpenNewNote: () => void;
  onChange: (tabId: TabId, value: string) => void;
  tokens: ThemeTokens;
}

export default function DocContentPanel({
  activeTab,
  currentTab,
  loading,
  contents,
  tabs,
  notes,
  ideas,
  ameliorations,
  ameliorationCategories,
  contextCards,
  onCardsChange,
  onIdeasChange,
  onAmeliorationsChange,
  onAmeliorationCategoriesChange,
  onEditNote,
  onDeleteNote,
  onOpenNewNote,
  onChange,
  tokens,
}: DocContentPanelProps) {
  if (!currentTab) return null;

  return (
    <>
      {activeTab !== 'idees' && activeTab !== 'ameliorations' && activeTab !== 'contexte-chatgpt' && activeTab !== 'documentation-generale' && activeTab !== 'structure-crm' && activeTab !== 'audit-technique' && <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span style={{ color: tokens.accent.text }}>{currentTab.icon}</span>
          <h2 className="text-sm font-semibold" style={{ color: tokens.text.secondary }}>{currentTab.label}</h2>
        </div>
      </div>}
      {loading && activeTab !== 'idees' && activeTab !== 'contexte-chatgpt' && activeTab !== 'documentation-generale' ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: tokens.accent.border }} />
        </div>
      ) : activeTab === 'contexte-chatgpt' ? (
        <div className="flex flex-col flex-1 min-h-0 gap-4">
          <div className="flex-1 min-h-0">
            <ContextCardsView cards={contextCards} onCardsChange={onCardsChange} />
          </div>

          <div className="flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: tokens.tab.sectionLabel }}>
                Notes
              </p>
              <button
                onClick={onOpenNewNote}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 self-start sm:self-auto"
                style={{
                  background: tokens.accent.bg,
                  border: `1px solid ${tokens.accent.border}`,
                  color: tokens.accent.text,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.borderColor = tokens.accent.border; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.borderColor = tokens.accent.border; }}
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle note
              </button>
            </div>
            <NotesList
              notes={notes}
              onEdit={onEditNote}
              onDelete={onDeleteNote}
            />
          </div>
        </div>
      ) : activeTab === 'documentation-generale' ? (
        <DocGeneraleView
          tabs={tabs.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
          contents={contents}
          contextCards={contextCards}
          ideas={ideas.map((i) => ({ id: i.id, title: i.title, content: i.content, status: i.status }))}
          ameliorations={ameliorations.map((a) => ({ id: a.id, title: a.title, description: a.description, status: a.status, category_id: a.category_id }))}
          ameliorationCategories={ameliorationCategories.map((c) => ({ id: c.id, name: c.name, position: c.position }))}
        />
      ) : activeTab === 'ameliorations' ? (
        <AmeliorationsView ameliorations={ameliorations} categories={ameliorationCategories} onAmeliorationsChange={onAmeliorationsChange} onCategoriesChange={onAmeliorationCategoriesChange} />
      ) : activeTab === 'idees' ? (
        <IdeasView ideas={ideas} onIdeasChange={onIdeasChange} />
      ) : activeTab === 'technologies' ? (
        <TechnologiesView
          content={contents['technologies']}
          onChange={(value) => onChange('technologies', value)}
        />
      ) : activeTab === 'audit-technique' ? (
        <AuditTechniqueView />
      ) : activeTab === 'structure-crm' ? (
        <StructureCrmView />
      ) : activeTab === 'base-de-donnees' ? (
        <DatabaseView />
      ) : (
        <textarea
          className="flex-1 min-h-0 w-full resize-none text-sm leading-relaxed font-mono outline-none transition-all duration-150"
          style={{
            background: tokens.surface.tertiary,
            border: `1px solid ${tokens.surface.border}`,
            borderRadius: '10px',
            padding: '16px 18px',
            color: tokens.text.secondary,
            caretColor: tokens.input.text,
          }}
          placeholder={PLACEHOLDER[activeTab!]}
          value={contents[activeTab!]}
          onChange={(e) => onChange(activeTab!, e.target.value)}
          spellCheck={false}
          onFocus={(e) => {
            e.currentTarget.style.border = `1px solid ${tokens.accent.border}`;
            e.currentTarget.style.background = tokens.accent.bg;
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = `1px solid ${tokens.surface.border}`;
            e.currentTarget.style.background = tokens.surface.tertiary;
          }}
        />
      )}
    </>
  );
}
