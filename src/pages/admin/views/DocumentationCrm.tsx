import { useState, useEffect, useCallback, useRef } from 'react';
import { Database, AlertTriangle, CheckCircle, Loader2, Save, Cpu, Zap, FlaskConical, FolderOpen, TrendingUp, Bot, Copy, Home, BarChart2, UserPlus, Upload, PlusCircle, Table2, UserCog, List, MessageSquare, Calendar, CalendarCheck, Tag, Plus, BookOpen, Pencil, X, GripVertical, ArrowUpDown, Lightbulb, Type, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import NoteModal, { NoteFormData } from './notes/NoteModal';
import NotesList, { Note } from './notes/NotesList';
import IdeasView, { Idea } from './ideas/IdeasView';
import ContextCardsView, { ContextCard } from './documentation/ContextCardsView';
import TechnologiesView from './documentation/TechnologiesView';
import DatabaseView from './documentation/DatabaseView';
import ImportExportPanel from './documentation/ImportExportPanel';

const TABS_DEFAULT = [
  { id: 'contexte-chatgpt', label: 'Contexte ChatGPT', icon: <Bot className="w-4 h-4" /> },
  { id: 'technologies', label: 'Technologies', icon: <Cpu className="w-4 h-4" /> },
  { id: 'base-de-donnees', label: 'Base de données', icon: <Database className="w-4 h-4" /> },
  { id: 'optimisations', label: 'Optimisations réalisées', icon: <Zap className="w-4 h-4" /> },
  { id: 'points-ameliorer', label: 'Points à améliorer', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'tests', label: 'Tests à faire', icon: <FlaskConical className="w-4 h-4" /> },
  { id: 'structure-crm', label: 'Structure du CRM', icon: <FolderOpen className="w-4 h-4" /> },
  { id: 'documentation-generale', label: 'Documentation générale', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'idees', label: 'Idées', icon: <Lightbulb className="w-4 h-4" /> },
] as const;

type TabId = (typeof TABS_DEFAULT)[number]['id'];

type Tab = { id: TabId; label: string; icon: React.ReactNode };

const CRM_PAGES_DEFAULT = [
  { label: "Page d'accueil", icon: <Home className="w-3.5 h-3.5" /> },
  { label: "Vue d'ensemble", icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { label: 'Inscriptions', icon: <UserPlus className="w-3.5 h-3.5" /> },
  { label: 'Import de leads', icon: <Upload className="w-3.5 h-3.5" /> },
  { label: 'Ajouter leads', icon: <PlusCircle className="w-3.5 h-3.5" /> },
  { label: 'CRM', icon: <Table2 className="w-3.5 h-3.5" /> },
  { label: 'Ajouter vendeur', icon: <UserCog className="w-3.5 h-3.5" /> },
  { label: 'Liste vendeurs', icon: <List className="w-3.5 h-3.5" /> },
  { label: 'Chat client', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { label: 'Chat vendeur', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { label: 'Agenda', icon: <Calendar className="w-3.5 h-3.5" /> },
  { label: 'Propositions RDV', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
  { label: 'Statuts', icon: <Tag className="w-3.5 h-3.5" /> },
];

type CrmPage = { label: string; icon: React.ReactNode };

const CONTEXTE_CHATGPT_INITIAL = `Projet : CRM SaaS en développement

Technologies :
- Frontend : React + TypeScript + Vite
- UI : Tailwind CSS
- Base de données : Supabase (PostgreSQL)
- Realtime : Bolt Realtime
- Auth : Bolt Auth

Architecture générale :
Le CRM possède trois dashboards principaux :
- Admin
- Vendeur
- Client

Fonctionnalités principales :
- gestion complète des leads
- import CSV avec validation et déduplication
- attribution des leads aux vendeurs
- statuts personnalisés
- chat admin / vendeur / client
- agenda et propositions de rendez-vous
- dashboard avec indicateurs et realtime

Base de données principale :
Tables importantes :
- leads
- vendors
- import_history
- statuts
- client_messages
- vendor_admin_messages
- rdv_proposals
- registrations

Fonctionnalités d'import de leads :
- parsing CSV
- détection automatique des colonnes
- validation email / téléphone
- normalisation téléphone
- déduplication fichier et CRM
- historique des imports

Documentation CRM :
Un onglet "Documentation CRM" a été créé dans l'admin pour suivre l'architecture du projet.

Sections actuelles :
- Vue générale
- Structure du CRM
- Technologies
- Base de données
- Rôles et accès
- Optimisations réalisées
- Points à améliorer
- Tests à faire
- Contexte projet
- Contexte ChatGPT

Objectif du projet :
Créer un CRM solide et bien structuré qui pourra servir de base pour plusieurs projets SaaS différents.`;

const PLACEHOLDER: Record<TabId, string> = {
  'structure-crm': `Décrivez la structure du CRM.\n\nEx :\n- Organisation des modules\n- Flux de navigation\n- Hiérarchie des vues`,
  'technologies': `Technologies utilisées :\n\nFrontend :\n- React\n- TypeScript\n- Vite\n\nLanguages :\n- TypeScript\n- JavaScript\n- SQL\n- HTML\n- CSS\n\nStyling :\n- Tailwind CSS\n\nBackend / Base de données :\n- Supabase\n- PostgreSQL\n\nRealtime :\n- Supabase Realtime\n\nAuthentification :\n- Supabase Auth`,
  'base-de-donnees': `Documentez le schéma de base de données.\n\nEx :\n- Tables principales\n- Relations entre tables\n- Politiques RLS en place`,
  'optimisations': `Listez les optimisations déjà réalisées.\n\nEx :\n- Mise en place du Realtime sur la table leads\n- Index sur les colonnes fréquemment filtrées\n- Sauvegarde automatique avec debounce`,
  'points-ameliorer': `Identifiez les points à améliorer.\n\nEx :\n- Pagination des listes longues\n- Notifications push\n- Export CSV des rapports`,
  'tests': `Listez les tests à effectuer.\n\nEx :\n- Vérifier les politiques RLS pour chaque rôle\n- Tester la sauvegarde automatique en cas de déconnexion\n- Valider l'affichage sur mobile`,
  'contexte-chatgpt': CONTEXTE_CHATGPT_INITIAL,
  'documentation-generale': `Écrivez ici la documentation générale du projet…`,
  'idees': '',
};

const DOC_GENERALE_SOURCES: TabId[] = [
  'contexte-chatgpt',
  'technologies',
  'base-de-donnees',
  'optimisations',
  'points-ameliorer',
  'tests',
  'structure-crm',
];

const DOC_GENERALE_LABELS: Record<string, string> = {
  'contexte-chatgpt': 'Contexte ChatGPT',
  'technologies': 'Technologies',
  'base-de-donnees': 'Base de données',
  'optimisations': 'Optimisations réalisées',
  'points-ameliorer': 'Points à améliorer',
  'tests': 'Tests à faire',
  'structure-crm': 'Structure du CRM',
};

function buildDocGenerale(contents: Record<TabId, string>): string {
  return DOC_GENERALE_SOURCES
    .map((id) => {
      const body = contents[id]?.trim();
      if (!body) return null;
      return `## ${DOC_GENERALE_LABELS[id]}\n\n${body}`;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type ActiveSection = { kind: 'doc'; tabId: TabId } | { kind: 'page'; label: string };

export default function DocumentationCrm() {
  const [activeSection, setActiveSection] = useState<ActiveSection>({ kind: 'doc', tabId: 'contexte-chatgpt' });
  const activeTab: TabId | null = activeSection.kind === 'doc' ? activeSection.tabId : null;
  const [contents, setContents] = useState<Record<TabId, string>>(() =>
    Object.fromEntries(TABS_DEFAULT.map((t) => [t.id, ''])) as Record<TabId, string>
  );
  const [saveStatus, setSaveStatus] = useState<Record<TabId, SaveStatus>>(
    () => Object.fromEntries(TABS_DEFAULT.map((t) => [t.id, 'idle'])) as Record<TabId, SaveStatus>
  );
  const [loading, setLoading] = useState(true);
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [docEditMode, setDocEditMode] = useState(false);
  const [docEditDraft, setDocEditDraft] = useState('');
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const currentStatus = activeTab ? saveStatus[activeTab] : 'idle';

  const [notes, setNotes] = useState<Note[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [contextCards, setContextCards] = useState<ContextCard[]>([]);

  const [tabs, setTabs] = useState<Tab[]>([...TABS_DEFAULT]);
  const [crmPages, setCrmPages] = useState<CrmPage[]>([...CRM_PAGES_DEFAULT]);
  const [reorderMode, setReorderMode] = useState(false);
  const [renameMode, setRenameMode] = useState(false);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [renameSaving, setRenameSaving] = useState<Record<string, boolean>>({});

  const dragGroup = useRef<'docs' | 'pages' | null>(null);
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const [{ data: docData }, { data: notesData }, { data: orderData }, { data: ideasData }, { data: contextCardsData }, { data: labelData }] = await Promise.all([
      supabase.from('crm_documentation').select('tab_id, content'),
      supabase.from('crm_notes').select('*').order('note_date', { ascending: false }).order('time_start', { ascending: false }),
      supabase.from('sidebar_order').select('group_id, item_key, position').order('position', { ascending: true }),
      supabase.from('crm_ideas').select('*').order('position', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('crm_context_cards').select('*').order('position', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('doc_tab_labels').select('tab_id, label'),
    ]);

    const customLabels: Record<string, string> = {};
    if (labelData) {
      for (const row of labelData) {
        if (row.label) customLabels[row.tab_id] = row.label;
      }
    }

    if (docData) {
      const loaded = Object.fromEntries(TABS_DEFAULT.map((t) => [t.id, ''])) as Record<TabId, string>;
      for (const row of docData) {
        if (row.tab_id in loaded && row.tab_id !== 'documentation-generale') {
          loaded[row.tab_id as TabId] = row.content ?? '';
        }
      }
      if (!docData.find((r) => r.tab_id === 'contexte-chatgpt')) {
        loaded['contexte-chatgpt'] = CONTEXTE_CHATGPT_INITIAL;
      }
      if (!docData.find((r) => r.tab_id === 'technologies') || !loaded['technologies']) {
        loaded['technologies'] = PLACEHOLDER['technologies'];
      }
      loaded['documentation-generale'] = buildDocGenerale(loaded);
      setContents(loaded);
    }

    const applyLabels = (tabList: Tab[]): Tab[] =>
      tabList.map((t) => customLabels[t.id] ? { ...t, label: customLabels[t.id] } : t);

    if (orderData && orderData.length > 0) {
      const docsOrder = orderData.filter((r) => r.group_id === 'docs').sort((a, b) => a.position - b.position);
      const pagesOrder = orderData.filter((r) => r.group_id === 'pages').sort((a, b) => a.position - b.position);

      if (docsOrder.length > 0) {
        const reordered: Tab[] = [];
        for (const row of docsOrder) {
          const found = TABS_DEFAULT.find((t) => t.id === row.item_key);
          if (found) reordered.push({ ...found });
        }
        for (const tab of TABS_DEFAULT) {
          if (!reordered.find((t) => t.id === tab.id)) reordered.push({ ...tab });
        }
        setTabs(applyLabels(reordered));
      } else {
        setTabs(applyLabels([...TABS_DEFAULT]));
      }

      if (pagesOrder.length > 0) {
        const reordered: CrmPage[] = [];
        for (const row of pagesOrder) {
          const found = CRM_PAGES_DEFAULT.find((p) => p.label === row.item_key);
          if (found) reordered.push({ ...found });
        }
        for (const page of CRM_PAGES_DEFAULT) {
          if (!reordered.find((p) => p.label === page.label)) reordered.push({ ...page });
        }
        setCrmPages(reordered);
      }
    } else {
      setTabs(applyLabels([...TABS_DEFAULT]));
    }

    if (notesData) setNotes(notesData as Note[]);
    if (ideasData) setIdeas(ideasData as Idea[]);
    if (contextCardsData) setContextCards(contextCardsData as ContextCard[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (loading) return;
    setContents((prev) => {
      const generated = buildDocGenerale(prev);
      if (prev['documentation-generale'] === generated) return prev;
      return { ...prev, 'documentation-generale': generated };
    });
  }, [
    contents['contexte-chatgpt'],
    contents['technologies'],
    contents['base-de-donnees'],
    contents['optimisations'],
    contents['points-ameliorer'],
    contents['tests'],
    contents['structure-crm'],
    loading,
  ]);

  const saveOrder = useCallback(async (newTabs: Tab[], newPages: CrmPage[]) => {
    const rows = [
      ...newTabs.map((t, i) => ({ group_id: 'docs', item_key: t.id, position: i })),
      ...newPages.map((p, i) => ({ group_id: 'pages', item_key: p.label, position: i })),
    ];
    await supabase.from('sidebar_order').upsert(rows, { onConflict: 'group_id,item_key' });
  }, []);

  const handleDragStart = useCallback((group: 'docs' | 'pages', index: number) => {
    dragGroup.current = group;
    dragIndex.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  }, []);

  const handleDrop = useCallback((group: 'docs' | 'pages') => {
    if (dragGroup.current !== group) return;
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;

    if (group === 'docs') {
      const next = [...tabs];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      setTabs(next);
      saveOrder(next, crmPages);
    } else {
      const next = [...crmPages];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      setCrmPages(next);
      saveOrder(tabs, next);
    }

    dragIndex.current = null;
    dragOverIndex.current = null;
    dragGroup.current = null;
  }, [tabs, crmPages, saveOrder]);

  const handleStartRename = useCallback(() => {
    setRenameDrafts(Object.fromEntries(tabs.map((t) => [t.id, t.label])));
    setRenameMode(true);
  }, [tabs]);

  const handleConfirmRename = useCallback(async (tabId: TabId) => {
    const newLabel = (renameDrafts[tabId] || '').trim();
    if (!newLabel) return;
    const defaultLabel = TABS_DEFAULT.find((t) => t.id === tabId)?.label || '';
    const isDefault = newLabel === defaultLabel;

    setRenameSaving((prev) => ({ ...prev, [tabId]: true }));

    if (isDefault) {
      await supabase.from('doc_tab_labels').delete().eq('tab_id', tabId);
    } else {
      await supabase.from('doc_tab_labels').upsert({ tab_id: tabId, label: newLabel }, { onConflict: 'tab_id' });
    }

    setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, label: newLabel } : t));
    setRenameSaving((prev) => ({ ...prev, [tabId]: false }));
  }, [renameDrafts]);

  const handleFinishRename = useCallback(() => {
    setRenameMode(false);
    setRenameDrafts({});
  }, []);

  const handleChange = useCallback(
    (tabId: TabId, value: string) => {
      setContents((prev) => ({ ...prev, [tabId]: value }));
      setSaveStatus((prev) => ({ ...prev, [tabId]: 'saving' }));

      if (saveTimers.current[tabId]) clearTimeout(saveTimers.current[tabId]);
      saveTimers.current[tabId] = setTimeout(async () => {
        const { error } = await supabase
          .from('crm_documentation')
          .upsert({ tab_id: tabId, content: value }, { onConflict: 'tab_id' });

        setSaveStatus((prev) => ({
          ...prev,
          [tabId]: error ? 'error' : 'saved',
        }));

        if (!error) {
          setTimeout(() => {
            setSaveStatus((prev) =>
              prev[tabId] === 'saved' ? { ...prev, [tabId]: 'idle' } : prev
            );
          }, 2000);
        }
      }, 900);
    },
    []
  );

  const handleCopyDoc = useCallback(async () => {
    await navigator.clipboard.writeText(contents['documentation-generale']);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  }, [contents]);

  const handleStartEditDoc = useCallback(() => {
    setDocEditDraft(contents['documentation-generale']);
    setDocEditMode(true);
  }, [contents]);

  const handleSaveDocEdit = useCallback(async () => {
    setContents((prev) => ({ ...prev, 'documentation-generale': docEditDraft }));
    setDocEditMode(false);
    await supabase
      .from('crm_documentation')
      .upsert({ tab_id: 'documentation-generale', content: docEditDraft }, { onConflict: 'tab_id' });
  }, [docEditDraft]);

  const handleCancelDocEdit = useCallback(() => {
    setDocEditMode(false);
    setDocEditDraft('');
  }, []);

  const currentTab = activeTab ? tabs.find((t) => t.id === activeTab) : null;

  const handleSaveNote = useCallback(async (data: NoteFormData) => {
    if (editingNote) {
      const { data: updated, error } = await supabase
        .from('crm_notes')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editingNote.id)
        .select()
        .single();
      if (!error && updated) {
        setNotes((prev) => prev.map((n) => n.id === editingNote.id ? (updated as Note) : n).sort(sortNotes));
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('crm_notes')
        .insert(data)
        .select()
        .single();
      if (!error && inserted) {
        setNotes((prev) => [inserted as Note, ...prev].sort(sortNotes));
      }
    }
    setNoteModalOpen(false);
    setEditingNote(null);
  }, [editingNote]);

  const handleDeleteNote = useCallback(async (id: string) => {
    await supabase.from('crm_notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  function sortNotes(a: Note, b: Note) {
    if (b.note_date !== a.note_date) return b.note_date.localeCompare(a.note_date);
    return (b.time_start || '').localeCompare(a.time_start || '');
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Documentation CRM</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Referentiel interne -- architecture, process et conventions
          </p>
          <div className="mt-2">
            <ImportExportPanel onImportComplete={loadAllData} />
          </div>
        </div>
        {activeSection.kind === 'doc' && activeTab !== 'documentation-generale' && activeTab !== 'idees' && activeTab !== 'contexte-chatgpt' && (
          <div
            className="flex items-center gap-2 text-xs font-medium h-7 px-3 rounded-lg transition-all duration-300"
            style={{
              background:
                currentStatus === 'saved'
                  ? 'rgba(34,197,94,0.1)'
                  : currentStatus === 'saving'
                  ? 'rgba(56,189,248,0.08)'
                  : currentStatus === 'error'
                  ? 'rgba(239,68,68,0.1)'
                  : 'transparent',
              border:
                currentStatus === 'idle'
                  ? '1px solid transparent'
                  : currentStatus === 'saved'
                  ? '1px solid rgba(34,197,94,0.3)'
                  : currentStatus === 'saving'
                  ? '1px solid rgba(56,189,248,0.2)'
                  : '1px solid rgba(239,68,68,0.3)',
            }}
          >
            {currentStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin mr-1.5" />
                <span className="text-cyan-400">Enregistrement…</span>
              </>
            )}
            {currentStatus === 'saved' && (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                <span className="text-emerald-400">Enregistré</span>
              </>
            )}
            {currentStatus === 'error' && (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 mr-1.5" />
                <span className="text-red-400">Erreur de sauvegarde</span>
              </>
            )}
            {currentStatus === 'idle' && (
              <>
                <Save className="w-3.5 h-3.5 text-slate-600 mr-1.5" />
                <span className="text-slate-600">Sauvegarde auto</span>
              </>
            )}
          </div>
        )}
      </div>

      <div
        className="flex flex-1 min-h-0 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1a 100%)',
          border: '1px solid rgba(56,189,248,0.08)',
        }}
      >
        <div
          className="flex flex-col flex-shrink-0 py-4"
          style={{
            width: '200px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="px-2 mb-3 flex flex-col gap-1.5">
            <button
              onClick={() => { setReorderMode((v) => !v); if (renameMode) handleFinishRename(); }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={
                reorderMode
                  ? { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }
                  : { background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.15)', color: 'rgba(148,163,184,0.6)' }
              }
              onMouseEnter={(e) => {
                if (!reorderMode) {
                  e.currentTarget.style.background = 'rgba(100,116,139,0.15)';
                  e.currentTarget.style.color = '#94a3b8';
                }
              }}
              onMouseLeave={(e) => {
                if (!reorderMode) {
                  e.currentTarget.style.background = 'rgba(100,116,139,0.08)';
                  e.currentTarget.style.color = 'rgba(148,163,184,0.6)';
                }
              }}
            >
              <ArrowUpDown className="w-3 h-3" />
              {reorderMode ? 'Terminer' : 'Réorganiser'}
            </button>
            <button
              onClick={() => { if (renameMode) { handleFinishRename(); } else { handleStartRename(); if (reorderMode) setReorderMode(false); } }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={
                renameMode
                  ? { background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', color: '#22d3ee' }
                  : { background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.15)', color: 'rgba(148,163,184,0.6)' }
              }
              onMouseEnter={(e) => {
                if (!renameMode) {
                  e.currentTarget.style.background = 'rgba(100,116,139,0.15)';
                  e.currentTarget.style.color = '#94a3b8';
                }
              }}
              onMouseLeave={(e) => {
                if (!renameMode) {
                  e.currentTarget.style.background = 'rgba(100,116,139,0.08)';
                  e.currentTarget.style.color = 'rgba(148,163,184,0.6)';
                }
              }}
            >
              <Type className="w-3 h-3" />
              {renameMode ? 'Terminer' : 'Renommer'}
            </button>
          </div>

          {reorderMode && (
            <div
              className="mx-3 mb-3 px-2.5 py-1.5 rounded-lg text-xs leading-tight"
              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)', color: 'rgba(251,191,36,0.6)' }}
            >
              Glisser pour réorganiser. L'ordre est sauvegardé automatiquement.
            </div>
          )}

          {renameMode && (
            <div
              className="mx-3 mb-3 px-2.5 py-1.5 rounded-lg text-xs leading-tight"
              style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.12)', color: 'rgba(34,211,238,0.6)' }}
            >
              Cliquez sur un nom pour le modifier, puis validez avec le bouton.
            </div>
          )}

          <p
            className="px-4 mb-2 text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(148,163,184,0.4)' }}
          >
            Sections
          </p>
          <nav className="flex flex-col gap-0.5 px-2">
            {tabs.map((tab, index) => {
              const isActive = activeSection.kind === 'doc' && activeSection.tabId === tab.id;
              const tabStatus = saveStatus[tab.id];
              return (
                <div
                  key={tab.id}
                  draggable={reorderMode}
                  onDragStart={() => handleDragStart('docs', index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop('docs')}
                  className={reorderMode ? 'cursor-grab active:cursor-grabbing' : ''}
                >
                  <button
                    onClick={() => { if (!reorderMode && !renameMode) setActiveSection({ kind: 'doc', tabId: tab.id }); }}
                    className="relative flex items-center gap-2.5 py-2 rounded-lg text-xs font-medium w-full text-left transition-all duration-150"
                    style={
                      isActive && !reorderMode && !renameMode
                        ? {
                            background: 'rgba(34,211,238,0.08)',
                            color: '#67e8f9',
                            borderLeft: '2px solid rgba(34,211,238,0.6)',
                            paddingLeft: '10px',
                            paddingRight: '8px',
                          }
                        : reorderMode
                        ? {
                            background: 'rgba(251,191,36,0.04)',
                            color: 'rgba(148,163,184,0.7)',
                            borderLeft: '2px solid rgba(251,191,36,0.2)',
                            paddingLeft: '10px',
                            paddingRight: '8px',
                          }
                        : renameMode
                        ? {
                            background: 'rgba(34,211,238,0.03)',
                            color: 'rgba(148,163,184,0.7)',
                            borderLeft: '2px solid rgba(34,211,238,0.15)',
                            paddingLeft: '10px',
                            paddingRight: '8px',
                          }
                        : {
                            color: 'rgba(148,163,184,0.7)',
                            borderLeft: '2px solid transparent',
                            paddingLeft: '10px',
                            paddingRight: '8px',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive && !reorderMode && !renameMode) e.currentTarget.style.color = '#e2e8f0';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !reorderMode && !renameMode) e.currentTarget.style.color = 'rgba(148,163,184,0.7)';
                    }}
                  >
                    {reorderMode ? (
                      <GripVertical className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(251,191,36,0.4)' }} />
                    ) : (
                      <span
                        className="flex-shrink-0"
                        style={{ color: isActive ? '#22d3ee' : 'rgba(100,116,139,0.8)' }}
                      >
                        {tab.icon}
                      </span>
                    )}
                    {renameMode ? (
                      <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={renameDrafts[tab.id] ?? tab.label}
                          onChange={(e) => setRenameDrafts((prev) => ({ ...prev, [tab.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmRename(tab.id); }}
                          className="flex-1 min-w-0 bg-transparent border-b text-xs outline-none py-0.5 px-0"
                          style={{ borderColor: 'rgba(34,211,238,0.3)', color: '#e2e8f0', caretColor: '#22d3ee' }}
                          autoFocus={index === 0}
                        />
                        <button
                          onClick={() => handleConfirmRename(tab.id)}
                          className="flex-shrink-0 p-0.5 rounded transition-colors"
                          style={{ color: renameSaving[tab.id] ? 'rgba(34,211,238,0.4)' : '#22d3ee' }}
                          disabled={renameSaving[tab.id]}
                        >
                          {renameSaving[tab.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                      </div>
                    ) : (
                      <span className="flex-1 truncate">{tab.label}</span>
                    )}
                    {!reorderMode && !renameMode && tabStatus === 'saving' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                    )}
                    {!reorderMode && !renameMode && tabStatus === 'saved' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    )}
                    {!reorderMode && !renameMode && tabStatus === 'error' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          <div className="mx-4 my-3" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

          <p
            className="px-4 mb-2 text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(148,163,184,0.4)' }}
          >
            CRM Pages
          </p>
          <nav className="flex flex-col gap-0.5 px-2">
            {crmPages.map((page, index) => {
              const isActive = activeSection.kind === 'page' && activeSection.label === page.label;
              return (
                <div
                  key={page.label}
                  draggable={reorderMode}
                  onDragStart={() => handleDragStart('pages', index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop('pages')}
                  className={reorderMode ? 'cursor-grab active:cursor-grabbing' : ''}
                >
                  <button
                    onClick={() => { if (!reorderMode) setActiveSection({ kind: 'page', label: page.label }); }}
                    className="relative flex items-center gap-2.5 py-1.5 rounded-lg text-xs font-medium w-full text-left transition-all duration-150"
                    style={
                      isActive && !reorderMode
                        ? {
                            background: 'rgba(34,211,238,0.08)',
                            color: '#67e8f9',
                            borderLeft: '2px solid rgba(34,211,238,0.6)',
                            paddingLeft: '10px',
                            paddingRight: '8px',
                          }
                        : reorderMode
                        ? {
                            background: 'rgba(251,191,36,0.04)',
                            color: 'rgba(100,116,139,0.7)',
                            borderLeft: '2px solid rgba(251,191,36,0.2)',
                            paddingLeft: '10px',
                            paddingRight: '8px',
                          }
                        : {
                            color: 'rgba(100,116,139,0.7)',
                            borderLeft: '2px solid transparent',
                            paddingLeft: '10px',
                            paddingRight: '8px',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive && !reorderMode) e.currentTarget.style.color = '#e2e8f0';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && !reorderMode) e.currentTarget.style.color = 'rgba(100,116,139,0.7)';
                    }}
                  >
                    {reorderMode ? (
                      <GripVertical className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(251,191,36,0.4)' }} />
                    ) : (
                      <span className="flex-shrink-0" style={{ color: isActive ? '#22d3ee' : 'rgba(71,85,105,0.9)' }}>
                        {page.icon}
                      </span>
                    )}
                    <span className="flex-1 truncate">{page.label}</span>
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col flex-1 min-h-0 p-5">
          {activeSection.kind === 'page' ? (
            <>
              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <span className="text-cyan-400">
                  {crmPages.find((p) => p.label === activeSection.label)?.icon}
                </span>
                <h2 className="text-sm font-semibold text-slate-200">{activeSection.label}</h2>
              </div>
              <div
                className="flex-1 flex flex-col items-center justify-center rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span className="text-slate-600 mb-2">
                  {crmPages.find((p) => p.label === activeSection.label)?.icon}
                </span>
                <p className="text-sm font-medium text-slate-500">{activeSection.label}</p>
                <p className="text-xs text-slate-700 mt-1">Contenu à venir</p>
              </div>
            </>
          ) : currentTab ? (
            <>
              {activeTab !== 'idees' && activeTab !== 'contexte-chatgpt' && <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">{currentTab.icon}</span>
                  <h2 className="text-sm font-semibold text-slate-200">{currentTab.label}</h2>
                  {activeTab === 'documentation-generale' && !docEditMode && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(34,211,238,0.07)', color: 'rgba(103,232,249,0.6)', border: '1px solid rgba(34,211,238,0.12)' }}
                    >
                      auto-générée
                    </span>
                  )}
                  {activeTab === 'documentation-generale' && docEditMode && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(251,191,36,0.07)', color: 'rgba(251,191,36,0.7)', border: '1px solid rgba(251,191,36,0.15)' }}
                    >
                      mode édition
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeTab === 'documentation-generale' && (
                    <>
                      {!docEditMode ? (
                        <>
                          <button
                            onClick={handleCopyDoc}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                            style={
                              copiedDoc
                                ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }
                                : { background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#67e8f9' }
                            }
                            onMouseEnter={(e) => { if (!copiedDoc) { e.currentTarget.style.background = 'rgba(34,211,238,0.14)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)'; } }}
                            onMouseLeave={(e) => { if (!copiedDoc) { e.currentTarget.style.background = 'rgba(34,211,238,0.08)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)'; } }}
                          >
                            {copiedDoc ? <><CheckCircle className="w-3.5 h-3.5" />Copie !</> : <><Copy className="w-3.5 h-3.5" />Copier la documentation</>}
                          </button>
                          <button
                            onClick={handleStartEditDoc}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                            style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#94a3b8' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.18)'; e.currentTarget.style.borderColor = 'rgba(100,116,139,0.35)'; e.currentTarget.style.color = '#e2e8f0'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.1)'; e.currentTarget.style.borderColor = 'rgba(100,116,139,0.2)'; e.currentTarget.style.color = '#94a3b8'; }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Modifier
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleSaveDocEdit}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.18)'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.25)'; }}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Enregistrer
                          </button>
                          <button
                            onClick={handleCancelDocEdit}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                          >
                            <X className="w-3.5 h-3.5" />
                            Annuler
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>}
              {loading && activeTab !== 'idees' && activeTab !== 'contexte-chatgpt' ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-cyan-400/40 animate-spin" />
                </div>
              ) : activeTab === 'contexte-chatgpt' ? (
                <div className="flex flex-col flex-1 min-h-0 gap-4">
                  <div className="flex-1 min-h-0">
                    <ContextCardsView cards={contextCards} onCardsChange={setContextCards} />
                  </div>

                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(148,163,184,0.4)' }}>
                        Notes
                      </p>
                      <button
                        onClick={() => { setEditingNote(null); setNoteModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                        style={{
                          background: 'rgba(34,211,238,0.08)',
                          border: '1px solid rgba(34,211,238,0.2)',
                          color: '#67e8f9',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,211,238,0.14)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,211,238,0.08)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)'; }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nouvelle note
                      </button>
                    </div>
                    <NotesList
                      notes={notes}
                      onEdit={(note) => { setEditingNote(note); setNoteModalOpen(true); }}
                      onDelete={handleDeleteNote}
                    />
                  </div>
                </div>
              ) : activeTab === 'documentation-generale' ? (
                docEditMode ? (
                  <textarea
                    className="flex-1 min-h-0 w-full resize-none text-sm leading-relaxed font-mono outline-none transition-all duration-150"
                    style={{
                      background: 'rgba(34,211,238,0.02)',
                      border: '1px solid rgba(34,211,238,0.25)',
                      borderRadius: '10px',
                      padding: '16px 18px',
                      color: '#e2e8f0',
                      caretColor: '#22d3ee',
                    }}
                    value={docEditDraft}
                    onChange={(e) => setDocEditDraft(e.target.value)}
                    spellCheck={false}
                    autoFocus
                  />
                ) : (
                  <div
                    className="flex-1 min-h-0 w-full overflow-y-auto text-sm leading-relaxed font-mono"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      padding: '16px 18px',
                      color: '#cbd5e1',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {contents['documentation-generale'] ? (
                      contents['documentation-generale'].split('\n').map((line, i) => {
                        if (line.startsWith('## ')) {
                          return (
                            <p key={i} className="text-cyan-300 font-semibold mt-4 mb-1 first:mt-0">
                              {line.replace(/^## /, '')}
                            </p>
                          );
                        }
                        if (line === '---') {
                          return <hr key={i} className="my-3 border-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />;
                        }
                        return <p key={i} className={line === '' ? 'h-3' : ''}>{line || '\u00A0'}</p>;
                      })
                    ) : (
                      <span className="text-slate-600 italic">
                        Renseignez les sections sources pour générer automatiquement la documentation.
                      </span>
                    )}
                  </div>
                )
              ) : activeTab === 'idees' ? (
                <IdeasView ideas={ideas} onIdeasChange={setIdeas} />
              ) : activeTab === 'technologies' ? (
                <TechnologiesView
                  content={contents['technologies']}
                  onChange={(value) => handleChange('technologies', value)}
                />
              ) : activeTab === 'base-de-donnees' ? (
                <DatabaseView />
              ) : (
                <textarea
                  className="flex-1 min-h-0 w-full resize-none text-sm leading-relaxed font-mono outline-none transition-all duration-150"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '16px 18px',
                    color: '#e2e8f0',
                    caretColor: '#22d3ee',
                  }}
                  placeholder={PLACEHOLDER[activeTab!]}
                  value={contents[activeTab!]}
                  onChange={(e) => handleChange(activeTab!, e.target.value)}
                  spellCheck={false}
                  onFocus={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(34,211,238,0.25)';
                    e.currentTarget.style.background = 'rgba(34,211,238,0.02)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                />
              )}
            </>
          ) : null}
        </div>
      </div>

      {noteModalOpen && (
        <NoteModal
          initial={editingNote ? {
            title: editingNote.title,
            content: editingNote.content,
            note_date: editingNote.note_date,
            time_start: editingNote.time_start,
            time_end: editingNote.time_end,
          } : undefined}
          onSave={handleSaveNote}
          onClose={() => { setNoteModalOpen(false); setEditingNote(null); }}
        />
      )}
    </div>
  );
}
