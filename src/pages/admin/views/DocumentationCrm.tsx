import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle, Loader2, Save, Menu, ChevronLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import NoteModal, { NoteFormData } from './notes/NoteModal';
import { Note } from './notes/NotesList';
import { Idea } from './ideas/IdeasView';
import { Amelioration, AmeliorationCategory } from './ameliorations/AmeliorationsView';
import { ContextCard } from './documentation/ContextCardsView';
import ImportExportPanel from './documentation/ImportExportPanel';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { TabId, Tab, SaveStatus, ActiveSection, TABS_DEFAULT, PLACEHOLDER, CONTEXTE_CHATGPT_INITIAL, SidebarItem, SidebarSeparator, SEPARATOR_ID, isSeparator } from './documentation/docCrmTypes';
import DocSidebarSections from './documentation/DocSidebarSections';
import DocContentPanel from './documentation/DocContentPanel';

interface DocumentationCrmProps { initialTab?: string; onInitialTabConsumed?: () => void; }

export default function DocumentationCrm({ initialTab, onInitialTabConsumed }: DocumentationCrmProps) {
  const tokens = useThemeTokens();
  const [activeSection, setActiveSection] = useState<ActiveSection>(() => {
    if (initialTab && TABS_DEFAULT.some((t) => t.id === initialTab)) return { kind: 'doc', tabId: initialTab as TabId };
    return { kind: 'doc', tabId: 'contexte-chatgpt' };
  });
  const activeTab: TabId | null = activeSection.kind === 'doc' ? activeSection.tabId : null;
  const [contents, setContents] = useState<Record<TabId, string>>(() => Object.fromEntries(TABS_DEFAULT.map((t) => [t.id, ''])) as Record<TabId, string>);
  const [saveStatus, setSaveStatus] = useState<Record<TabId, SaveStatus>>(() => Object.fromEntries(TABS_DEFAULT.map((t) => [t.id, 'idle'])) as Record<TabId, SaveStatus>);
  const [loading, setLoading] = useState(true);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const currentStatus = activeTab ? saveStatus[activeTab] : 'idle';
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ameliorations, setAmeliorations] = useState<Amelioration[]>([]);
  const [ameliorationCategories, setAmeliorationCategories] = useState<AmeliorationCategory[]>([]);
  const [contextCards, setContextCards] = useState<ContextCard[]>([]);
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([...TABS_DEFAULT]);
  const [mobileDocOpen, setMobileDocOpen] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const [{ data: docData }, { data: notesData }, { data: orderData }, { data: ideasData }, { data: ameliorationsData }, { data: ameliorationCatsData }, { data: contextCardsData }, { data: labelData }] = await Promise.all([
      supabase.from('crm_documentation').select('tab_id, content'),
      supabase.from('crm_notes').select('*').order('note_date', { ascending: false }).order('time_start', { ascending: false }),
      supabase.from('sidebar_order').select('group_id, item_key, position').eq('group_id', 'docs').order('position', { ascending: true }),
      supabase.from('crm_ideas').select('*').order('position', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('crm_ameliorations').select('*').order('position', { ascending: true }),
      supabase.from('crm_amelioration_categories').select('*').order('position', { ascending: true }),
      supabase.from('crm_context_cards').select('*').order('position', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('doc_tab_labels').select('tab_id, label'),
    ]);
    const customLabels: Record<string, string> = {};
    if (labelData) for (const row of labelData) { if (row.label) customLabels[row.tab_id] = row.label; }
    if (docData) {
      const loaded = Object.fromEntries(TABS_DEFAULT.map((t) => [t.id, ''])) as Record<TabId, string>;
      for (const row of docData) { if (row.tab_id in loaded && row.tab_id !== 'documentation-generale') loaded[row.tab_id as TabId] = row.content ?? ''; }
      if (!docData.find((r) => r.tab_id === 'contexte-chatgpt')) loaded['contexte-chatgpt'] = CONTEXTE_CHATGPT_INITIAL;
      if (!docData.find((r) => r.tab_id === 'technologies') || !loaded['technologies']) loaded['technologies'] = PLACEHOLDER['technologies'];
      setContents(loaded);
    }
    const applyLabels = (items: SidebarItem[]): SidebarItem[] => items.map((item) => {
      if (isSeparator(item)) return item;
      return customLabels[item.id] ? { ...item, label: customLabels[item.id] } : item;
    });
    const separator: SidebarSeparator = { id: SEPARATOR_ID, kind: 'separator' };
    if (orderData && orderData.length > 0) {
      const reordered: SidebarItem[] = [];
      for (const row of orderData) {
        if (row.item_key === SEPARATOR_ID) { reordered.push(separator); continue; }
        const found = TABS_DEFAULT.find((t) => t.id === row.item_key);
        if (found) reordered.push({ ...found });
      }
      for (const tab of TABS_DEFAULT) { if (!reordered.find((t) => t.id === tab.id)) reordered.push({ ...tab }); }
      if (!reordered.find((t) => t.id === SEPARATOR_ID)) reordered.splice(4, 0, separator);
      setSidebarItems(applyLabels(reordered));
    } else {
      const defaultItems: SidebarItem[] = [...TABS_DEFAULT];
      defaultItems.splice(4, 0, separator);
      setSidebarItems(applyLabels(defaultItems));
    }
    if (notesData) setNotes(notesData as Note[]);
    if (ideasData) setIdeas(ideasData as Idea[]);
    if (ameliorationsData) setAmeliorations(ameliorationsData as Amelioration[]);
    if (ameliorationCatsData) setAmeliorationCategories(ameliorationCatsData as AmeliorationCategory[]);
    if (contextCardsData) setContextCards(contextCardsData as ContextCard[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);
  useEffect(() => { if (initialTab && TABS_DEFAULT.some((t) => t.id === initialTab)) { setActiveSection({ kind: 'doc', tabId: initialTab as TabId }); onInitialTabConsumed?.(); } }, [initialTab, onInitialTabConsumed]);

  const handleChange = useCallback((tabId: TabId, value: string) => {
    setContents((prev) => ({ ...prev, [tabId]: value })); setSaveStatus((prev) => ({ ...prev, [tabId]: 'saving' }));
    if (saveTimers.current[tabId]) clearTimeout(saveTimers.current[tabId]);
    saveTimers.current[tabId] = setTimeout(async () => {
      const { error } = await supabase.from('crm_documentation').upsert({ tab_id: tabId, content: value }, { onConflict: 'tab_id' });
      setSaveStatus((prev) => ({ ...prev, [tabId]: error ? 'error' : 'saved' }));
      if (!error) setTimeout(() => { setSaveStatus((prev) => prev[tabId] === 'saved' ? { ...prev, [tabId]: 'idle' } : prev); }, 2000);
    }, 900);
  }, []);

  const tabs = sidebarItems.filter((item): item is Tab => !isSeparator(item));
  const currentTab = activeTab ? tabs.find((t) => t.id === activeTab) ?? null : null;
  const sortNotes = (a: Note, b: Note) => { if (b.note_date !== a.note_date) return b.note_date.localeCompare(a.note_date); return (b.time_start || '').localeCompare(a.time_start || ''); };
  const handleSaveNote = useCallback(async (data: NoteFormData) => {
    if (editingNote) { const { data: updated, error } = await supabase.from('crm_notes').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editingNote.id).select().single(); if (!error && updated) setNotes((prev) => prev.map((n) => n.id === editingNote.id ? (updated as Note) : n).sort(sortNotes)); }
    else { const { data: inserted, error } = await supabase.from('crm_notes').insert(data).select().single(); if (!error && inserted) setNotes((prev) => [inserted as Note, ...prev].sort(sortNotes)); }
    setNoteModalOpen(false); setEditingNote(null);
  }, [editingNote]);
  const handleDeleteNote = useCallback(async (id: string) => { await supabase.from('crm_notes').delete().eq('id', id); setNotes((prev) => prev.filter((n) => n.id !== id)); }, []);

  const handleReorder = useCallback(async (reordered: SidebarItem[]) => {
    setSidebarItems(reordered);
    const rows = reordered.map((item, i) => ({ group_id: 'docs', item_key: item.id, position: i }));
    await supabase.from('sidebar_order').delete().eq('group_id', 'docs');
    await supabase.from('sidebar_order').insert(rows);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: tokens.text.primary }}>Documentation CRM</h1>
          <p className="text-sm mt-0.5" style={{ color: tokens.text.tertiary }}>Referentiel interne -- architecture, process et conventions</p>
          <div className="mt-2"><ImportExportPanel onImportComplete={loadAllData} /></div>
        </div>
        {activeSection.kind === 'doc' && activeTab !== 'documentation-generale' && activeTab !== 'idees' && activeTab !== 'ameliorations' && activeTab !== 'contexte-chatgpt' && activeTab !== 'audit-technique' && (
          <div className="flex items-center gap-2 text-xs font-medium h-7 px-3 rounded-lg transition-all duration-300" style={{ background: currentStatus === 'saved' ? tokens.success.bg : currentStatus === 'saving' ? tokens.accent.bg : currentStatus === 'error' ? tokens.danger.bg : 'transparent', border: currentStatus === 'idle' ? '1px solid transparent' : currentStatus === 'saved' ? `1px solid ${tokens.success.border}` : currentStatus === 'saving' ? `1px solid ${tokens.accent.border}` : `1px solid ${tokens.danger.border}` }}>
            {currentStatus === 'saving' && (<><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" style={{ color: tokens.accent.text }} /><span style={{ color: tokens.accent.text }}>Enregistrement…</span></>)}
            {currentStatus === 'saved' && (<><CheckCircle className="w-3.5 h-3.5 mr-1.5" style={{ color: tokens.success.text }} /><span style={{ color: tokens.success.text }}>Enregistré</span></>)}
            {currentStatus === 'error' && (<><AlertTriangle className="w-3.5 h-3.5 mr-1.5" style={{ color: tokens.danger.text }} /><span style={{ color: tokens.danger.text }}>Erreur de sauvegarde</span></>)}
            {currentStatus === 'idle' && (<><Save className="w-3.5 h-3.5 mr-1.5" style={{ color: tokens.text.quaternary }} /><span style={{ color: tokens.text.quaternary }}>Sauvegarde auto</span></>)}
          </div>
        )}
      </div>
      <div className="flex flex-1 min-h-0 rounded-2xl overflow-hidden relative" style={{ background: tokens.tab.bg, border: `1px solid ${tokens.tab.border}` }}>
        {/* Mobile: hamburger button */}
        <button
          onClick={() => setMobileDocOpen(true)}
          className="md:hidden absolute top-3 left-3 z-30 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.tertiary }}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Mobile: overlay */}
        {mobileDocOpen && (
          <div className="fixed inset-0 z-40 md:hidden" style={{ background: tokens.modal.overlayBg }} onClick={() => setMobileDocOpen(false)} />
        )}

        {/* Sidebar: always visible on desktop, drawer on mobile */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col py-4 overflow-y-auto transition-transform duration-300
            md:relative md:z-auto md:w-[200px] md:translate-x-0 md:transition-none md:flex-shrink-0
            ${mobileDocOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          style={{ background: tokens.tab.bg, borderRight: `1px solid ${tokens.surface.borderLight}` }}
        >
          {/* Mobile close button */}
          <button
            onClick={() => setMobileDocOpen(false)}
            className="md:hidden flex items-center gap-2 px-4 mb-3 text-xs font-medium transition-colors"
            style={{ color: tokens.text.tertiary }}
          >
            <ChevronLeft className="w-4 h-4" />
            Fermer
          </button>
          <DocSidebarSections
            items={sidebarItems}
            activeSection={activeSection}
            saveStatus={saveStatus}
            setActiveSection={(section) => { setActiveSection(section); setMobileDocOpen(false); }}
            onReorder={handleReorder}
            tokens={tokens}
          />
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-3 pt-14 md:p-5 md:pt-5">
          <DocContentPanel activeSection={activeSection} activeTab={activeTab} currentTab={currentTab} loading={loading} contents={contents} tabs={tabs} notes={notes} ideas={ideas} ameliorations={ameliorations} ameliorationCategories={ameliorationCategories} contextCards={contextCards} onCardsChange={setContextCards} onIdeasChange={setIdeas} onAmeliorationsChange={setAmeliorations} onAmeliorationCategoriesChange={setAmeliorationCategories} onEditNote={(note) => { setEditingNote(note); setNoteModalOpen(true); }} onDeleteNote={handleDeleteNote} onOpenNewNote={() => { setEditingNote(null); setNoteModalOpen(true); }} onChange={handleChange} tokens={tokens} />
        </div>
      </div>
      {noteModalOpen && (
        <NoteModal initial={editingNote ? { title: editingNote.title, content: editingNote.content, note_date: editingNote.note_date, time_start: editingNote.time_start, time_end: editingNote.time_end } : undefined} onSave={handleSaveNote} onClose={() => { setNoteModalOpen(false); setEditingNote(null); }} />
      )}
    </div>
  );
}
