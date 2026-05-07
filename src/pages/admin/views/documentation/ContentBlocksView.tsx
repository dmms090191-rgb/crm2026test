import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Loader2, Check, GripVertical } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import ContentBlockItem from './ContentBlockItem';
import ContentBlocksStatsBar from './ContentBlocksStatsBar';
import type { ContentBlock, BlockTask, BlockInfo, TaskStatus } from './contentBlocksTypes';

interface Props {
  pageKey: string;
}

export default function ContentBlocksView({ pageKey }: Props) {
  const tokens = useThemeTokens();

  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [tasksByBlock, setTasksByBlock] = useState<Record<string, BlockTask[]>>({});
  const [infosByBlock, setInfosByBlock] = useState<Record<string, BlockInfo[]>>({});
  const [loading, setLoading] = useState(true);

  const [showAddBlock, setShowAddBlock] = useState(false);
  const [blockForm, setBlockForm] = useState({ title: '', utility: '' });
  const [savingBlock, setSavingBlock] = useState(false);

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editBlockForm, setEditBlockForm] = useState({ title: '', utility: '' });

  const [addingTaskBlockId, setAddingTaskBlockId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [addingInfoBlockId, setAddingInfoBlockId] = useState<string | null>(null);
  const [newInfoText, setNewInfoText] = useState('');

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [editingInfoId, setEditingInfoId] = useState<string | null>(null);
  const [editInfoText, setEditInfoText] = useState('');

  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});
  const [reorderMode, setReorderMode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: blocksData } = await supabase.from('content_blocks').select('*').eq('page_key', pageKey).order('position').order('created_at');
    const blockIds = (blocksData || []).map((b: ContentBlock) => b.id);
    const [{ data: tasksData }, { data: infosData }] = blockIds.length > 0
      ? await Promise.all([
          supabase.from('content_block_tasks').select('*').in('block_id', blockIds).order('position').order('created_at'),
          supabase.from('content_block_infos').select('*').in('block_id', blockIds).order('position').order('created_at'),
        ])
      : [{ data: [] }, { data: [] }];
    if (blocksData) setBlocks(blocksData as ContentBlock[]);
    const tMap: Record<string, BlockTask[]> = {};
    if (tasksData) { for (const t of tasksData as BlockTask[]) { if (!tMap[t.block_id]) tMap[t.block_id] = []; tMap[t.block_id].push(t); } }
    setTasksByBlock(tMap);
    const iMap: Record<string, BlockInfo[]> = {};
    if (infosData) { for (const i of infosData as BlockInfo[]) { if (!iMap[i.block_id]) iMap[i.block_id] = []; iMap[i.block_id].push(i); } }
    setInfosByBlock(iMap);
    setLoading(false);
  }, [pageKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAddBlock = useCallback(async () => {
    if (!blockForm.title.trim()) return;
    setSavingBlock(true);
    const maxPos = blocks.length > 0 ? Math.max(...blocks.map(b => b.position)) + 1 : 0;
    const { data } = await supabase.from('content_blocks').insert({ title: blockForm.title.trim(), utility: blockForm.utility.trim(), position: maxPos, page_key: pageKey }).select().maybeSingle();
    if (data) setBlocks(prev => [...prev, data as ContentBlock]);
    setBlockForm({ title: '', utility: '' });
    setShowAddBlock(false);
    setSavingBlock(false);
  }, [blockForm, blocks, pageKey]);

  const handleDeleteBlock = useCallback(async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    setTasksByBlock(prev => { const n = { ...prev }; delete n[id]; return n; });
    setInfosByBlock(prev => { const n = { ...prev }; delete n[id]; return n; });
    await supabase.from('content_blocks').delete().eq('id', id);
  }, []);

  const handleStartEditBlock = useCallback((block: ContentBlock) => {
    setEditingBlockId(block.id);
    setEditBlockForm({ title: block.title, utility: block.utility });
  }, []);

  const handleSaveEditBlock = useCallback(async () => {
    if (!editingBlockId || !editBlockForm.title.trim()) return;
    const updates = { title: editBlockForm.title.trim(), utility: editBlockForm.utility.trim(), updated_at: new Date().toISOString() };
    setBlocks(prev => prev.map(b => b.id === editingBlockId ? { ...b, ...updates } : b));
    setEditingBlockId(null);
    await supabase.from('content_blocks').update(updates).eq('id', editingBlockId);
  }, [editingBlockId, editBlockForm]);

  const handleAddTask = useCallback(async (blockId: string) => {
    if (!newTaskText.trim()) return;
    const existing = tasksByBlock[blockId] || [];
    const maxPos = existing.length > 0 ? Math.max(...existing.map(t => t.position)) + 1 : 0;
    const { data } = await supabase.from('content_block_tasks').insert({ block_id: blockId, text: newTaskText.trim(), position: maxPos }).select().maybeSingle();
    if (data) setTasksByBlock(prev => ({ ...prev, [blockId]: [...(prev[blockId] || []), data as BlockTask] }));
    setNewTaskText('');
    setAddingTaskBlockId(null);
  }, [newTaskText, tasksByBlock]);

  const handleTaskStatusChange = useCallback(async (blockId: string, taskId: string, newStatus: TaskStatus) => {
    setTasksByBlock(prev => ({ ...prev, [blockId]: (prev[blockId] || []).map(t => t.id === taskId ? { ...t, status: newStatus } : t) }));
    await supabase.from('content_block_tasks').update({ status: newStatus }).eq('id', taskId);
  }, []);

  const handleDeleteTask = useCallback(async (blockId: string, taskId: string) => {
    setTasksByBlock(prev => ({ ...prev, [blockId]: (prev[blockId] || []).filter(t => t.id !== taskId) }));
    await supabase.from('content_block_tasks').delete().eq('id', taskId);
  }, []);

  const handleStartEditTask = useCallback((task: BlockTask) => { setEditingTaskId(task.id); setEditTaskText(task.text); }, []);

  const handleSaveEditTask = useCallback(async (blockId: string) => {
    if (!editingTaskId || !editTaskText.trim()) return;
    setTasksByBlock(prev => ({ ...prev, [blockId]: (prev[blockId] || []).map(t => t.id === editingTaskId ? { ...t, text: editTaskText.trim() } : t) }));
    await supabase.from('content_block_tasks').update({ text: editTaskText.trim() }).eq('id', editingTaskId);
    setEditingTaskId(null); setEditTaskText('');
  }, [editingTaskId, editTaskText]);

  const handleAddInfo = useCallback(async (blockId: string) => {
    if (!newInfoText.trim()) return;
    const existing = infosByBlock[blockId] || [];
    const maxPos = existing.length > 0 ? Math.max(...existing.map(i => i.position)) + 1 : 0;
    const { data } = await supabase.from('content_block_infos').insert({ block_id: blockId, text: newInfoText.trim(), position: maxPos }).select().maybeSingle();
    if (data) setInfosByBlock(prev => ({ ...prev, [blockId]: [...(prev[blockId] || []), data as BlockInfo] }));
    setNewInfoText(''); setAddingInfoBlockId(null);
  }, [newInfoText, infosByBlock]);

  const handleDeleteInfo = useCallback(async (blockId: string, infoId: string) => {
    setInfosByBlock(prev => ({ ...prev, [blockId]: (prev[blockId] || []).filter(i => i.id !== infoId) }));
    await supabase.from('content_block_infos').delete().eq('id', infoId);
  }, []);

  const handleStartEditInfo = useCallback((info: BlockInfo) => { setEditingInfoId(info.id); setEditInfoText(info.text); }, []);

  const handleSaveEditInfo = useCallback(async (blockId: string) => {
    if (!editingInfoId || !editInfoText.trim()) return;
    setInfosByBlock(prev => ({ ...prev, [blockId]: (prev[blockId] || []).map(i => i.id === editingInfoId ? { ...i, text: editInfoText.trim() } : i) }));
    await supabase.from('content_block_infos').update({ text: editInfoText.trim() }).eq('id', editingInfoId);
    setEditingInfoId(null); setEditInfoText('');
  }, [editingInfoId, editInfoText]);

  const toggleCollapse = useCallback((blockId: string) => { setCollapsedBlocks(prev => ({ ...prev, [blockId]: !prev[blockId] })); }, []);

  const handleDragStart = useCallback((index: number) => { setDragIndex(index); }, []);
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIndex(index); }, []);
  const handleDrop = useCallback(async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); setDragOverIndex(null); return; }
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(targetIndex, 0, moved);
    const updated = newBlocks.map((b, i) => ({ ...b, position: i }));
    setBlocks(updated);
    setDragIndex(null); setDragOverIndex(null);
    await Promise.all(updated.map((b, i) => supabase.from('content_blocks').update({ position: i }).eq('id', b.id)));
  }, [dragIndex, blocks]);
  const handleDragEnd = useCallback(() => { setDragIndex(null); setDragOverIndex(null); }, []);

  const globalStats = useMemo(() => {
    const allTasks = Object.values(tasksByBlock).flat();
    const total = allTasks.length;
    const done = allTasks.filter(t => t.status === 'done').length;
    const remaining = total - done;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, remaining, percent };
  }, [tasksByBlock]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: tokens.accent.border }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0 overflow-y-auto pr-1">
      {globalStats.total > 0 && (
        <ContentBlocksStatsBar blockCount={blocks.length} stats={globalStats} tokens={tokens} />
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: tokens.text.quaternary }}>{blocks.length} contenu{blocks.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          {blocks.length >= 2 && (
            <button
              onClick={() => { setReorderMode(prev => !prev); setShowAddBlock(false); setEditingBlockId(null); setAddingTaskBlockId(null); setAddingInfoBlockId(null); setDragIndex(null); setDragOverIndex(null); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
              style={reorderMode ? { background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' } : { background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.quaternary }}
              onMouseEnter={e => { if (!reorderMode) { e.currentTarget.style.background = tokens.surface.hover; e.currentTarget.style.borderColor = tokens.surface.border; e.currentTarget.style.color = tokens.text.tertiary; } }}
              onMouseLeave={e => { if (!reorderMode) { e.currentTarget.style.background = tokens.surface.tertiary; e.currentTarget.style.borderColor = tokens.surface.borderLight; e.currentTarget.style.color = tokens.text.quaternary; } }}
            >
              <GripVertical className="w-3.5 h-3.5" />{reorderMode ? 'Terminer' : 'Reorganiser'}
            </button>
          )}
          {!showAddBlock && !reorderMode && (
            <button onClick={() => setShowAddBlock(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }} onMouseEnter={e => { e.currentTarget.style.background = tokens.accent.bgHover; }} onMouseLeave={e => { e.currentTarget.style.background = tokens.accent.bg; }}>
              <Plus className="w-3.5 h-3.5" />Ajouter un contenu
            </button>
          )}
        </div>
      </div>

      {showAddBlock && (
        <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: tokens.card.bg, border: `1px solid ${tokens.accent.border}` }}>
          <input type="text" value={blockForm.title} onChange={e => setBlockForm(prev => ({ ...prev, title: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && blockForm.title.trim()) handleAddBlock(); if (e.key === 'Escape') { setShowAddBlock(false); setBlockForm({ title: '', utility: '' }); } }} placeholder="Titre du contenu *" className="w-full bg-transparent text-sm font-medium outline-none px-3 py-2.5 rounded-lg" style={{ border: `1px solid ${tokens.input.border}`, color: tokens.input.text, caretColor: tokens.accent.solid }} autoFocus />
          <input type="text" value={blockForm.utility} onChange={e => setBlockForm(prev => ({ ...prev, utility: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && blockForm.title.trim()) handleAddBlock(); if (e.key === 'Escape') { setShowAddBlock(false); setBlockForm({ title: '', utility: '' }); } }} placeholder="Utilite (optionnel)" className="w-full bg-transparent text-sm outline-none px-3 py-2.5 rounded-lg" style={{ border: `1px solid ${tokens.surface.borderLight}`, color: tokens.text.secondary, caretColor: tokens.accent.solid }} />
          <div className="flex items-center gap-2 justify-end pt-1">
            <button onClick={() => { setShowAddBlock(false); setBlockForm({ title: '', utility: '' }); }} className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ color: tokens.text.quaternary }} onMouseEnter={e => { e.currentTarget.style.color = tokens.text.secondary; }} onMouseLeave={e => { e.currentTarget.style.color = tokens.text.quaternary; }}>Annuler</button>
            <button onClick={handleAddBlock} disabled={!blockForm.title.trim() || savingBlock} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}>
              {savingBlock ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Valider
            </button>
          </div>
        </div>
      )}

      {blocks.length === 0 && !showAddBlock && (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl py-14" style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}>
          <p className="text-sm font-medium" style={{ color: tokens.text.tertiary }}>Aucun contenu</p>
          <p className="text-xs mt-1.5" style={{ color: tokens.text.quaternary }}>Cliquez sur "Ajouter un contenu" pour commencer</p>
        </div>
      )}

      {blocks.map((block, blockIndex) => (
        <ContentBlockItem
          key={block.id}
          block={block}
          blockIndex={blockIndex}
          tasks={tasksByBlock[block.id] || []}
          infos={infosByBlock[block.id] || []}
          collapsed={collapsedBlocks[block.id] || reorderMode}
          reorderMode={reorderMode}
          isDragging={dragIndex === blockIndex}
          isDragOver={dragOverIndex === blockIndex && dragIndex !== blockIndex}
          editingBlockId={editingBlockId}
          editBlockForm={editBlockForm}
          addingTaskBlockId={addingTaskBlockId}
          newTaskText={newTaskText}
          addingInfoBlockId={addingInfoBlockId}
          newInfoText={newInfoText}
          editingTaskId={editingTaskId}
          editTaskText={editTaskText}
          editingInfoId={editingInfoId}
          editInfoText={editInfoText}
          tokens={tokens}
          onToggleCollapse={toggleCollapse}
          onStartEditBlock={handleStartEditBlock}
          onSaveEditBlock={handleSaveEditBlock}
          onCancelEditBlock={() => setEditingBlockId(null)}
          onSetEditBlockForm={setEditBlockForm}
          onDeleteBlock={handleDeleteBlock}
          onStartAddTask={setAddingTaskBlockId}
          onSetNewTaskText={setNewTaskText}
          onAddTask={handleAddTask}
          onCancelAddTask={() => setAddingTaskBlockId(null)}
          onTaskStatusChange={handleTaskStatusChange}
          onDeleteTask={handleDeleteTask}
          onStartEditTask={handleStartEditTask}
          onSaveEditTask={handleSaveEditTask}
          onCancelEditTask={() => { setEditingTaskId(null); setEditTaskText(''); }}
          onSetEditTaskText={setEditTaskText}
          onStartAddInfo={setAddingInfoBlockId}
          onSetNewInfoText={setNewInfoText}
          onAddInfo={handleAddInfo}
          onCancelAddInfo={() => setAddingInfoBlockId(null)}
          onDeleteInfo={handleDeleteInfo}
          onStartEditInfo={handleStartEditInfo}
          onSaveEditInfo={handleSaveEditInfo}
          onCancelEditInfo={() => { setEditingInfoId(null); setEditInfoText(''); }}
          onSetEditInfoText={setEditInfoText}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}
